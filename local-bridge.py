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
import html
import ipaddress
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen


VERSION = "1.0.1"
DEFAULT_PORT = 8765
MAX_BODY_BYTES = 128_000
MAX_WRITE_BODY_BYTES = 5_000_000
MAX_OPENAI_BODY_BYTES = 32_000_000
MAX_OPENAI_RESPONSE_BYTES = 32_000_000
OPENAI_PROXY_TIMEOUT_SECONDS = 180
MAX_LOCAL_AI_BODY_BYTES = 32_000_000
MAX_LOCAL_AI_RESPONSE_BYTES = 32_000_000
LOCAL_AI_PROXY_TIMEOUT_SECONDS = 180
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


class NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req: Request, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
        return None


WEB_FETCH_OPENER = build_opener(NoRedirectHandler)


class BridgeConfig:
    def __init__(self, root: Path, token: str, shell: str, allow_dangerous: bool, access_policy: str, projects: dict[str, Path] | None = None) -> None:
        self.root = root.resolve()
        self.token = token
        self.shell = shell
        self.allow_dangerous = allow_dangerous
        self.access_policy = access_policy
        self.projects = projects or {}


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


def list_tree(config: BridgeConfig, requested: str, depth: int, limit: int, scope: str | None = None) -> dict[str, Any]:
    base = resolve_bridge_path(config, requested, scope, create_scope=bool(scope))
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

            if is_dir and current_depth < depth:
                walk(resolved_child, current_depth + 1)

    walk(base, 0)
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
    raw = target.read_bytes()
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
    target.mkdir(parents=True, exist_ok=True)
    return {
        "path": response_path(config, target, payload.get("scope")),
        "created": True,
    }


def public_ip_allowed(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


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


def read_limited_openai_body(response: Any) -> tuple[bytes, bool]:
    body = response.read(MAX_OPENAI_RESPONSE_BYTES + 1)
    truncated = len(body) > MAX_OPENAI_RESPONSE_BYTES
    return body[:MAX_OPENAI_RESPONSE_BYTES], truncated


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

    try:
        with urlopen(request, timeout=OPENAI_PROXY_TIMEOUT_SECONDS) as response:
            response_body, truncated = read_limited_openai_body(response)
            response_headers = dict(response.headers.items())
            status = int(response.status)
    except HTTPError as exc:
        response_body, truncated = read_limited_openai_body(exc)
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

    try:
        response = urlopen(request, timeout=OPENAI_PROXY_TIMEOUT_SECONDS)
    except HTTPError as exc:
        response_body, _truncated = read_limited_openai_body(exc)
        response_headers = dict(exc.headers.items())
        handler.send_response(int(exc.code))
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
        while True:
            chunk = response.read(8192)
            if not chunk:
                break
            try:
                handler.wfile.write(chunk)
                handler.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                break


def read_limited_local_ai_body(response: Any) -> tuple[bytes, bool]:
    body = response.read(MAX_LOCAL_AI_RESPONSE_BYTES + 1)
    truncated = len(body) > MAX_LOCAL_AI_RESPONSE_BYTES
    return body[:MAX_LOCAL_AI_RESPONSE_BYTES], truncated


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

    try:
        with urlopen(request, timeout=LOCAL_AI_PROXY_TIMEOUT_SECONDS) as response:
            response_body, truncated = read_limited_local_ai_body(response)
            response_headers = dict(response.headers.items())
            status = int(response.status)
    except HTTPError as exc:
        response_body, truncated = read_limited_local_ai_body(exc)
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
                    "accessPolicy": self.config.access_policy,
                    "allowDangerous": self.config.allow_dangerous,
                    "projects": len(self.config.projects),
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
        max_body_bytes = MAX_BODY_BYTES
        if parsed.path == "/openai":
            max_body_bytes = MAX_OPENAI_BODY_BYTES
        elif parsed.path == "/local-ai":
            max_body_bytes = MAX_LOCAL_AI_BODY_BYTES
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
            elif parsed.path == "/write":
                result = write_text_file(self.config, payload, append=bool(payload.get("append")))
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/mkdir":
                result = make_directory(self.config, payload)
                json_response(self, 200, {"ok": True, **result})
            elif parsed.path == "/openai":
                if payload.get("streamResponse"):
                    stream_openai_request(payload, self)
                else:
                    result = proxy_openai_request(payload)
                    json_response(self, 200, result)
            elif parsed.path == "/local-ai":
                result = proxy_local_ai_request(payload)
                json_response(self, 200, result)
            elif parsed.path == "/fetch-url":
                result = fetch_public_url(payload)
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

    token = args.token or secrets.token_urlsafe(24)
    projects = parse_project_roots(args.projects_json)
    FaunaBridgeHandler.config = BridgeConfig(root, token, args.shell, args.allow_dangerous, args.access_policy, projects)
    server = ThreadingHTTPServer((args.host, args.port), FaunaBridgeHandler)

    print("Fauna local workspace bridge")
    print(f"URL: http://{args.host}:{args.port}")
    print(f"Root: {root}")
    print(f"Access policy: {args.access_policy}")
    print(f"Registered projects: {len(projects)}")
    print(f"Command blocklist: {'off' if args.allow_dangerous else 'on'}")
    print(f"Token: {token}")
    print("Paste the URL and token into Fauna Settings > Local Workspace Bridge.")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
