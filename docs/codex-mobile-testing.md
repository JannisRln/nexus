# Codex on Obsidian mobile (experimental)

This branch adds a device-code OAuth path for ChatGPT/Codex on mobile, based on the open-source Codex CLI protocol (`codex-rs/login/src/device_code_auth.rs`).

## Sign in

1. In ChatGPT account security settings, enable **device code login** (beta) if available.
2. In Obsidian mobile, open Nexus provider settings and edit **OpenAI**; choose the secondary **ChatGPT (Codex)** connection.
3. Select Connect. Open `https://auth.openai.com/codex/device` and enter the one-time code shown in Nexus.
4. After authorization, wait for Nexus to exchange the code and save the tokens.

The device code expires after approximately 15 minutes. Never share OAuth tokens or store them in Git.

## Limitations

- The mobile transport buffers server-sent events through Obsidian `requestUrl`, so partial output may not appear until the request completes.
- The Codex device-code login is beta and may be disabled for some accounts or workspaces.
- Device flow and the mobile UI have **not** been tested on a real iPhone. Test in a separate vault first.
- Mobile token storage and synchronization must be reviewed before production use.

## Build and test

```sh
npm ci
npm run build
npm test -- --runInBand
```

Install `main.js`, `manifest.json`, and `styles.css` (when present) under `.obsidian/plugins/nexus/` in a test vault. Restart Obsidian and enable Nexus.

Official reference: https://learn.chatgpt.com/docs/auth
