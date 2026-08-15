from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parent))

import kiss_cli_bridge as bridge  # noqa: E402


class PromptTests(unittest.TestCase):
    def test_build_prompt_preserves_roles_and_text_parts(self) -> None:
        prompt = bridge.build_prompt(
            [
                {"role": "system", "content": "Translate accurately."},
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "Hello"},
                        {"type": "image_url", "image_url": "ignored"},
                    ],
                },
            ]
        )

        self.assertEqual(
            prompt,
            "[SYSTEM]\nTranslate accurately.\n\n[USER]\nHello",
        )

    def test_rejects_empty_messages_and_unsafe_model_names(self) -> None:
        with self.assertRaises(bridge.BridgeError):
            bridge.build_prompt([])
        with self.assertRaises(bridge.BridgeError):
            bridge._validate_model("model; calc.exe")


class OriginTests(unittest.TestCase):
    def test_allows_extension_and_loopback_origins_only(self) -> None:
        self.assertTrue(bridge.is_allowed_origin("chrome-extension://abc"))
        self.assertTrue(bridge.is_allowed_origin("moz-extension://abc"))
        self.assertTrue(bridge.is_allowed_origin("http://127.0.0.1:3000"))
        self.assertFalse(bridge.is_allowed_origin("https://example.com"))


class CommandTests(unittest.TestCase):
    @patch.object(bridge, "_resolve_command", return_value="agy.exe")
    @patch.object(bridge, "run_cli", return_value="translated")
    def test_agy_uses_an_argument_array_without_stdin(
        self, run_cli_mock, _resolve_mock
    ) -> None:
        response = bridge.run_chat(
            "agy",
            {
                "model": "gemini-3.7-flash-high",
                "messages": [{"role": "user", "content": "Hello"}],
            },
            agy_command="agy",
            codex_command="codex",
            timeout=30,
        )

        argv = run_cli_mock.call_args.args[0]
        self.assertEqual(argv[0], "agy.exe")
        self.assertEqual(argv[1:3], ["--model", "gemini-3.7-flash-high"])
        self.assertIn("--print", argv)
        self.assertIsNone(run_cli_mock.call_args.kwargs["prompt_stdin"])
        self.assertEqual(response["choices"][0]["message"]["content"], "translated")

    @patch.object(bridge, "_resolve_command", return_value="codex.exe")
    @patch.object(bridge, "run_cli", return_value="translated")
    def test_codex_uses_ephemeral_read_only_exec_and_prompt_stdin(
        self, run_cli_mock, _resolve_mock
    ) -> None:
        bridge.run_chat(
            "codex",
            {
                "model": "gpt-5.6-sol",
                "messages": [{"role": "user", "content": "Hello"}],
            },
            agy_command="agy",
            codex_command="codex",
            timeout=30,
        )

        argv = run_cli_mock.call_args.args[0]
        self.assertEqual(argv[:2], ["codex.exe", "exec"])
        self.assertIn("--ephemeral", argv)
        self.assertIn("read-only", argv)
        self.assertEqual(argv[-1], "-")
        self.assertEqual(run_cli_mock.call_args.kwargs["prompt_stdin"], "[USER]\nHello")


if __name__ == "__main__":
    unittest.main()
