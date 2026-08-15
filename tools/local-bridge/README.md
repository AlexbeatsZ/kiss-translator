# Local Agy / Codex bridge

Browser extensions cannot safely launch desktop commands themselves. This
small, standard-library Python companion exposes only two translation commands
on `127.0.0.1` and returns an OpenAI-compatible response to KISS Translator.

Start it from the repository root:

```powershell
uv run tools/local-bridge/kiss_cli_bridge.py
```

The bridge prints a random token. In **Translation engines**, open **LocalAgy**
or **LocalCodex** and paste that value into **Bridge token**. The default URLs
already point to port `17891`. Keep the terminal open while translating.

For a stable token across restarts, pass it explicitly:

```powershell
uv run tools/local-bridge/kiss_cli_bridge.py --token "your-long-random-token"
```

Security properties:

- binds only to `127.0.0.1`;
- requires bearer-token authentication for models and completions;
- accepts extension origins and loopback origins, not arbitrary websites;
- starts commands with an argument array and `shell=False`;
- runs each request in a temporary working directory with timeout and size
  limits; Codex is additionally restricted to a read-only sandbox;
- does not log prompts or model responses.

You can override command paths with `--agy-command` or `--codex-command`, and
set the Codex model suggestions with `KISS_CODEX_MODELS` (comma separated).

## Troubleshooting

`/health` and the model endpoints confirm that the bridge can find the local
CLI. They do not confirm that the CLI's upstream account is allowed to make a
request. For example, Agy may list models successfully and then return
`FAILED_PRECONDITION: User location is not supported for API use`; in that case
the bridge is working and the Agy account/network region must be fixed.
