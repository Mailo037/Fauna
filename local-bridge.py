#!/usr/bin/env python3
"""
Small localhost bridge for Fauna.

The browser app cannot access arbitrary local files or execute terminal commands
without a local helper. This server is intentionally dependency-free, binds to
127.0.0.1 by default, requires a token, and keeps all file access inside --root.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import ipaddress
import json
import os
import queue
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, urlencode, urljoin, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


VERSION = "1.0.2"
DEFAULT_PORT = 8765
MAX_BODY_BYTES = 128_000
MAX_WRITE_BODY_BYTES = 5_000_000
MAX_OPENAI_BODY_BYTES = 32_000_000
MAX_OPENAI_RESPONSE_BYTES = 32_000_000
OPENAI_PROXY_TIMEOUT_SECONDS = 180
MAX_LOCAL_AI_BODY_BYTES = 32_000_000
MAX_LOCAL_AI_RESPONSE_BYTES = 32_000_000
LOCAL_AI_PROXY_TIMEOUT_SECONDS = 180
MAX_MCP_BODY_BYTES = 1_000_000
MAX_MCP_RESULT_BYTES = 8_000_000
MCP_REQUEST_TIMEOUT_SECONDS = 45
MCP_PROTOCOL_VERSION = "2025-11-25"
MAX_API_CALL_BODY_BYTES = 8_000_000
MAX_API_CALL_RESPONSE_BYTES = 8_000_000
API_CALL_TIMEOUT_SECONDS = 90
OPENAI_API_BASE_URL = "https://api.openai.com/v1"
BRIDGE_TOKEN_HEADER = "X-Fauna-Bridge-Token"
LEGACY_BRIDGE_TOKEN_HEADER = "X-" + "Flo" + "ra-Bridge-Token"
ALLOWED_OPENAI_PATHS = {
    "/audio/speech",
    "/audio/transcriptions",
    "/files",
    "/images/edits",
    "/images/generations",
    "/models",
    "/realtime/calls",
    "/responses",
}
OPENAI_FILE_PATH_RE = re.compile(r"^/files/[A-Za-z0-9_.-]+$")
MAX_TEXT_BYTES = 160_000
MAX_EXEC_SECONDS = 60
WEB_FETCH_MAX_BYTES = 160_000
WEB_FETCH_TIMEOUT_SECONDS = 20
WEB_FETCH_MAX_REDIRECTS = 5
WEB_FETCH_USER_AGENT = f"Fauna-Bridge/{VERSION} (+local user-requested fetch)"
HTTP_REDIRECT_CODES = {301, 302, 303, 307, 308}
CROSS_ORIGIN_SAFE_HEADERS = {"accept", "content-type", "user-agent"}
NETWORK_READ_CHUNK_BYTES = 64_000
MAX_GIT_BRANCHES = 240
BRIDGE_REQUEST_QUEUE_SIZE = 96
BRIDGE_SLOT_WAIT_SECONDS = 5.0
MAX_ACTIVE_BRIDGE_REQUESTS = 32
MAX_CONCURRENT_EXEC_COMMANDS = 4
MAX_CONCURRENT_FILE_MUTATIONS = 4
MAX_CONCURRENT_NETWORK_REQUESTS = 8
MAX_CONCURRENT_MCP_REQUESTS = 4
SKIPPED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".cache",
    ".fauna-checkpoints",
    ".pytest_cache",
    "__pycache__",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "venv",
}
CHECKPOINT_DIR_NAME = ".fauna-checkpoints"
CHECKPOINT_ID_RE = re.compile(r"^cp_[0-9]{13}_[a-f0-9]{8}$")
CHECKPOINT_SKIPPED_DIRS = SKIPPED_DIRS | {
    ".next",
    ".turbo",
    "coverage",
    "out",
}
MAX_CHECKPOINTS_PER_SCOPE = 30
MAX_CHECKPOINT_FILES = 2500
MAX_CHECKPOINT_TOTAL_BYTES = 80_000_000
MAX_CHECKPOINT_FILE_BYTES = 8_000_000
DANGEROUS_COMMAND_PATTERNS = [
    r"\bshutdown\b",
    r"\breboot\b",
    r"\bdiskpart\b",
    r"\bformat\b",
    r"\bbcdedit\b",
    r"\breg\s+(?:delete|add)\b",
    r"\brm\s+-[^\n]*r[^\n]*f\s+(?:/|~|\*|[A-Za-z]:\\)",
    r"\bdel\s+/[^\n]*[sqf][^\n]*(?:[A-Za-z]:\\|\\Windows\\|\\Users\\)",
    r"\bRemove-Item\b[^\n]*(?:-Recurse|-r)\b[^\n]*(?:[A-Za-z]:\\|/|~|\\Windows\\|\\Users\\)",
]


class NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req: Request, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        return None


WEB_FETCH_OPENER = build_opener(NoRedirectHandler)


def http_url_origin(url: str) -> tuple[str, str, int | None]:
    parsed = urlparse(url)
    default_port = 443 if parsed.scheme.lower() == "https" else 80 if parsed.scheme.lower() == "http" else None
    return parsed.scheme.lower(), (parsed.hostname or "").lower(), parsed.port or default_port


def strip_cross_origin_headers(headers: dict[str, str]) -> dict[str, str]:
    return {
        key: value
        for key, value in headers.items()
        if key.lower() in CROSS_ORIGIN_SAFE_HEADERS
    }


def remaining_http_deadline(deadline: float) -> float:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("HTTP request deadline exceeded")
    return max(0.001, remaining)


def redirected_request(request: Request, target_url: str, status: int) -> Request:
    method = request.get_method().upper()
    data = request.data
    headers = dict(request.header_items())
    origin_changed = http_url_origin(request.full_url) != http_url_origin(target_url)
    if origin_changed:
        headers = strip_cross_origin_headers(headers)

    if (status == 303 and method != "HEAD") or (status in {301, 302} and method == "POST"):
        method = "GET"
        data = None
        headers = {
            key: value
            for key, value in headers.items()
            if key.lower() not in {"content-length", "content-type"}
        }
    elif data is None:
        blocked_headers = {"content-length"}
        if origin_changed:
            blocked_headers.add("content-type")
        headers = {
            key: value
            for key, value in headers.items()
            if key.lower() not in blocked_headers
        }

    return Request(target_url, headers=headers, data=data, method=method)


def open_validated_http_request(
    request: Request,
    validate_url: Callable[[Any], str],
    timeout_seconds: float,
    *,
    max_redirects: int = WEB_FETCH_MAX_REDIRECTS,
    deadline: float | None = None,
    opener: Any = None,
) -> tuple[Any, float]:
    request_deadline = deadline if deadline is not None else time.monotonic() + timeout_seconds
    active_opener = opener or WEB_FETCH_OPENER
    current_request = Request(
        validate_url(request.full_url),
        headers=dict(request.header_items()),
        data=request.data,
        method=request.get_method(),
    )

    for redirect_index in range(max_redirects + 1):
        was_http_error = False
        try:
            response = active_opener.open(
                current_request,
                timeout=remaining_http_deadline(request_deadline),
            )
        except HTTPError as exc:
            response = exc
            was_http_error = True

        status = int(getattr(response, "status", getattr(response, "code", 0)) or 0)
        if status in HTTP_REDIRECT_CODES:
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise ValueError("Redirect response did not include a Location header")
            if redirect_index >= max_redirects:
                raise PermissionError("Too many HTTP redirects")
            target_url = validate_url(urljoin(current_request.full_url, location))
            current_request = redirected_request(current_request, target_url, status)
            continue

        if was_http_error:
            raise response
        return response, request_deadline

    raise PermissionError("Too many HTTP redirects")


def read_limited_http_body(response: Any, max_bytes: int, deadline: float) -> tuple[bytes, bool]:
    body = bytearray()
    reader = getattr(response, "read1", None) or response.read
    while len(body) <= max_bytes:
        remaining_http_deadline(deadline)
        chunk = reader(min(NETWORK_READ_CHUNK_BYTES, max_bytes + 1 - len(body)))
        if not chunk:
            break
        body.extend(chunk)
    truncated = len(body) > max_bytes
    return bytes(body[:max_bytes]), truncated


class BridgeBusyError(RuntimeError):
    def __init__(self, lane: str, limit: int) -> None:
        super().__init__(f"Bridge is busy handling {lane} actions; try again in a moment")
        self.lane = lane
        self.limit = limit
        self.retry_after_ms = max(250, int(BRIDGE_SLOT_WAIT_SECONDS * 1000))


class ConcurrencyLane:
    def __init__(self, name: str, limit: int) -> None:
        self.name = name
        self.limit = max(1, limit)
        self._semaphore = threading.BoundedSemaphore(self.limit)
        self._lock = threading.Lock()
        self._active = 0
        self._peak = 0

    def acquire(self, timeout_seconds: float = BRIDGE_SLOT_WAIT_SECONDS) -> "ConcurrencyLaneLease":
        return ConcurrencyLaneLease(self, timeout_seconds)

    def _enter(self, timeout_seconds: float) -> None:
        if not self._semaphore.acquire(timeout=max(0, timeout_seconds)):
            raise BridgeBusyError(self.name, self.limit)
        with self._lock:
            self._active += 1
            self._peak = max(self._peak, self._active)

    def _exit(self) -> None:
        with self._lock:
            self._active = max(0, self._active - 1)
        self._semaphore.release()

    def snapshot(self) -> dict[str, int]:
        with self._lock:
            return {
                "active": self._active,
                "limit": self.limit,
                "peak": self._peak,
            }


class ConcurrencyLaneLease:
    def __init__(self, lane: ConcurrencyLane, timeout_seconds: float) -> None:
        self.lane = lane
        self.timeout_seconds = timeout_seconds
        self.acquired = False

    def __enter__(self) -> "ConcurrencyLaneLease":
        self.lane._enter(self.timeout_seconds)
        self.acquired = True
        return self

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        if self.acquired:
            self.lane._exit()
            self.acquired = False


class BridgeRuntime:
    def __init__(self) -> None:
        self.request_lane = ConcurrencyLane("requests", MAX_ACTIVE_BRIDGE_REQUESTS)
        self.exec_lane = ConcurrencyLane("terminal", MAX_CONCURRENT_EXEC_COMMANDS)
        self.file_lane = ConcurrencyLane("file", MAX_CONCURRENT_FILE_MUTATIONS)
        self.network_lane = ConcurrencyLane("network", MAX_CONCURRENT_NETWORK_REQUESTS)
        self.mcp_lane = ConcurrencyLane("mcp", MAX_CONCURRENT_MCP_REQUESTS)
        self._path_locks: dict[str, threading.RLock] = {}
        self._path_locks_lock = threading.Lock()

    def path_lock(self, path: Path) -> threading.RLock:
        try:
            key_path = str(path.resolve())
        except OSError:
            key_path = str(path.absolute())
        key = key_path.lower() if os.name == "nt" else key_path
        with self._path_locks_lock:
            lock = self._path_locks.get(key)
            if lock is None:
                lock = threading.RLock()
                self._path_locks[key] = lock
            return lock

    def snapshot(self) -> dict[str, Any]:
        return {
            "requestQueueSize": BRIDGE_REQUEST_QUEUE_SIZE,
            "lanes": {
                "requests": self.request_lane.snapshot(),
                "terminal": self.exec_lane.snapshot(),
                "file": self.file_lane.snapshot(),
                "network": self.network_lane.snapshot(),
                "mcp": self.mcp_lane.snapshot(),
            },
        }


class FaunaThreadingHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    block_on_close = False
    request_queue_size = BRIDGE_REQUEST_QUEUE_SIZE
    allow_reuse_address = True


class BridgeConfig:
    def __init__(
        self,
        root: Path,
        token: str,
        shell: str,
        allow_dangerous: bool,
        access_policy: str,
        projects: dict[str, Path] | None = None,
        runtime: BridgeRuntime | None = None,
    ) -> None:
        self.root = root.resolve()
        self.token = token
        self.shell = shell
        self.allow_dangerous = allow_dangerous
        self.access_policy = access_policy
        self.projects = projects or {}
        self.runtime = runtime or BridgeRuntime()


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    set_cors_headers(handler)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def set_cors_headers(handler: BaseHTTPRequestHandler) -> None:
    origin = handler.headers.get("Origin", "")
    if origin == "fauna-app://app" or re.match(r"^https?://(?:127\.0\.0\.1|localhost):\d+$", origin):
        handler.send_header("Access-Control-Allow-Origin", origin)
        handler.send_header("Vary", "Origin")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    allowed_headers = f"Content-Type, {BRIDGE_TOKEN_HEADER}, {LEGACY_BRIDGE_TOKEN_HEADER}, Authorization"
    handler.send_header("Access-Control-Allow-Headers", allowed_headers)
    handler.send_header("Access-Control-Max-Age", "600")


def clamp_int(value: Any, default: int, lower: int, upper: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(lower, min(upper, parsed))


def relative_path(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix() or "."


def resolve_under_root(root: Path, requested: str | None) -> Path:
    clean = (requested or ".").strip().replace("\\", os.sep)
    if not clean or clean == ".":
        candidate = root
    else:
        candidate = (root / clean).resolve()

    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise ValueError("Path is outside the workspace root") from exc
    return candidate


def resolve_scope_root(config: BridgeConfig, scope: str | None, create_scope: bool = False) -> Path:
    clean_scope = (scope or "").strip()
    if not clean_scope:
        return config.root

    if clean_scope.startswith("project:"):
        project_id = clean_scope.removeprefix("project:").strip()
        if not re.fullmatch(r"[A-Za-z0-9_.-]{1,160}", project_id or ""):
            raise ValueError("Invalid project scope")
        project_root = config.projects.get(project_id)
        if not project_root:
            raise ValueError("Project scope is not registered with this bridge")
        if not project_root.exists() or not project_root.is_dir():
            raise FileNotFoundError("Project folder does not exist")
        return project_root

    scoped_root = resolve_under_root(config.root, clean_scope)
    if create_scope:
        scoped_root.mkdir(parents=True, exist_ok=True)
    return scoped_root


def resolve_bridge_path(config: BridgeConfig, requested: str | None, scope: str | None = None, create_scope: bool = False) -> Path:
    clean = (requested or ".").strip().replace("\\", os.sep)
    scoped_root = resolve_scope_root(config, scope, create_scope)

    if config.access_policy == "machine" and not scope:
        expanded = Path(os.path.expanduser(clean or "."))
        return expanded.resolve() if expanded.is_absolute() else (config.root / expanded).resolve()

    candidate = scoped_root if not clean or clean == "." else (scoped_root / clean).resolve()
    try:
        candidate.relative_to(scoped_root)
    except ValueError as exc:
        raise ValueError("Path is outside the allowed workspace scope") from exc
    return candidate


def response_path(config: BridgeConfig, target: Path, scope: str | None = None) -> str:
    if scope:
        return relative_path(target, resolve_bridge_path(config, ".", scope))
    if config.access_policy == "machine":
        return str(target)
    return relative_path(target, config.root)


def response_root(config: BridgeConfig, scope: str | None = None) -> Path:
    return resolve_bridge_path(config, ".", scope) if scope else config.root


def get_git_root_for_path(path: Path) -> Path | None:
    git = shutil.which("git")
    if not git:
        return None
    try:
        completed = subprocess.run(
            [git, "-C", str(path), "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if completed.returncode != 0:
        return None
    root = completed.stdout.strip()
    if not root:
        return None
    try:
        return Path(root).resolve()
    except OSError:
        return None


def mark_git_ignored_entries(base: Path, entry_paths: list[tuple[dict[str, Any], Path, bool]]) -> None:
    git = shutil.which("git")
    git_root = get_git_root_for_path(base)
    if not git or not git_root or not entry_paths:
        return

    rel_paths: list[str] = []
    rel_to_item: dict[str, dict[str, Any]] = {}
    for item, path, is_dir in entry_paths:
        try:
            rel_path = path.resolve().relative_to(git_root).as_posix()
        except (OSError, ValueError):
            continue
        if not rel_path:
            continue
        check_path = f"{rel_path}/" if is_dir else rel_path
        rel_paths.append(check_path)
        rel_to_item[rel_path.rstrip("/")] = item
        rel_to_item[check_path.rstrip("/")] = item

    if not rel_paths:
        return

    try:
        completed = subprocess.run(
            [git, "-C", str(git_root), "check-ignore", "-z", "--stdin"],
            input=("\0".join(rel_paths) + "\0").encode("utf-8"),
            capture_output=True,
            timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired):
        return

    if completed.returncode not in {0, 1}:
        return

    for raw_ignored_path in completed.stdout.split(b"\0"):
        if not raw_ignored_path:
            continue
        ignored_path = raw_ignored_path.decode("utf-8", "replace").strip().rstrip("/")
        item = rel_to_item.get(ignored_path)
        if item is not None:
            item["ignored"] = True


def list_tree(config: BridgeConfig, requested: str, depth: int, limit: int, scope: str | None = None) -> dict[str, Any]:
    base = resolve_bridge_path(config, requested, scope, create_scope=bool(scope))
    if not base.exists():
        raise FileNotFoundError("Path does not exist")
    if not base.is_dir():
        raise NotADirectoryError("Path is not a directory")

    entries: list[dict[str, Any]] = []
    entry_paths: list[tuple[dict[str, Any], Path, bool]] = []
    truncated = False

    def walk(current: Path, current_depth: int) -> None:
        nonlocal truncated
        if len(entries) >= limit:
            truncated = True
            return

        try:
            children = sorted(current.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))
        except OSError:
            return

        for child in children:
            if len(entries) >= limit:
                truncated = True
                return
            if child.name in SKIPPED_DIRS:
                continue
            try:
                resolved_child = child.resolve()
                if config.access_policy != "machine" or scope:
                    resolved_child.relative_to(response_root(config, scope))
            except (OSError, ValueError):
                continue

            is_dir = child.is_dir()
            item: dict[str, Any] = {
                "path": response_path(config, resolved_child, scope),
                "name": child.name,
                "type": "directory" if is_dir else "file",
            }
            if not is_dir:
                try:
                    item["size"] = child.stat().st_size
                except OSError:
                    item["size"] = None
            entries.append(item)
            entry_paths.append((item, resolved_child, is_dir))

            if is_dir and current_depth < depth:
                walk(resolved_child, current_depth + 1)

    walk(base, 0)
    mark_git_ignored_entries(base, entry_paths)
    return {
        "root": str(response_root(config, scope)),
        "path": response_path(config, base, scope),
        "depth": depth,
        "entries": entries,
        "truncated": truncated,
    }


def read_text_file(config: BridgeConfig, requested: str, max_bytes: int, scope: str | None = None) -> dict[str, Any]:
    target = resolve_bridge_path(config, requested, scope)
    if not target.exists():
        raise FileNotFoundError("File does not exist")
    if not target.is_file():
        raise IsADirectoryError("Path is not a file")

    max_bytes = clamp_int(max_bytes, 1, 1, MAX_TEXT_BYTES)
    with target.open("rb") as handle:
        raw = handle.read(max_bytes + 1)
    truncated = len(raw) > max_bytes
    raw = raw[:max_bytes]
    text = raw.decode("utf-8", errors="replace")
    return {
        "path": response_path(config, target, scope),
        "size": target.stat().st_size,
        "truncated": truncated,
        "content": text,
    }


def write_text_file(config: BridgeConfig, payload: dict[str, Any], append: bool = False) -> dict[str, Any]:
    requested = str(payload.get("path") or "").strip()
    if not requested:
        raise ValueError("File path is required")
    target = resolve_bridge_path(config, requested, payload.get("scope"), create_scope=True)
    with config.runtime.file_lane.acquire(), config.runtime.path_lock(target):
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and target.is_dir():
            raise IsADirectoryError("Path is a directory")
        content = str(payload.get("content") or payload.get("text") or "")
        with target.open("a" if append else "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
    return {
        "path": response_path(config, target, payload.get("scope")),
        "size": target.stat().st_size,
        "appended": append,
    }


def make_directory(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    requested = str(payload.get("path") or "").strip()
    if not requested:
        raise ValueError("Directory path is required")
    target = resolve_bridge_path(config, requested, payload.get("scope"), create_scope=True)
    with config.runtime.file_lane.acquire(), config.runtime.path_lock(target):
        target.mkdir(parents=True, exist_ok=True)
    return {
        "path": response_path(config, target, payload.get("scope")),
        "created": True,
    }


def path_is_inside(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
    except (OSError, ValueError):
        return False
    return True


def checkpoint_store_root(config: BridgeConfig) -> Path:
    return (config.root / CHECKPOINT_DIR_NAME).resolve()


def checkpoint_scope_key(config: BridgeConfig, scope: str | None) -> str:
    target_root = resolve_bridge_path(config, ".", scope)
    raw = f"{scope or ''}|{target_root.resolve()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def checkpoint_scope_store(config: BridgeConfig, scope: str | None) -> Path:
    store_root = checkpoint_store_root(config)
    store = (store_root / checkpoint_scope_key(config, scope)).resolve()
    try:
        store.relative_to(store_root)
    except ValueError as exc:
        raise ValueError("Invalid checkpoint scope") from exc
    return store


def validate_checkpoint_id(value: Any) -> str:
    checkpoint_id = str(value or "").strip()
    if not CHECKPOINT_ID_RE.fullmatch(checkpoint_id):
        raise ValueError("Invalid checkpoint id")
    return checkpoint_id


def checkpoint_manifest_path(config: BridgeConfig, scope: str | None, checkpoint_id: str) -> Path:
    return checkpoint_scope_store(config, scope) / validate_checkpoint_id(checkpoint_id) / "manifest.json"


def checkpoint_files_root(config: BridgeConfig, scope: str | None, checkpoint_id: str) -> Path:
    return checkpoint_manifest_path(config, scope, checkpoint_id).parent / "files"


def compact_checkpoint_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in manifest.items()
        if key not in {"files", "skippedPaths"}
    }


def read_checkpoint_manifest(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def list_checkpoint_manifests(config: BridgeConfig, scope: str | None) -> list[dict[str, Any]]:
    store = checkpoint_scope_store(config, scope)
    if not store.exists():
        return []
    manifests: list[dict[str, Any]] = []
    for manifest_path in store.glob("*/manifest.json"):
        manifest = read_checkpoint_manifest(manifest_path)
        if manifest:
            manifests.append(manifest)
    return sorted(manifests, key=lambda item: str(item.get("createdAt") or ""), reverse=True)


def prune_old_checkpoints(config: BridgeConfig, scope: str | None) -> None:
    store = checkpoint_scope_store(config, scope)
    manifests = list_checkpoint_manifests(config, scope)
    for manifest in manifests[MAX_CHECKPOINTS_PER_SCOPE:]:
        checkpoint_id = str(manifest.get("id") or "")
        if not CHECKPOINT_ID_RE.fullmatch(checkpoint_id):
            continue
        checkpoint_dir = (store / checkpoint_id).resolve()
        if path_is_inside(checkpoint_dir, store):
            shutil.rmtree(checkpoint_dir, ignore_errors=True)


def should_skip_checkpoint_dir(path: Path, store_root: Path) -> bool:
    if path.name in CHECKPOINT_SKIPPED_DIRS:
        return True
    if path_is_inside(path, store_root):
        return True
    try:
        return path.is_symlink()
    except OSError:
        return True


def iter_checkpoint_files(target_root: Path, store_root: Path) -> list[tuple[Path, str, int]]:
    files: list[tuple[Path, str, int]] = []
    if not target_root.exists():
        return files

    for current, dirs, filenames in os.walk(target_root):
        current_path = Path(current)
        dirs[:] = [
            dirname
            for dirname in dirs
            if not should_skip_checkpoint_dir(current_path / dirname, store_root)
        ]
        for filename in sorted(filenames):
            source = current_path / filename
            try:
                resolved = source.resolve()
                if source.is_symlink() or not source.is_file():
                    continue
                if path_is_inside(resolved, store_root):
                    continue
                rel_path = resolved.relative_to(target_root).as_posix()
                size = resolved.stat().st_size
            except (OSError, ValueError):
                continue
            files.append((resolved, rel_path, size))
    return files


def write_checkpoint_manifest(path: Path, manifest: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def create_workspace_checkpoint(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    scope = payload.get("scope") or None
    target_root = resolve_bridge_path(config, ".", scope, create_scope=bool(scope))
    target_root.mkdir(parents=True, exist_ok=True)
    store_root = checkpoint_store_root(config)
    checkpoint_id = f"cp_{int(time.time() * 1000)}_{secrets.token_hex(4)}"
    files_root = checkpoint_files_root(config, scope, checkpoint_id)
    manifest_path = checkpoint_manifest_path(config, scope, checkpoint_id)

    label = str(payload.get("label") or "").strip()[:120] or "Prompt checkpoint"
    prompt = str(payload.get("prompt") or "").strip()
    file_entries: list[dict[str, Any]] = []
    total_bytes = 0
    skipped_files = 0
    skipped_bytes = 0
    skipped_paths: list[str] = []
    truncated = False

    for source, rel_path, size in iter_checkpoint_files(target_root, store_root):
        if size > MAX_CHECKPOINT_FILE_BYTES:
            skipped_files += 1
            skipped_bytes += size
            skipped_paths.append(rel_path)
            continue
        if len(file_entries) >= MAX_CHECKPOINT_FILES or total_bytes + size > MAX_CHECKPOINT_TOTAL_BYTES:
            skipped_files += 1
            skipped_bytes += size
            skipped_paths.append(rel_path)
            truncated = True
            continue
        destination = files_root / rel_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        file_entries.append({
            "path": rel_path,
            "size": size,
            "mtime": source.stat().st_mtime,
        })
        total_bytes += size

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    manifest = {
        "id": checkpoint_id,
        "label": label,
        "prompt": prompt[:500],
        "createdAt": now,
        "scope": scope or "",
        "root": str(target_root),
        "fileCount": len(file_entries),
        "totalBytes": total_bytes,
        "skippedFiles": skipped_files,
        "skippedBytes": skipped_bytes,
        "skippedPaths": skipped_paths,
        "truncated": truncated,
        "files": file_entries,
    }
    write_checkpoint_manifest(manifest_path, manifest)
    prune_old_checkpoints(config, scope)
    return compact_checkpoint_manifest(manifest)


def list_workspace_checkpoints(config: BridgeConfig, scope: str | None) -> dict[str, Any]:
    target_root = resolve_bridge_path(config, ".", scope)
    return {
        "root": str(target_root),
        "scope": scope or "",
        "checkpoints": [compact_checkpoint_manifest(item) for item in list_checkpoint_manifests(config, scope)],
        "maxCheckpoints": MAX_CHECKPOINTS_PER_SCOPE,
    }


def remove_empty_checkpoint_dirs(target_root: Path, store_root: Path) -> int:
    removed = 0
    for current, dirs, _filenames in os.walk(target_root, topdown=False):
        current_path = Path(current)
        if current_path == target_root:
            continue
        if should_skip_checkpoint_dir(current_path, store_root):
            continue
        try:
            current_path.rmdir()
            removed += 1
        except OSError:
            continue
    return removed


def restore_workspace_checkpoint(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    scope = payload.get("scope") or None
    checkpoint_id = validate_checkpoint_id(payload.get("id"))
    target_root = resolve_bridge_path(config, ".", scope, create_scope=bool(scope))
    manifest = read_checkpoint_manifest(checkpoint_manifest_path(config, scope, checkpoint_id))
    if not manifest:
        raise FileNotFoundError("Checkpoint does not exist")
    files_root = checkpoint_files_root(config, scope, checkpoint_id)
    if not files_root.exists():
        raise FileNotFoundError("Checkpoint files are missing")

    store_root = checkpoint_store_root(config)
    snapshot_files = {
        str(entry.get("path") or "")
        for entry in manifest.get("files", [])
        if entry.get("path")
    }
    protected_files = {
        str(path or "")
        for path in manifest.get("skippedPaths", [])
        if path
    }
    restored_files = 0
    for rel_path in sorted(snapshot_files):
        source = (files_root / rel_path).resolve()
        destination = (target_root / rel_path).resolve()
        if not path_is_inside(source, files_root) or not path_is_inside(destination, target_root):
            continue
        if not source.exists() or not source.is_file():
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        restored_files += 1

    deleted_files = 0
    delete_extra = payload.get("deleteExtra") is not False
    if delete_extra:
        for current_file, rel_path, _size in iter_checkpoint_files(target_root, store_root):
            if rel_path in snapshot_files or rel_path in protected_files:
                continue
            try:
                current_file.unlink()
                deleted_files += 1
            except OSError:
                continue
        remove_empty_checkpoint_dirs(target_root, store_root)

    return {
        "id": checkpoint_id,
        "label": manifest.get("label") or "Checkpoint",
        "createdAt": manifest.get("createdAt") or "",
        "root": str(target_root),
        "scope": scope or "",
        "restoredFiles": restored_files,
        "deletedFiles": deleted_files,
    }


def delete_workspace_checkpoint(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    scope = payload.get("scope") or None
    checkpoint_id = validate_checkpoint_id(payload.get("id"))
    store = checkpoint_scope_store(config, scope)
    checkpoint_dir = (store / checkpoint_id).resolve()
    if not path_is_inside(checkpoint_dir, store):
        raise ValueError("Invalid checkpoint path")
    if not checkpoint_dir.exists():
        raise FileNotFoundError("Checkpoint does not exist")
    shutil.rmtree(checkpoint_dir)
    return {"id": checkpoint_id, "deleted": True}


def handle_checkpoint_action(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    action = str(payload.get("action") or "create").strip().lower()
    scope = payload.get("scope") or None
    with config.runtime.file_lane.acquire(), config.runtime.path_lock(checkpoint_scope_store(config, scope)):
        if action == "create":
            return create_workspace_checkpoint(config, payload)
        if action == "restore":
            return restore_workspace_checkpoint(config, payload)
        if action == "delete":
            return delete_workspace_checkpoint(config, payload)
    raise ValueError("Unknown checkpoint action")


def public_ip_allowed(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return ip.is_global and not ip.is_multicast


def local_ai_ip_allowed(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return ip.is_private or ip.is_loopback or ip.is_link_local


def validate_local_ai_url(raw_url: Any) -> str:
    url = str(raw_url or "").strip()
    if not url:
        raise ValueError("Local AI URL is required")

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise PermissionError("Local AI endpoints must use http or https")
    if parsed.username or parsed.password:
        raise PermissionError("Local AI URLs with embedded credentials are not allowed")

    host = parsed.hostname
    if not host:
        raise ValueError("Local AI URL must include a hostname")

    try:
        addresses = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve Local AI host: {host}") from exc

    if not addresses:
        raise PermissionError("Local AI host did not resolve to an address")
    for address in addresses:
        ip_text = address[4][0]
        if not local_ai_ip_allowed(ip_text):
            raise PermissionError("Local AI endpoints must resolve to localhost, private, or link-local addresses")

    return parsed._replace(fragment="").geturl()


def validate_public_http_url(raw_url: Any) -> str:
    url = str(raw_url or "").strip()
    if not url:
        raise ValueError("URL is required")

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise PermissionError("Only http and https URLs can be inspected")
    if parsed.username or parsed.password:
        raise PermissionError("URLs with embedded credentials are not allowed")

    host = parsed.hostname
    if not host:
        raise ValueError("URL must include a hostname")
    if host.lower() in {"localhost", "localhost.localdomain"} or host.lower().endswith(".localhost"):
        raise PermissionError("Localhost URLs are not allowed for web inspection")

    try:
        addresses = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve URL host: {host}") from exc

    if not addresses:
        raise PermissionError("URL host did not resolve to an address")
    for address in addresses:
        ip_text = address[4][0]
        if not public_ip_allowed(ip_text):
            raise PermissionError("Private, local, reserved, and link-local network addresses are not allowed")

    return parsed._replace(fragment="").geturl()


def read_limited_web_body(response: Any, max_bytes: int) -> tuple[bytes, bool]:
    body = response.read(max_bytes + 1)
    truncated = len(body) > max_bytes
    return body[:max_bytes], truncated


def decode_web_body(body: bytes, content_type: str) -> str:
    charset_match = re.search(r"charset=([\w.-]+)", content_type, re.IGNORECASE)
    charset = charset_match.group(1) if charset_match else "utf-8"
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def normalize_web_text(text: str) -> str:
    return "\n".join(
        line.strip()
        for line in re.sub(r"[ \t]+", " ", text.replace("\xa0", " ")).splitlines()
        if line.strip()
    ).strip()


def html_to_readable_text(raw_html: str) -> tuple[str, str]:
    title_match = re.search(r"(?is)<title[^>]*>(.*?)</title>", raw_html)
    title = normalize_web_text(html.unescape(re.sub(r"(?is)<[^>]+>", " ", title_match.group(1)))) if title_match else ""

    text = re.sub(r"(?is)<!--.*?-->", " ", raw_html)
    text = re.sub(r"(?is)<(script|style|noscript|svg|canvas|iframe)[^>]*>.*?</\1>", " ", text)
    text = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", text)
    text = re.sub(r"(?i)</\s*(p|div|section|article|header|main|li|h[1-6]|tr|td|th)\s*>", "\n", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = html.unescape(text)
    return title, normalize_web_text(text)


def readable_web_content(raw_text: str, content_type: str) -> tuple[str, str]:
    if "html" in content_type.lower() or re.search(r"(?is)^\s*<!doctype html|^\s*<html[\s>]", raw_text):
        return html_to_readable_text(raw_text)
    return "", normalize_web_text(raw_text)


def fetch_public_url(payload: dict[str, Any]) -> dict[str, Any]:
    original_url = str(payload.get("url") or "").strip()
    current_url = validate_public_http_url(original_url)
    max_bytes = clamp_int(payload.get("maxBytes"), WEB_FETCH_MAX_BYTES, 1, WEB_FETCH_MAX_BYTES)

    for _redirect_index in range(WEB_FETCH_MAX_REDIRECTS + 1):
        request = Request(
            current_url,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
                "User-Agent": WEB_FETCH_USER_AGENT,
            },
            method="GET",
        )
        try:
            response = WEB_FETCH_OPENER.open(request, timeout=WEB_FETCH_TIMEOUT_SECONDS)
        except HTTPError as exc:
            if 300 <= exc.code < 400:
                location = exc.headers.get("Location")
                if not location:
                    raise ValueError("Redirect response did not include a Location header") from exc
                current_url = validate_public_http_url(urljoin(current_url, location))
                continue
            response = exc
        except URLError as exc:
            raise ValueError(f"URL fetch failed: {exc.reason}") from exc

        with response:
            body, truncated = read_limited_web_body(response, max_bytes)
            content_type = response.headers.get("Content-Type", "")
            raw_text = decode_web_body(body, content_type)
            title, content = readable_web_content(raw_text, content_type)
            return {
                "url": original_url,
                "finalUrl": response.geturl() or current_url,
                "status": int(getattr(response, "status", getattr(response, "code", 0)) or 0),
                "contentType": content_type,
                "title": title,
                "content": content,
                "truncated": truncated,
            }

    raise PermissionError("Too many redirects while inspecting URL")


def connector_ip_allowed(address: str, allow_local: bool) -> bool:
    ip = ipaddress.ip_address(address)
    if public_ip_allowed(address):
        return True
    return allow_local and (ip.is_private or ip.is_loopback or ip.is_link_local)


def validate_connector_http_url(raw_url: Any, allow_local: bool = False) -> str:
    url = str(raw_url or "").strip()
    if not url:
        raise ValueError("Connector URL is required")

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise PermissionError("Connector URLs must use http or https")
    if parsed.username or parsed.password:
        raise PermissionError("Connector URLs with embedded credentials are not allowed")

    host = parsed.hostname
    if not host:
        raise ValueError("Connector URL must include a hostname")

    try:
        addresses = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve connector host: {host}") from exc

    if not addresses:
        raise PermissionError("Connector host did not resolve to an address")
    for address in addresses:
        ip_text = address[4][0]
        if not connector_ip_allowed(ip_text, allow_local):
            if allow_local:
                raise PermissionError("Connector host resolved to a reserved or unsupported address")
            raise PermissionError("Private, local, reserved, and link-local network addresses are not allowed")

    return parsed._replace(fragment="").geturl()


def sanitize_connector_headers(headers: Any) -> dict[str, str]:
    if not isinstance(headers, dict):
        return {}
    blocked = {
        "host",
        "content-length",
        "connection",
        "transfer-encoding",
        "upgrade",
        "proxy-authorization",
        "proxy-authenticate",
    }
    sanitized: dict[str, str] = {}
    for key, value in headers.items():
        name = str(key or "").strip()
        if not name or name.lower() in blocked or "\n" in name or "\r" in name:
            continue
        if value is None:
            continue
        sanitized[name] = str(value)
    return sanitized


def build_connector_url(base_url: str, requested_path: Any, query: Any = None, allow_local: bool = False) -> str:
    base = validate_connector_http_url(base_url, allow_local=allow_local).rstrip("/")
    path = str(requested_path or "/").strip()
    if re.match(r"^https?://", path, re.IGNORECASE):
        raise PermissionError("Connector paths must be relative to the configured base URL")
    path = "/" + path.lstrip("/")
    url = f"{base}{path}"
    if isinstance(query, dict) and query:
        pairs: list[tuple[str, str]] = []
        for key, value in query.items():
            if value is None:
                continue
            if isinstance(value, list):
                pairs.extend((str(key), str(item)) for item in value)
            else:
                pairs.append((str(key), str(value)))
        if pairs:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}{urlencode(pairs)}"
    return validate_connector_http_url(url, allow_local=allow_local)


def encode_api_request_body(body: Any, headers: dict[str, str]) -> bytes | None:
    if body is None:
        return None
    has_content_type = any(key.lower() == "content-type" for key in headers)
    if isinstance(body, str):
        if not has_content_type:
            headers["Content-Type"] = "text/plain; charset=utf-8"
        return body.encode("utf-8")
    if not has_content_type:
        headers["Content-Type"] = "application/json"
    return json.dumps(body, ensure_ascii=False).encode("utf-8")


def execute_api_call(payload: dict[str, Any]) -> dict[str, Any]:
    connector = payload.get("connector")
    if not isinstance(connector, dict):
        raise ValueError("API connector is required")
    method = str(payload.get("method") or connector.get("method") or "GET").strip().upper()
    if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
        raise PermissionError("Unsupported API method")
    allow_local = bool(connector.get("allowLocalNetwork"))
    url = build_connector_url(connector.get("baseUrl") or connector.get("url"), payload.get("path") or connector.get("path") or "/", payload.get("query"), allow_local)
    headers = {
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": WEB_FETCH_USER_AGENT,
        **sanitize_connector_headers(connector.get("headers")),
        **sanitize_connector_headers(payload.get("headers")),
    }
    data = None if method in {"GET", "DELETE"} else encode_api_request_body(payload.get("body"), headers)
    request = Request(url, headers=headers, data=data, method=method)
    deadline = time.monotonic() + API_CALL_TIMEOUT_SECONDS
    try:
        response, deadline = open_validated_http_request(
            request,
            lambda value: validate_connector_http_url(value, allow_local=allow_local),
            API_CALL_TIMEOUT_SECONDS,
            deadline=deadline,
        )
    except HTTPError as exc:
        response = exc
    except URLError as exc:
        raise ValueError(f"API call failed: {exc.reason}") from exc

    with response:
        body, truncated = read_limited_http_body(response, MAX_API_CALL_RESPONSE_BYTES, deadline)
        content_type = response.headers.get("Content-Type", "")
        text_body = decode_web_body(body, content_type)
        return {
            "ok": True,
            "url": response.geturl() or url,
            "status": int(getattr(response, "status", getattr(response, "code", 0)) or 0),
            "contentType": content_type,
            "headers": {
                key: value
                for key, value in response.headers.items()
                if key.lower() in {"content-type", "x-request-id", "etag", "last-modified"}
            },
            "body": text_body,
            "truncated": truncated,
        }


def normalize_mcp_server_payload(payload: dict[str, Any]) -> dict[str, Any]:
    server = payload.get("server")
    if not isinstance(server, dict):
        raise ValueError("MCP server is required")
    transport = str(server.get("transport") or ("streamable_http" if server.get("url") else "stdio")).strip().lower().replace("-", "_")
    if transport in {"http", "streamable"}:
        transport = "streamable_http"
    elif transport in {"sse", "http_sse"}:
        transport = "legacy_sse"
    elif transport != "stdio":
        transport = "stdio"
    return {
        "name": str(server.get("name") or "mcp-server").strip() or "mcp-server",
        "transport": transport,
        "command": str(server.get("command") or "").strip(),
        "args": [str(item) for item in server.get("args") or [] if str(item).strip()],
        "url": str(server.get("url") or "").strip(),
        "cwd": str(server.get("cwd") or ".").strip() or ".",
        "env": server.get("env") if isinstance(server.get("env"), dict) else {},
        "headers": sanitize_connector_headers(server.get("headers")),
    }


def json_rpc_payload(method: str, params: dict[str, Any] | None = None, request_id: int | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"jsonrpc": "2.0", "method": method}
    if request_id is not None:
        payload["id"] = request_id
    if params is not None:
        payload["params"] = params
    return payload


def parse_sse_json_response(raw_text: str, request_id: int | None = None) -> dict[str, Any]:
    for event in re.split(r"\r?\n\r?\n", raw_text):
        data_lines = [
            line[5:].strip()
            for line in event.splitlines()
            if line.startswith("data:")
        ]
        if not data_lines:
            continue
        parsed = json.loads("\n".join(data_lines))
        if request_id is None or parsed.get("id") == request_id:
            return parsed
    raise ValueError("SSE response did not include a matching JSON-RPC message")


def http_json_rpc_request(url: str, headers: dict[str, str], payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
        "User-Agent": WEB_FETCH_USER_AGENT,
        **headers,
    }
    request = Request(url, headers=request_headers, data=body, method="POST")
    deadline = time.monotonic() + MCP_REQUEST_TIMEOUT_SECONDS
    try:
        response, deadline = open_validated_http_request(
            request,
            lambda value: validate_connector_http_url(value, allow_local=True),
            MCP_REQUEST_TIMEOUT_SECONDS,
            deadline=deadline,
        )
    except HTTPError as exc:
        response = exc
    except URLError as exc:
        raise ValueError(f"MCP HTTP request failed: {exc.reason}") from exc

    with response:
        status = int(getattr(response, "status", getattr(response, "code", 0)) or 0)
        raw_body, truncated = read_limited_http_body(response, MAX_MCP_RESULT_BYTES, deadline)
        if status < 200 or status >= 300:
            detail = decode_web_body(raw_body, response.headers.get("Content-Type", ""))
            raise ValueError(f"MCP HTTP request failed with {status}: {detail[:400]}")
        if truncated:
            raise ValueError("MCP response exceeded the bridge response limit")
        text = decode_web_body(raw_body, response.headers.get("Content-Type", ""))
        if "text/event-stream" in response.headers.get("Content-Type", "").lower():
            parsed = parse_sse_json_response(text, payload.get("id"))
        else:
            parsed = json.loads(text or "{}")
        if isinstance(parsed, list):
            parsed = next((item for item in parsed if item.get("id") == payload.get("id")), parsed[0] if parsed else {})
        if parsed.get("error"):
            raise ValueError(f"MCP error: {parsed['error']}")
        response_headers = {key.lower(): value for key, value in response.headers.items()}
        return parsed, response_headers


def read_legacy_sse_endpoint(url: str, headers: dict[str, str]) -> tuple[str, dict[str, str]]:
    source_url = validate_connector_http_url(url, allow_local=True)
    request = Request(
        source_url,
        headers={
            "Accept": "text/event-stream",
            "User-Agent": WEB_FETCH_USER_AGENT,
            **headers,
        },
        method="GET",
    )
    deadline = time.monotonic() + MCP_REQUEST_TIMEOUT_SECONDS
    try:
        response, deadline = open_validated_http_request(
            request,
            lambda value: validate_connector_http_url(value, allow_local=True),
            MCP_REQUEST_TIMEOUT_SECONDS,
            deadline=deadline,
        )
        with response:
            response_url = response.geturl() or source_url
            response_body, truncated = read_limited_http_body(response, 64_000, deadline)
    except URLError as exc:
        raise ValueError(f"Legacy MCP SSE endpoint discovery failed: {exc.reason}") from exc
    if truncated:
        raise ValueError("Legacy MCP SSE discovery response exceeded the bridge response limit")
    raw = response_body.decode("utf-8", errors="replace")
    for event in re.split(r"\r?\n\r?\n", raw):
        endpoint_lines = [
            line[5:].strip()
            for line in event.splitlines()
            if line.startswith("data:")
        ]
        event_name = next((line[6:].strip() for line in event.splitlines() if line.startswith("event:")), "")
        if event_name == "endpoint" and endpoint_lines:
            endpoint_url = validate_connector_http_url(urljoin(response_url, endpoint_lines[0]), allow_local=True)
            endpoint_headers = headers
            if http_url_origin(source_url) != http_url_origin(endpoint_url):
                endpoint_headers = strip_cross_origin_headers(headers)
            return endpoint_url, endpoint_headers
    raise ValueError("Legacy MCP server did not advertise a POST endpoint")


def run_mcp_http(server: dict[str, Any], method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = validate_connector_http_url(server.get("url"), allow_local=True)
    headers = server.get("headers") or {}
    if server.get("transport") == "legacy_sse":
        url, headers = read_legacy_sse_endpoint(url, headers)

    init_id = int(time.time() * 1000)
    initialized_id = init_id + 1
    request_id = init_id + 2
    init_result, init_headers = http_json_rpc_request(url, headers, json_rpc_payload("initialize", {
        "protocolVersion": MCP_PROTOCOL_VERSION,
        "capabilities": {},
        "clientInfo": {"name": "Fauna", "version": VERSION},
    }, init_id))
    session_id = init_headers.get("mcp-session-id")
    session_headers = {**headers}
    if session_id:
        session_headers["Mcp-Session-Id"] = session_id
    try:
        http_json_rpc_request(url, session_headers, json_rpc_payload("notifications/initialized", {}, None))
    except Exception:
        pass
    result, _headers = http_json_rpc_request(url, session_headers, json_rpc_payload(method, params or {}, request_id))
    return {
        "serverInfo": init_result.get("result", {}).get("serverInfo") or {},
        "instructions": init_result.get("result", {}).get("instructions") or "",
        "result": result.get("result") or {},
    }


def resolve_mcp_cwd(config: BridgeConfig, server: dict[str, Any], scope: str | None = None) -> Path:
    requested = server.get("cwd") or "."
    return resolve_bridge_path(config, requested, scope)


def start_mcp_stdio_process(config: BridgeConfig, server: dict[str, Any], scope: str | None = None) -> subprocess.Popen[str]:
    command = server.get("command")
    if not command:
        raise ValueError("stdio MCP server command is required")
    executable = shutil.which(command) or command
    args = [str(item) for item in server.get("args") or []]
    env = os.environ.copy()
    for key, value in (server.get("env") or {}).items():
        clean_key = str(key or "").strip()
        if clean_key:
            env[clean_key] = str(value)
    return subprocess.Popen(
        [executable, *args],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        cwd=str(resolve_mcp_cwd(config, server, scope)),
        env=env,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=False,
    )


def read_mcp_stdio_line(proc: subprocess.Popen[str], timeout_seconds: float) -> str:
    if not proc.stdout:
        raise ValueError("MCP process stdout is unavailable")
    result_queue: queue.Queue[str] = queue.Queue(maxsize=1)

    def reader() -> None:
        try:
            result_queue.put(proc.stdout.readline())
        except Exception:
            result_queue.put("")

    threading.Thread(target=reader, daemon=True).start()
    try:
        return result_queue.get(timeout=timeout_seconds)
    except queue.Empty as exc:
        raise TimeoutError("Timed out waiting for MCP stdio response") from exc


def mcp_stdio_request(proc: subprocess.Popen[str], method: str, params: dict[str, Any] | None = None, request_id: int | None = None) -> dict[str, Any]:
    if not proc.stdin:
        raise ValueError("MCP process stdin is unavailable")
    payload = json_rpc_payload(method, params or {}, request_id)
    proc.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
    proc.stdin.flush()
    if request_id is None:
        return {}
    deadline = time.monotonic() + MCP_REQUEST_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            raise ValueError(f"MCP process exited with code {proc.returncode}")
        line = read_mcp_stdio_line(proc, max(0.1, deadline - time.monotonic()))
        if not line:
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if parsed.get("id") != request_id:
            continue
        if parsed.get("error"):
            raise ValueError(f"MCP error: {parsed['error']}")
        return parsed
    raise TimeoutError("Timed out waiting for MCP stdio response")


def stop_mcp_process(proc: subprocess.Popen[str]) -> None:
    if proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()


def run_mcp_stdio(config: BridgeConfig, server: dict[str, Any], method: str, params: dict[str, Any] | None = None, scope: str | None = None) -> dict[str, Any]:
    proc = start_mcp_stdio_process(config, server, scope)
    try:
        request_id = int(time.time() * 1000)
        init_result = mcp_stdio_request(proc, "initialize", {
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {"name": "Fauna", "version": VERSION},
        }, request_id)
        mcp_stdio_request(proc, "notifications/initialized", {}, None)
        result = mcp_stdio_request(proc, method, params or {}, request_id + 1)
        return {
            "serverInfo": init_result.get("result", {}).get("serverInfo") or {},
            "instructions": init_result.get("result", {}).get("instructions") or "",
            "result": result.get("result") or {},
        }
    finally:
        stop_mcp_process(proc)


def discover_mcp_server(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    server = normalize_mcp_server_payload(payload)
    scope = str(payload.get("scope") or "").strip() or None
    if server["transport"] == "stdio":
        result = run_mcp_stdio(config, server, "tools/list", {}, scope)
    else:
        result = run_mcp_http(server, "tools/list", {})
    tool_result = result.get("result") or {}
    return {
        "ok": True,
        "serverInfo": result.get("serverInfo") or {},
        "instructions": result.get("instructions") or "",
        "tools": tool_result.get("tools") if isinstance(tool_result, dict) else [],
    }


def call_mcp_tool(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    server = normalize_mcp_server_payload(payload)
    tool_name = str(payload.get("tool") or payload.get("toolName") or "").strip()
    if not tool_name:
        raise ValueError("MCP tool name is required")
    arguments = payload.get("arguments") if isinstance(payload.get("arguments"), dict) else {}
    scope = str(payload.get("scope") or "").strip() or None
    params = {"name": tool_name, "arguments": arguments}
    if server["transport"] == "stdio":
        result = run_mcp_stdio(config, server, "tools/call", params, scope)
    else:
        result = run_mcp_http(server, "tools/call", params)
    return {"ok": True, "result": result.get("result") or {}}


def command_is_blocked(command: str) -> str | None:
    normalized = command.strip()
    if not normalized:
        return "Command is empty"
    if len(normalized) > 4000:
        return "Command is too long"
    for pattern in DANGEROUS_COMMAND_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return "Command matched a blocked safety pattern"
    return None


def shell_command_args(command: str, shell_name: str) -> tuple[list[str] | str, bool]:
    normalized_shell = shell_name.lower()
    if normalized_shell == "powershell":
        executable = shutil.which("pwsh") or shutil.which("powershell")
        if executable:
            return [executable, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], False
    if normalized_shell == "cmd":
        executable = shutil.which("cmd")
        if executable:
            return [executable, "/d", "/s", "/c", command], False
    return command, True


def run_command(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    command = str(payload.get("command") or "").strip()
    cwd = resolve_bridge_path(config, str(payload.get("cwd") or "."), payload.get("scope"), create_scope=bool(payload.get("scope")))
    timeout = clamp_int(payload.get("timeout"), 20, 1, MAX_EXEC_SECONDS)

    if not cwd.exists() or not cwd.is_dir():
        raise NotADirectoryError("Command cwd is not a directory")

    blocked_reason = None if config.allow_dangerous else command_is_blocked(command)
    if blocked_reason:
        raise PermissionError(blocked_reason)

    args, use_shell = shell_command_args(command, config.shell)
    started = time.monotonic()
    try:
        with config.runtime.exec_lane.acquire():
            completed = subprocess.run(
                args,
                cwd=str(cwd),
                shell=use_shell,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
            )
        duration_ms = int((time.monotonic() - started) * 1000)
        stdout = completed.stdout[-MAX_TEXT_BYTES:]
        stderr = completed.stderr[-MAX_TEXT_BYTES:]
        return {
            "command": command,
            "cwd": response_path(config, cwd, payload.get("scope")),
            "exitCode": completed.returncode,
            "durationMs": duration_ms,
            "stdout": stdout,
            "stderr": stderr,
            "truncated": len(completed.stdout) > MAX_TEXT_BYTES or len(completed.stderr) > MAX_TEXT_BYTES,
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "command": command,
            "cwd": response_path(config, cwd, payload.get("scope")),
            "exitCode": None,
            "durationMs": int((time.monotonic() - started) * 1000),
            "stdout": (exc.stdout or "")[-MAX_TEXT_BYTES:] if isinstance(exc.stdout, str) else "",
            "stderr": (exc.stderr or "")[-MAX_TEXT_BYTES:] if isinstance(exc.stderr, str) else "",
            "timedOut": True,
            "truncated": False,
        }


def run_git_command(
    config: BridgeConfig,
    args: list[str],
    scope: str | None = None,
    requested: str | None = ".",
    timeout: int = 10,
) -> subprocess.CompletedProcess[str]:
    cwd = resolve_bridge_path(config, requested or ".", scope, create_scope=bool(scope))
    if not cwd.exists() or not cwd.is_dir():
        raise NotADirectoryError("Git cwd is not a directory")
    with config.runtime.exec_lane.acquire():
        return subprocess.run(
            ["git", *args],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=max(1, min(MAX_EXEC_SECONDS, timeout)),
        )


def get_git_output(
    config: BridgeConfig,
    args: list[str],
    scope: str | None = None,
    requested: str | None = ".",
    timeout: int = 10,
    required: bool = True,
) -> str:
    result = run_git_command(config, args, scope, requested, timeout)
    if result.returncode != 0:
        if not required:
            return ""
        detail = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(detail or f"git {' '.join(args)} failed")
    return (result.stdout or "").strip()


def parse_git_branch_rows(output: str, kind: str, current_branch: str) -> list[dict[str, Any]]:
    branches: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw_line in output.splitlines():
        parts = raw_line.split("\t")
        name = parts[0].strip() if parts else ""
        if not name or name in seen or name.endswith("/HEAD") or (kind == "remote" and "/" not in name):
            continue
        seen.add(name)
        marker = parts[1].strip() if len(parts) > 1 else ""
        upstream = parts[2].strip() if len(parts) > 2 else ""
        branches.append({
            "name": name,
            "type": kind,
            "current": marker == "*" or (kind == "local" and name == current_branch),
            "upstream": upstream,
        })
    return branches


def should_fallback_unregistered_git_scope(scope: str | None, requested: str | None, exc: Exception) -> bool:
    clean_requested = str(requested or "").strip()
    return bool(
        scope
        and scope.startswith("project:")
        and clean_requested
        and clean_requested != "."
        and "Project scope is not registered with this bridge" in str(exc)
    )


def get_git_branch_counts(config: BridgeConfig, upstream: str, scope: str | None = None, requested: str | None = ".") -> tuple[int, int]:
    if not upstream:
        return 0, 0
    output = get_git_output(config, ["rev-list", "--left-right", "--count", f"{upstream}...HEAD"], scope, requested, 10, required=False)
    match = re.match(r"^\s*(\d+)\s+(\d+)\s*$", output)
    if not match:
        return 0, 0
    behind = int(match.group(1))
    ahead = int(match.group(2))
    return ahead, behind


def get_git_info(config: BridgeConfig, scope: str | None = None, requested: str | None = ".") -> dict[str, Any]:
    try:
        cwd = resolve_bridge_path(config, requested or ".", scope)
    except ValueError as exc:
        if should_fallback_unregistered_git_scope(scope, requested, exc):
            return get_git_info(config, None, requested)
        raise
    probe = run_git_command(config, ["rev-parse", "--is-inside-work-tree"], scope, requested, 10)
    if probe.returncode != 0 or (probe.stdout or "").strip().lower() != "true":
        return {
            "isRepo": False,
            "path": response_path(config, cwd, scope),
            "branches": [],
            "dirtyCount": 0,
        }

    repo_root = get_git_output(config, ["rev-parse", "--show-toplevel"], scope, requested, 10, required=False)
    branch = get_git_output(config, ["branch", "--show-current"], scope, requested, 10, required=False)
    head = get_git_output(config, ["rev-parse", "--short", "HEAD"], scope, requested, 10, required=False)
    upstream = get_git_output(config, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], scope, requested, 10, required=False)
    status_output = get_git_output(config, ["status", "--porcelain=v1"], scope, requested, 10, required=False)
    dirty_lines = [line for line in status_output.splitlines() if line.strip()]
    local_output = get_git_output(
        config,
        ["for-each-ref", "--format=%(refname:short)\t%(HEAD)\t%(upstream:short)", "refs/heads"],
        scope,
        requested,
        10,
        required=False,
    )
    remote_output = get_git_output(
        config,
        ["for-each-ref", "--format=%(refname:short)\t%(HEAD)\t%(upstream:short)", "refs/remotes"],
        scope,
        requested,
        10,
        required=False,
    )
    branches = [
        *parse_git_branch_rows(local_output, "local", branch),
        *parse_git_branch_rows(remote_output, "remote", branch),
    ][:MAX_GIT_BRANCHES]
    ahead, behind = get_git_branch_counts(config, upstream, scope, requested)
    return {
        "isRepo": True,
        "path": response_path(config, cwd, scope),
        "repoRoot": repo_root,
        "branch": branch,
        "detached": not bool(branch),
        "head": head,
        "upstream": upstream,
        "ahead": ahead,
        "behind": behind,
        "dirtyCount": len(dirty_lines),
        "branches": branches,
    }


def validate_git_branch_value(branch: str) -> str:
    clean = str(branch or "").strip()
    if not clean:
        raise ValueError("Branch name is required")
    if len(clean) > 240 or clean.startswith("-") or re.search(r"[\r\n\t\0]", clean):
        raise ValueError("Branch name is not valid")
    return clean


def checkout_git_branch(config: BridgeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    scope = payload.get("scope") or None
    requested = str(payload.get("path") or ".")
    branch = validate_git_branch_value(str(payload.get("branch") or ""))
    create = bool(payload.get("create"))
    remote = bool(payload.get("remote"))

    try:
        if create:
            check = run_git_command(config, ["check-ref-format", "--branch", branch], scope, requested, 10)
            if check.returncode != 0:
                detail = (check.stderr or check.stdout or "").strip()
                raise ValueError(detail or "Branch name is not valid")
            command = ["checkout", "-b", branch]
        elif remote:
            command = ["checkout", "--track", branch]
        else:
            command = ["checkout", branch]

        result = run_git_command(config, command, scope, requested, 60)
    except ValueError as exc:
        if should_fallback_unregistered_git_scope(scope, requested, exc):
            fallback_payload = {**payload}
            fallback_payload.pop("scope", None)
            return checkout_git_branch(config, fallback_payload)
        raise
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(detail or "Could not check out branch")

    return get_git_info(config, scope, requested)


def clean_header_value(value: Any, max_length: int = 300) -> str:
    return str(value or "").replace("\r", "").replace("\n", "")[:max_length]


def safe_multipart_token(value: Any, fallback: str) -> str:
    text = str(value or fallback).replace("\r", "").replace("\n", "").replace('"', "")
    return text or fallback


def normalize_openai_path(value: Any) -> str:
    path = str(value or "").strip()
    if not path.startswith("/") or "://" in path or "\\" in path:
        raise ValueError("Invalid OpenAI path")
    route = path.split("?", 1)[0]
    if route not in ALLOWED_OPENAI_PATHS and not OPENAI_FILE_PATH_RE.match(route):
        raise PermissionError("OpenAI endpoint is not allowed by this bridge")
    return path


def validate_openai_http_url(raw_url: Any) -> str:
    url = validate_public_http_url(raw_url)
    parsed = urlparse(url)
    base = urlparse(OPENAI_API_BASE_URL)
    if http_url_origin(url) != http_url_origin(OPENAI_API_BASE_URL):
        return url

    base_path = base.path.rstrip("/")
    if not base_path or not parsed.path.startswith(f"{base_path}/"):
        raise PermissionError("OpenAI redirect left the allowed API path")
    request_path = parsed.path[len(base_path):]
    if parsed.query:
        request_path = f"{request_path}?{parsed.query}"
    normalize_openai_path(request_path)
    return url


def openai_passthrough_headers(payload_headers: Any, api_key: str) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": f"Fauna-Bridge/{VERSION}",
    }
    if isinstance(payload_headers, dict):
        accept = payload_headers.get("Accept") or payload_headers.get("accept")
        if accept:
            headers["Accept"] = clean_header_value(accept)
    return headers


def encode_multipart_fields(fields: Any) -> tuple[bytes, str]:
    if not isinstance(fields, list):
        raise ValueError("Multipart OpenAI body must include a fields list")

    boundary = f"----FaunaBridge{secrets.token_hex(16)}"
    chunks: list[bytes] = []
    for field in fields:
        if not isinstance(field, dict):
            continue
        name = safe_multipart_token(field.get("name"), "")
        if not name:
            continue

        chunks.append(f"--{boundary}\r\n".encode("utf-8"))
        if "dataBase64" in field:
            filename = safe_multipart_token(field.get("fileName"), "upload.bin")
            mime_type = clean_header_value(field.get("mimeType") or "application/octet-stream")
            chunks.append(
                (
                    f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                    f"Content-Type: {mime_type}\r\n\r\n"
                ).encode("utf-8")
            )
            chunks.append(base64.b64decode(str(field.get("dataBase64") or ""), validate=True))
            chunks.append(b"\r\n")
        else:
            chunks.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
            chunks.append(str(field.get("value") or "").encode("utf-8"))
            chunks.append(b"\r\n")

    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(chunks), boundary


def build_openai_request_body(body_payload: Any) -> tuple[bytes | None, dict[str, str]]:
    if body_payload in (None, ""):
        return None, {}
    if not isinstance(body_payload, dict):
        return str(body_payload).encode("utf-8"), {"Content-Type": "text/plain; charset=utf-8"}

    kind = str(body_payload.get("kind") or "text").lower()
    if kind == "json":
        return (
            json.dumps(body_payload.get("value") or {}, ensure_ascii=False).encode("utf-8"),
            {"Content-Type": "application/json"},
        )
    if kind == "text":
        content_type = clean_header_value(body_payload.get("contentType") or "text/plain; charset=utf-8")
        return str(body_payload.get("value") or "").encode("utf-8"), {"Content-Type": content_type}
    if kind == "base64":
        content_type = clean_header_value(body_payload.get("contentType") or "application/octet-stream")
        return base64.b64decode(str(body_payload.get("dataBase64") or ""), validate=True), {"Content-Type": content_type}
    if kind == "multipart":
        body, boundary = encode_multipart_fields(body_payload.get("fields"))
        return body, {"Content-Type": f"multipart/form-data; boundary={boundary}"}

    raise ValueError("Unsupported OpenAI body type")


def build_openai_proxy_request(payload: dict[str, Any]) -> Request:
    api_key = str(payload.get("apiKey") or "").strip()
    if not api_key:
        raise PermissionError("OpenAI API key is missing")

    method = str(payload.get("method") or "POST").upper()
    if method not in {"DELETE", "GET", "POST"}:
        raise PermissionError("OpenAI bridge supports DELETE, GET, and POST only")

    path = normalize_openai_path(payload.get("path"))
    body, body_headers = build_openai_request_body(payload.get("body"))
    if method in {"DELETE", "GET"}:
        body = None
        body_headers = {}

    headers = openai_passthrough_headers(payload.get("headers"), api_key)
    headers.update(body_headers)
    return Request(f"{OPENAI_API_BASE_URL}{path}", data=body, headers=headers, method=method)


def proxy_openai_request(payload: dict[str, Any]) -> dict[str, Any]:
    request = build_openai_proxy_request(payload)
    deadline = time.monotonic() + OPENAI_PROXY_TIMEOUT_SECONDS

    try:
        response, deadline = open_validated_http_request(
            request,
            validate_openai_http_url,
            OPENAI_PROXY_TIMEOUT_SECONDS,
            deadline=deadline,
        )
        with response:
            response_body, truncated = read_limited_http_body(response, MAX_OPENAI_RESPONSE_BYTES, deadline)
            response_headers = dict(response.headers.items())
            status = int(response.status)
    except HTTPError as exc:
        with exc:
            response_body, truncated = read_limited_http_body(exc, MAX_OPENAI_RESPONSE_BYTES, deadline)
            response_headers = dict(exc.headers.items())
            status = int(exc.code)
    except URLError as exc:
        return {"ok": False, "error": f"OpenAI request failed: {exc.reason}"}

    return {
        "ok": True,
        "status": status,
        "headers": {
            key: value
            for key, value in response_headers.items()
            if key.lower() in {"content-type", "openai-request-id", "x-request-id"}
        },
        "bodyBase64": base64.b64encode(response_body).decode("ascii"),
        "truncated": truncated,
    }


def send_openai_stream_headers(handler: BaseHTTPRequestHandler, status: int, response_headers: dict[str, str]) -> None:
    handler.send_response(status)
    set_cors_headers(handler)
    for key, value in response_headers.items():
        if key.lower() in {"content-type", "openai-request-id", "x-request-id"}:
            handler.send_header(key, value)
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Accel-Buffering", "no")
    handler.end_headers()


def stream_openai_request(payload: dict[str, Any], handler: BaseHTTPRequestHandler) -> None:
    request = build_openai_proxy_request(payload)
    deadline = time.monotonic() + OPENAI_PROXY_TIMEOUT_SECONDS

    try:
        response, deadline = open_validated_http_request(
            request,
            validate_openai_http_url,
            OPENAI_PROXY_TIMEOUT_SECONDS,
            deadline=deadline,
        )
    except HTTPError as exc:
        with exc:
            response_body, _truncated = read_limited_http_body(exc, MAX_OPENAI_RESPONSE_BYTES, deadline)
            response_headers = dict(exc.headers.items())
            status = int(exc.code)
        handler.send_response(status)
        set_cors_headers(handler)
        for key, value in response_headers.items():
            if key.lower() in {"content-type", "openai-request-id", "x-request-id"}:
                handler.send_header(key, value)
        handler.send_header("Content-Length", str(len(response_body)))
        handler.send_header("Cache-Control", "no-store")
        handler.end_headers()
        handler.wfile.write(response_body)
        return
    except URLError as exc:
        json_response(handler, 502, {"ok": False, "error": f"OpenAI request failed: {exc.reason}"})
        return

    with response:
        send_openai_stream_headers(handler, int(response.status), dict(response.headers.items()))
        bytes_sent = 0
        reader = getattr(response, "read1", None) or response.read
        while True:
            try:
                remaining_http_deadline(deadline)
                chunk = reader(min(8192, MAX_OPENAI_RESPONSE_BYTES + 1 - bytes_sent))
            except (TimeoutError, socket.timeout):
                break
            if not chunk:
                break
            if bytes_sent + len(chunk) > MAX_OPENAI_RESPONSE_BYTES:
                break
            try:
                handler.wfile.write(chunk)
                handler.wfile.flush()
                bytes_sent += len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break


def local_ai_passthrough_headers(payload_headers: Any) -> dict[str, str]:
    headers = {"User-Agent": f"Fauna-Bridge/{VERSION}"}
    if isinstance(payload_headers, dict):
        accept = payload_headers.get("Accept") or payload_headers.get("accept")
        if accept:
            headers["Accept"] = clean_header_value(accept)
    return headers


def build_local_ai_proxy_request(payload: dict[str, Any]) -> Request:
    method = str(payload.get("method") or "POST").upper()
    if method not in {"GET", "POST"}:
        raise PermissionError("Local AI bridge supports GET and POST only")

    url = validate_local_ai_url(payload.get("url"))
    body, body_headers = build_openai_request_body(payload.get("body"))
    if method == "GET":
        body = None
        body_headers = {}

    headers = local_ai_passthrough_headers(payload.get("headers"))
    headers.update(body_headers)
    return Request(url, data=body, headers=headers, method=method)


def proxy_local_ai_request(payload: dict[str, Any]) -> dict[str, Any]:
    request = build_local_ai_proxy_request(payload)
    deadline = time.monotonic() + LOCAL_AI_PROXY_TIMEOUT_SECONDS

    try:
        response, deadline = open_validated_http_request(
            request,
            validate_local_ai_url,
            LOCAL_AI_PROXY_TIMEOUT_SECONDS,
            deadline=deadline,
        )
        with response:
            response_body, truncated = read_limited_http_body(response, MAX_LOCAL_AI_RESPONSE_BYTES, deadline)
            response_headers = dict(response.headers.items())
            status = int(response.status)
    except HTTPError as exc:
        with exc:
            response_body, truncated = read_limited_http_body(exc, MAX_LOCAL_AI_RESPONSE_BYTES, deadline)
            response_headers = dict(exc.headers.items())
            status = int(exc.code)
    except URLError as exc:
        return {"ok": False, "error": f"Local AI request failed: {exc.reason}"}

    return {
        "ok": True,
        "status": status,
        "headers": {
            key: value
            for key, value in response_headers.items()
            if key.lower() in {"content-type", "x-request-id"}
        },
        "bodyBase64": base64.b64encode(response_body).decode("ascii"),
        "truncated": truncated,
    }


class FaunaBridgeHandler(BaseHTTPRequestHandler):
    config: BridgeConfig

    def log_message(self, format: str, *args: Any) -> None:
        sys.stdout.write("%s - %s\n" % (self.address_string(), format % args))

    def bridge_busy_response(self, exc: BridgeBusyError) -> None:
        json_response(self, 429, {
            "ok": False,
            "busy": True,
            "lane": exc.lane,
            "limit": exc.limit,
            "retryAfterMs": exc.retry_after_ms,
            "error": str(exc),
        })

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        set_cors_headers(self)
        self.end_headers()

    def do_GET(self) -> None:
        try:
            with self.config.runtime.request_lane.acquire(timeout_seconds=0.1):
                self.handle_get()
        except BridgeBusyError as exc:
            self.bridge_busy_response(exc)

    def handle_get(self) -> None:
        if not self.authorized():
            json_response(self, 401, {"ok": False, "error": "Unauthorized bridge token"})
            return

        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        try:
            if parsed.path == "/health":
                json_response(self, 200, {
                    "ok": True,
                    "version": VERSION,
                    "root": str(self.config.root),
                    "shell": self.config.shell,
                    "accessPolicy": self.config.access_policy,
                    "allowDangerous": self.config.allow_dangerous,
                    "projects": len(self.config.projects),
                    "concurrency": self.config.runtime.snapshot(),
                })
            elif parsed.path == "/tree":
                result = list_tree(
                    self.config,
                    query.get("path", ["."])[0],
                    clamp_int(query.get("depth", [2])[0], 2, 0, 5),
                    clamp_int(query.get("limit", [220])[0], 220, 1, 800),
                    query.get("scope", [""])[0] or None,
                )
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/read":
                result = read_text_file(
                    self.config,
                    query.get("path", [""])[0],
                    clamp_int(query.get("maxBytes", [80_000])[0], 80_000, 1, MAX_TEXT_BYTES),
                    query.get("scope", [""])[0] or None,
                )
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/git":
                result = get_git_info(
                    self.config,
                    query.get("scope", [""])[0] or None,
                    query.get("path", ["."])[0],
                )
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/checkpoints":
                result = list_workspace_checkpoints(
                    self.config,
                    query.get("scope", [""])[0] or None,
                )
                json_response(self, 200, {"ok": True, **result})
            else:
                json_response(self, 404, {"ok": False, "error": "Unknown endpoint"})
        except BridgeBusyError as exc:
            self.bridge_busy_response(exc)
        except Exception as exc:  # noqa: BLE001 - local API returns readable errors.
            json_response(self, 400, {"ok": False, "error": str(exc)})

    def do_POST(self) -> None:
        try:
            with self.config.runtime.request_lane.acquire(timeout_seconds=0.1):
                self.handle_post()
        except BridgeBusyError as exc:
            self.bridge_busy_response(exc)

    def handle_post(self) -> None:
        if not self.authorized():
            json_response(self, 401, {"ok": False, "error": "Unauthorized bridge token"})
            return

        parsed = urlparse(self.path)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length < 0:
            json_response(self, 400, {"ok": False, "error": "Content-Length must not be negative"})
            return
        max_body_bytes = MAX_BODY_BYTES
        if parsed.path == "/openai":
            max_body_bytes = MAX_OPENAI_BODY_BYTES
        elif parsed.path == "/local-ai":
            max_body_bytes = MAX_LOCAL_AI_BODY_BYTES
        elif parsed.path in {"/mcp/discover", "/mcp/call"}:
            max_body_bytes = MAX_MCP_BODY_BYTES
        elif parsed.path == "/api-call":
            max_body_bytes = MAX_API_CALL_BODY_BYTES
        elif parsed.path == "/write":
            max_body_bytes = MAX_WRITE_BODY_BYTES
        if length > max_body_bytes:
            json_response(self, 413, {"ok": False, "error": "Request body is too large"})
            return

        try:
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            if parsed.path == "/exec":
                result = run_command(self.config, payload)
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/git":
                result = checkout_git_branch(self.config, payload)
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/write":
                result = write_text_file(self.config, payload, append=bool(payload.get("append")))
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/mkdir":
                result = make_directory(self.config, payload)
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/checkpoints":
                result = handle_checkpoint_action(self.config, payload)
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/openai":
                with self.config.runtime.network_lane.acquire():
                    if payload.get("streamResponse"):
                        stream_openai_request(payload, self)
                    else:
                        result = proxy_openai_request(payload)
                        json_response(self, 200, result)
            elif parsed.path == "/local-ai":
                with self.config.runtime.network_lane.acquire():
                    result = proxy_local_ai_request(payload)
                    json_response(self, 200, result)
            elif parsed.path == "/mcp/discover":
                with self.config.runtime.mcp_lane.acquire():
                    result = discover_mcp_server(self.config, payload)
                    json_response(self, 200, result)
            elif parsed.path == "/mcp/call":
                with self.config.runtime.mcp_lane.acquire():
                    result = call_mcp_tool(self.config, payload)
                    json_response(self, 200, result)
            elif parsed.path == "/api-call":
                with self.config.runtime.network_lane.acquire():
                    result = execute_api_call(payload)
                    json_response(self, 200, result)
            elif parsed.path == "/fetch-url":
                with self.config.runtime.network_lane.acquire():
                    result = fetch_public_url(payload)
                    json_response(self, 200, {"ok": True, **result})
            else:
                json_response(self, 404, {"ok": False, "error": "Unknown endpoint"})
        except BridgeBusyError as exc:
            self.bridge_busy_response(exc)
        except Exception as exc:  # noqa: BLE001 - local API returns readable errors.
            status = 403 if isinstance(exc, PermissionError) else 400
            json_response(self, status, {"ok": False, "error": str(exc)})

    def authorized(self) -> bool:
        token = self.config.token
        if not token:
            return True
        header_token = self.headers.get(BRIDGE_TOKEN_HEADER, "") or self.headers.get(LEGACY_BRIDGE_TOKEN_HEADER, "")
        auth_header = self.headers.get("Authorization", "")
        bearer = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""
        return secrets.compare_digest(header_token, token) or secrets.compare_digest(bearer, token)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Fauna's local workspace bridge.")
    parser.add_argument("--root", default=".", help="Workspace root directory exposed to Fauna.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Keep 127.0.0.1 unless you know why.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to bind.")
    parser.add_argument("--token", default="", help="Bridge token. Generated when omitted.")
    parser.add_argument("--no-print-token", action="store_true", help="Do not print the bridge token at startup.")
    parser.add_argument("--shell", choices=["powershell", "cmd", "system"], default="powershell" if os.name == "nt" else "system")
    parser.add_argument("--access-policy", choices=["workspace", "machine"], default="workspace", help="Path policy. workspace keeps paths under --root; machine also allows absolute local paths.")
    parser.add_argument("--projects-json", default="{}", help="JSON object mapping registered project ids to absolute project roots.")
    parser.add_argument("--allow-dangerous", action="store_true", help="Disable the small built-in command blocklist.")
    return parser.parse_args()


def parse_project_roots(raw_json: str) -> dict[str, Path]:
    try:
        parsed = json.loads(raw_json or "{}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid --projects-json: {exc}") from exc
    if not isinstance(parsed, dict):
        raise SystemExit("--projects-json must be a JSON object")

    projects: dict[str, Path] = {}
    for project_id, project_path in parsed.items():
        clean_id = str(project_id or "").strip()
        if not re.fullmatch(r"[A-Za-z0-9_.-]{1,160}", clean_id):
            continue
        path_value = str(project_path or "").strip()
        if not path_value:
            continue
        resolved = Path(path_value).expanduser().resolve()
        projects[clean_id] = resolved
    return projects


def main() -> None:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Workspace root does not exist or is not a directory: {root}")

    managed_token = os.environ.pop("FAUNA_BRIDGE_TOKEN", "")
    token = args.token or managed_token or secrets.token_urlsafe(24)
    projects = parse_project_roots(args.projects_json)
    FaunaBridgeHandler.config = BridgeConfig(root, token, args.shell, args.allow_dangerous, args.access_policy, projects)
    server = FaunaThreadingHTTPServer((args.host, args.port), FaunaBridgeHandler)

    print("Fauna local workspace bridge")
    print(f"URL: http://{args.host}:{args.port}")
    print(f"Root: {root}")
    print(f"Access policy: {args.access_policy}")
    print(f"Registered projects: {len(projects)}")
    print(f"Command blocklist: {'off' if args.allow_dangerous else 'on'}")
    print(
        "Concurrency: "
        f"{MAX_ACTIVE_BRIDGE_REQUESTS} requests, "
        f"{MAX_CONCURRENT_EXEC_COMMANDS} terminal, "
        f"{MAX_CONCURRENT_FILE_MUTATIONS} file, "
        f"{MAX_CONCURRENT_NETWORK_REQUESTS} network, "
        f"{MAX_CONCURRENT_MCP_REQUESTS} MCP"
    )
    if not args.no_print_token:
        print(f"Token: {token}")
        print("Paste the URL and token into Fauna Settings > Local Workspace Bridge.")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
