#!/usr/bin/env python3
"""Loopback-only OpenAI-shaped bridge for the local Agy and Codex CLIs."""

from __future__ import annotations

import argparse
import hmac
import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import tempfile
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse


MAX_REQUEST_BYTES = 256 * 1024
MAX_PROMPT_CHARS = 24_000
MAX_OUTPUT_BYTES = 2 * 1024 * 1024
MODEL_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$")
ANSI_PATTERN = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
MODEL_TOKEN_PATTERN = re.compile(
    r"\b(?:gemini|claude|gpt|deepseek|qwen|glm|mimo|grok|o[1-9])"
    r"[A-Za-z0-9._:/-]*\b",
    re.IGNORECASE,
)

FALLBACK_AGY_MODELS = [
    "gemini-3.7-flash-high",
    "gemini-3.7-flash-medium",
    "gemini-3.7-flash-low",
    "claude-sonnet-4-6",
    "claude-opus-4-6-thinking",
    "gpt-oss-120b-medium",
]
FALLBACK_CODEX_MODELS = [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-5.4",
]


class BridgeError(RuntimeError):
    """A safe, user-facing bridge error."""

    def __init__(self, message: str, status: int = HTTPStatus.BAD_REQUEST):
        super().__init__(message)
        self.status = status


def _resolve_command(command: str) -> str:
    resolved = shutil.which(command)
    if resolved:
        return resolved
    if os.path.isfile(command):
        return os.path.abspath(command)
    raise BridgeError(
        f"CLI executable not found: {command}", HTTPStatus.SERVICE_UNAVAILABLE
    )


def _message_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            str(part.get("text", ""))
            for part in content
            if isinstance(part, dict) and part.get("type") in {"text", "input_text"}
        )
    return str(content or "")


def build_prompt(messages: Any) -> str:
    if not isinstance(messages, list) or not messages:
        raise BridgeError("messages must be a non-empty array")

    sections = []
    for message in messages:
        if not isinstance(message, dict):
            raise BridgeError("each message must be an object")
        role = str(message.get("role", "user")).upper()
        content = _message_text(message.get("content"))
        sections.append(f"[{role}]\n{content}")

    prompt = "\n\n".join(sections).strip()
    if not prompt:
        raise BridgeError("messages contain no text")
    if len(prompt) > MAX_PROMPT_CHARS:
        raise BridgeError(
            f"prompt exceeds the local bridge limit ({MAX_PROMPT_CHARS} characters)",
            HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
        )
    return prompt


def _terminate_process_tree(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            check=False,
            capture_output=True,
            text=True,
        )
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def run_cli(
    argv: list[str], *, prompt_stdin: str | None, timeout: int, cwd: str
) -> str:
    process = subprocess.Popen(
        argv,
        cwd=cwd,
        stdin=subprocess.PIPE if prompt_stdin is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=False,
        creationflags=(
            subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
        ),
        start_new_session=os.name != "nt",
    )
    try:
        stdout, stderr = process.communicate(input=prompt_stdin, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        _terminate_process_tree(process)
        process.communicate()
        raise BridgeError(
            f"CLI timed out after {timeout} seconds", HTTPStatus.GATEWAY_TIMEOUT
        ) from error

    if process.returncode != 0:
        detail = ANSI_PATTERN.sub("", stderr or stdout).strip()[-2000:]
        raise BridgeError(
            f"CLI exited with code {process.returncode}: {detail or 'no diagnostic output'}",
            HTTPStatus.BAD_GATEWAY,
        )

    output = ANSI_PATTERN.sub("", stdout).strip()
    if not output:
        raise BridgeError("CLI returned no output", HTTPStatus.BAD_GATEWAY)
    if len(output.encode("utf-8")) > MAX_OUTPUT_BYTES:
        raise BridgeError("CLI output exceeded the bridge limit", HTTPStatus.BAD_GATEWAY)
    return output


def _validate_model(value: Any) -> str:
    model = str(value or "").strip()
    if model and not MODEL_PATTERN.fullmatch(model):
        raise BridgeError("model contains unsupported characters")
    return model


def run_chat(
    provider: str,
    payload: dict[str, Any],
    *,
    agy_command: str,
    codex_command: str,
    timeout: int,
) -> dict[str, Any]:
    prompt = build_prompt(payload.get("messages"))
    model = _validate_model(payload.get("model"))

    with tempfile.TemporaryDirectory(prefix="kiss-cli-") as work_dir:
        if provider == "agy":
            executable = _resolve_command(agy_command)
            argv = [executable]
            if model:
                argv.extend(["--model", model])
            argv.extend(["--print-timeout", f"{timeout}s", "--print", prompt])
            content = run_cli(argv, prompt_stdin=None, timeout=timeout + 5, cwd=work_dir)
        elif provider == "codex":
            executable = _resolve_command(codex_command)
            argv = [
                executable,
                "exec",
                "--ephemeral",
                "--skip-git-repo-check",
                "--ignore-rules",
                "--sandbox",
                "read-only",
            ]
            if model:
                argv.extend(["--model", model])
            argv.append("-")
            content = run_cli(argv, prompt_stdin=prompt, timeout=timeout, cwd=work_dir)
        else:
            raise BridgeError("unknown local provider")

    return {
        "id": f"chatcmpl-local-{uuid.uuid4().hex}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model or provider,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


def _model_response(models: list[str]) -> dict[str, Any]:
    return {
        "object": "list",
        "data": [
            {"id": model, "object": "model", "owned_by": "local-cli"}
            for model in models
        ],
    }


def list_agy_models(command: str, timeout: int) -> list[str]:
    try:
        executable = _resolve_command(command)
        with tempfile.TemporaryDirectory(prefix="kiss-cli-models-") as work_dir:
            output = run_cli(
                [executable, "models"],
                prompt_stdin=None,
                timeout=min(timeout, 30),
                cwd=work_dir,
            )
        models = list(dict.fromkeys(MODEL_TOKEN_PATTERN.findall(output)))
        return models or FALLBACK_AGY_MODELS
    except BridgeError:
        return FALLBACK_AGY_MODELS


def codex_models_from_env() -> list[str]:
    configured = [
        item.strip()
        for item in os.environ.get("KISS_CODEX_MODELS", "").split(",")
        if item.strip()
    ]
    return configured or FALLBACK_CODEX_MODELS


def is_allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    parsed = urlparse(origin)
    if parsed.scheme in {"chrome-extension", "moz-extension"}:
        return True
    return parsed.scheme in {"http", "https"} and parsed.hostname in {
        "127.0.0.1",
        "localhost",
    }


class BridgeServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], handler: type[BaseHTTPRequestHandler], config: argparse.Namespace):
        super().__init__(address, handler)
        self.config = config


