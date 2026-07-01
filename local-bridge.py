#!/usr/bin/env python3
"""
Small localhost bridge for Flora.

The browser app cannot access arbitrary local files or execute terminal commands
without a local helper. This server is intentionally dependency-free, binds to
127.0.0.1 by default, requires a token, and keeps all file access inside --root.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


VERSION = "1.0.0"
DEFAULT_PORT = 8765
MAX_BODY_BYTES = 128_000
MAX_TEXT_BYTES = 160_000
MAX_EXEC_SECONDS = 60
SKIPPED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".cache",
    ".pytest_cache",
    "__pycache__",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "venv",
}
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


class BridgeConfig:
    def __init__(self, root: Path, token: str, shell: str, allow_dangerous: bool) -> None:
        self.root = root.resolve()
        self.token = token
        self.shell = shell
        self.allow_dangerous = allow_dangerous


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
    if re.match(r"^https?://(?:127\.0\.0\.1|localhost):\d+$", origin):
        handler.send_header("Access-Control-Allow-Origin", origin)
        handler.send_header("Vary", "Origin")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, X-Flora-Bridge-Token, Authorization")
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


def list_tree(root: Path, requested: str, depth: int, limit: int) -> dict[str, Any]:
    base = resolve_under_root(root, requested)
    if not base.exists():
        raise FileNotFoundError("Path does not exist")
    if not base.is_dir():
        raise NotADirectoryError("Path is not a directory")

    entries: list[dict[str, Any]] = []
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
                resolved_child.relative_to(root)
            except (OSError, ValueError):
                continue

            is_dir = child.is_dir()
            item: dict[str, Any] = {
                "path": relative_path(resolved_child, root),
                "name": child.name,
                "type": "directory" if is_dir else "file",
            }
            if not is_dir:
                try:
                    item["size"] = child.stat().st_size
                except OSError:
                    item["size"] = None
            entries.append(item)

            if is_dir and current_depth < depth:
                walk(resolved_child, current_depth + 1)

    walk(base, 0)
    return {
        "root": str(root),
        "path": relative_path(base, root),
        "depth": depth,
        "entries": entries,
        "truncated": truncated,
    }


def read_text_file(root: Path, requested: str, max_bytes: int) -> dict[str, Any]:
    target = resolve_under_root(root, requested)
    if not target.exists():
        raise FileNotFoundError("File does not exist")
    if not target.is_file():
        raise IsADirectoryError("Path is not a file")

    max_bytes = clamp_int(max_bytes, 1, 1, MAX_TEXT_BYTES)
    raw = target.read_bytes()
    truncated = len(raw) > max_bytes
    raw = raw[:max_bytes]
    text = raw.decode("utf-8", errors="replace")
    return {
        "path": relative_path(target, root),
        "size": target.stat().st_size,
        "truncated": truncated,
        "content": text,
    }


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
    cwd = resolve_under_root(config.root, str(payload.get("cwd") or "."))
    timeout = clamp_int(payload.get("timeout"), 20, 1, MAX_EXEC_SECONDS)

    if not cwd.exists() or not cwd.is_dir():
        raise NotADirectoryError("Command cwd is not a directory")

    blocked_reason = None if config.allow_dangerous else command_is_blocked(command)
    if blocked_reason:
        raise PermissionError(blocked_reason)

    args, use_shell = shell_command_args(command, config.shell)
    started = time.monotonic()
    try:
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
            "cwd": relative_path(cwd, config.root),
            "exitCode": completed.returncode,
            "durationMs": duration_ms,
            "stdout": stdout,
            "stderr": stderr,
            "truncated": len(completed.stdout) > MAX_TEXT_BYTES or len(completed.stderr) > MAX_TEXT_BYTES,
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "command": command,
            "cwd": relative_path(cwd, config.root),
            "exitCode": None,
            "durationMs": int((time.monotonic() - started) * 1000),
            "stdout": (exc.stdout or "")[-MAX_TEXT_BYTES:] if isinstance(exc.stdout, str) else "",
            "stderr": (exc.stderr or "")[-MAX_TEXT_BYTES:] if isinstance(exc.stderr, str) else "",
            "timedOut": True,
            "truncated": False,
        }


class FloraBridgeHandler(BaseHTTPRequestHandler):
    config: BridgeConfig

    def log_message(self, format: str, *args: Any) -> None:
        sys.stdout.write("%s - %s\n" % (self.address_string(), format % args))

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        set_cors_headers(self)
        self.end_headers()

    def do_GET(self) -> None:
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
                })
            elif parsed.path == "/tree":
                result = list_tree(
                    self.config.root,
                    query.get("path", ["."])[0],
                    clamp_int(query.get("depth", [2])[0], 2, 0, 5),
                    clamp_int(query.get("limit", [220])[0], 220, 1, 800),
                )
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/read":
                result = read_text_file(
                    self.config.root,
                    query.get("path", [""])[0],
                    clamp_int(query.get("maxBytes", [80_000])[0], 80_000, 1, MAX_TEXT_BYTES),
                )
                json_response(self, 200, {"ok": True, **result})
            else:
                json_response(self, 404, {"ok": False, "error": "Unknown endpoint"})
        except Exception as exc:  # noqa: BLE001 - local API returns readable errors.
            json_response(self, 400, {"ok": False, "error": str(exc)})

    def do_POST(self) -> None:
        if not self.authorized():
            json_response(self, 401, {"ok": False, "error": "Unauthorized bridge token"})
            return

        parsed = urlparse(self.path)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length > MAX_BODY_BYTES:
            json_response(self, 413, {"ok": False, "error": "Request body is too large"})
            return

        try:
            body = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(body or "{}")
            if parsed.path == "/exec":
                result = run_command(self.config, payload)
                json_response(self, 200, {"ok": True, **result})
            else:
                json_response(self, 404, {"ok": False, "error": "Unknown endpoint"})
        except Exception as exc:  # noqa: BLE001 - local API returns readable errors.
            status = 403 if isinstance(exc, PermissionError) else 400
            json_response(self, status, {"ok": False, "error": str(exc)})

    def authorized(self) -> bool:
        token = self.config.token
        if not token:
            return True
        header_token = self.headers.get("X-Flora-Bridge-Token", "")
        auth_header = self.headers.get("Authorization", "")
        bearer = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""
        return secrets.compare_digest(header_token, token) or secrets.compare_digest(bearer, token)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Flora's local workspace bridge.")
    parser.add_argument("--root", default=".", help="Workspace root directory exposed to Flora.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Keep 127.0.0.1 unless you know why.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to bind.")
    parser.add_argument("--token", default="", help="Bridge token. Generated when omitted.")
    parser.add_argument("--shell", choices=["powershell", "cmd", "system"], default="powershell" if os.name == "nt" else "system")
    parser.add_argument("--allow-dangerous", action="store_true", help="Disable the small built-in command blocklist.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Workspace root does not exist or is not a directory: {root}")

    token = args.token or secrets.token_urlsafe(24)
    FloraBridgeHandler.config = BridgeConfig(root, token, args.shell, args.allow_dangerous)
    server = ThreadingHTTPServer((args.host, args.port), FloraBridgeHandler)

    print("Flora local workspace bridge")
    print(f"URL: http://{args.host}:{args.port}")
    print(f"Root: {root}")
    print(f"Token: {token}")
    print("Paste the URL and token into Flora Settings > Local Workspace Bridge.")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
