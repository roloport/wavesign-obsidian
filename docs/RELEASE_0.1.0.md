# WaveSign 0.1.0 — Windows-tested beta

Sign local PNG/JPG/WEBP/PDF attachments and verify signed PNG/PDF files from Obsidian. The MIT-licensed client connects to the WaveSign service; the proprietary signing engine stays on the server.

Early beta for a small Windows tester group, available through BRAT or manual installation. Use a separate test vault. This is not a Community directory release. macOS, Linux, Android, and iOS remain unvalidated in the real Obsidian app.

## Install

In BRAT 1.1.0 or later, add `roloport/wavesign-obsidian` and choose release `0.1.0`. Alternatively, copy the three attached assets (`main.js`, `manifest.json`, `styles.css`) into `<vault>/.obsidian/plugins/wavesign/`, reload Obsidian, and enable WaveSign. Then run **Connect WaveSign account** and approve the connection in your browser.

## What is included

- Browser-assisted account connection with a scoped token in Obsidian SecretStorage.
- Signing selected files or unique attachments linked from the current note.
- Paired signed media and JSON metadata, collision-safe output names, unchanged originals.
- Persistent verification progress and verdicts, with clear network/error/timeout states.
- Bounded ZIP extraction, container/JSON validation, partial-output cleanup, and protection against delayed connection approval after disconnect/unload.

## Requirements and limitations

- Obsidian 1.11.5 or later, a WaveSign account, and internet access.
- Real application testing: Windows, Obsidian 1.14.4. macOS, Linux, Android, and iOS are not yet validated in Obsidian. Automated host-mocked tests are not a substitute for real-app tests.
- The final hardened candidate passed real Windows connection, four-format signing, individual verification of all four new outputs, and owner-operated disconnect, preserving originals. Disconnected signing and verification both stop before upload with a connection-required notice.
- Selected files and passphrases are sent over HTTPS and processed server-side. Passphrases are not stored by the plugin; no client-side telemetry is included.
- Verification requires the signed file, matching JSON, and original passphrase. Keep both output files together; lost JSON cannot currently be regenerated.
- JPG/WEBP outputs are PNG. PDFs are rasterized image-PDFs, losing selectable/searchable text, forms, annotations, and original structure.
- Current service upload limits: media 25 MiB; verification JSON 1 MiB. Longer PDFs can produce metadata exceeding that verification limit.
- A timeout or closing a result window does not cancel server-side processing. Upload confirmation and passphrase prompts can be cancelled before transmission.
- If storage prevents cleanup, an explicit warning identifies incomplete output paths. Do not share those files as a completed package.
- This is tamper-evident authentication, not an electronic signature, formal cryptographic guarantee, or proof of legal admissibility.

Privacy: https://wave-sign.com/privacy · Terms: https://wave-sign.com/terms

See [the acceptance record](https://github.com/roloport/wavesign-obsidian/blob/main/docs/TESTING.md) for exact test coverage and outstanding checks.