class BridgeHandler(BaseHTTPRequestHandler):
    server: BridgeServer
    server_version = "KissCliBridge/1"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}")

    def _cors_headers(self) -> dict[str, str]:
        origin = self.headers.get("Origin")
        if origin and is_allowed_origin(origin):
            return {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Vary": "Origin",
            }
        return {}

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for name, value in self._cors_headers().items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _require_origin(self) -> None:
        if not is_allowed_origin(self.headers.get("Origin")):
            raise BridgeError("origin is not allowed", HTTPStatus.FORBIDDEN)

    def _require_auth(self) -> None:
        supplied = self.headers.get("Authorization", "")
        expected = f"Bearer {self.server.config.token}"
        if not hmac.compare_digest(supplied, expected):
            raise BridgeError("invalid bridge token", HTTPStatus.UNAUTHORIZED)

    def _read_payload(self) -> dict[str, Any]:
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise BridgeError("invalid Content-Length") from error
        if size <= 0 or size > MAX_REQUEST_BYTES:
            raise BridgeError(
                "request body is empty or too large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE
            )
        try:
            payload = json.loads(self.rfile.read(size).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise BridgeError("request body must be valid UTF-8 JSON") from error
        if not isinstance(payload, dict):
            raise BridgeError("request body must be a JSON object")
        if payload.get("stream"):
            raise BridgeError("streaming is not supported by the local CLI bridge")
        return payload

    def do_OPTIONS(self) -> None:  # noqa: N802
        try:
            self._require_origin()
            self.send_response(HTTPStatus.NO_CONTENT)
            for name, value in self._cors_headers().items():
                self.send_header(name, value)
            self.end_headers()
        except BridgeError as error:
            self._send_json(error.status, {"error": {"message": str(error)}})

    def do_GET(self) -> None:  # noqa: N802
        try:
            self._require_origin()
            path = urlparse(self.path).path
            if path == "/health":
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "status": "ok",
                        "agy": bool(shutil.which(self.server.config.agy_command)),
                        "codex": bool(shutil.which(self.server.config.codex_command)),
                    },
                )
                return
            self._require_auth()
            if path == "/v1/agy/models":
                self._send_json(
                    HTTPStatus.OK,
                    _model_response(
                        list_agy_models(
                            self.server.config.agy_command,
                            self.server.config.timeout,
                        )
                    ),
                )
                return
            if path == "/v1/codex/models":
                self._send_json(HTTPStatus.OK, _model_response(codex_models_from_env()))
                return
            raise BridgeError("route not found", HTTPStatus.NOT_FOUND)
        except BridgeError as error:
            self._send_json(error.status, {"error": {"message": str(error)}})

    def do_POST(self) -> None:  # noqa: N802
        try:
            self._require_origin()
            self._require_auth()
            path = urlparse(self.path).path
            match = re.fullmatch(r"/v1/(agy|codex)/chat/completions", path)
            if not match:
                raise BridgeError("route not found", HTTPStatus.NOT_FOUND)
            payload = self._read_payload()
            response = run_chat(
                match.group(1),
                payload,
                agy_command=self.server.config.agy_command,
                codex_command=self.server.config.codex_command,
                timeout=self.server.config.timeout,
            )
            self._send_json(HTTPStatus.OK, response)
        except BridgeError as error:
            self._send_json(error.status, {"error": {"message": str(error)}})
        except Exception as error:  # keep tracebacks and prompt data off the wire
            print(f"Unexpected bridge error: {type(error).__name__}: {error}")
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": {"message": "unexpected local bridge error"}},
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Expose local Agy and Codex CLIs to KISS Translator on loopback."
    )
    parser.add_argument("--port", type=int, default=17891)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--token", default=os.environ.get("KISS_CLI_BRIDGE_TOKEN", ""))
    parser.add_argument("--agy-command", default="agy")
    parser.add_argument("--codex-command", default="codex")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("--port must be between 1024 and 65535")
    if not 10 <= args.timeout <= 1800:
        parser.error("--timeout must be between 10 and 1800 seconds")
    args.token = args.token or secrets.token_urlsafe(32)
    return args


def main() -> None:
    config = parse_args()
    server = BridgeServer(("127.0.0.1", config.port), BridgeHandler, config)
    print(f"KISS local CLI bridge: http://127.0.0.1:{config.port}")
    print(f"Bridge token: {config.token}")
    print("Press Ctrl+C to stop. Prompts and model output are not logged.")
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
