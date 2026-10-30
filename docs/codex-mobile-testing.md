# ChatGPT Codex on Obsidian mobile (experimental)

This change enables the built-in Codex provider on mobile and adds ChatGPT device-code OAuth sign-in.

## Manual test (iPhone)

- Open Nexus → Providers → ChatGPT (Codex) → Connect.
- Open the displayed https://auth.openai.com/codex/device link and enter the one-time code.
- Confirm Nexus shows the account as connected and retains the connection after reopening the modal.
- Send a simple prompt using a Codex model. Then test a prompt that uses Obsidian vault tools.
- Verify that the device-code URL and action buttons fit on a narrow screen.

## Verification and limitations

- GitHub Actions PR checks (lint and Jest) passed on the development branch.
- iPhone: device-code connection reported successful; UI tested manually. End-to-end inference and tool execution are not fully verified.
- **Android: not tested.** Android sign-in, browser hand-off, token persistence, and model/tool calls need real-device validation.
- The mobile transport uses Obsidian requestUrl and buffers SSE; responses may not stream incrementally.
- Device-code sign-in may depend on ChatGPT account settings.
- Test in a separate vault. Never share or commit access/refresh tokens.

## Build

```sh
npm ci
npm run build
npm test -- --runInBand
```

The PR intentionally does not change manifest.json, package.json, release workflow, or version catalog. Maintainers can choose the release version.
