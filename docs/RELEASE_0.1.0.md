# WaveSign 0.1.0 — Windows-tested beta

Sign local PNG/JPG/WEBP/PDF attachments and verify signed PNG/PDF files from Obsidian. The MIT-licensed client connects to the WaveSign service; the proprietary signing engine stays on the server.

Early beta for a small Windows tester group, available through BRAT or manual installation. Use a separate test vault. This is not a Community directory release. macOS, Linux, Android, and iOS remain unvalidated in the real Obsidian app.

**Windows beta testers wanted:** allow about 15 minutes, use non-sensitive sample files, and follow the installation guide and feedback checklist below. [Send feedback](https://github.com/roloport/wavesign-obsidian/issues/new) in a public issue titled **Beta feedback — 0.1.0**; never include secrets or private documents.

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

## Tester installation guide and feedback checklist

The full [tester guide](https://github.com/roloport/wavesign-obsidian/blob/main/docs/BETA_TESTER_GUIDE.md) is also available as a standalone page.

### Before you begin

You need Windows, Obsidian 1.11.5 or later, internet access, and a WaveSign account. Allow about 15 minutes. Use a separate test vault and non-sensitive samples. Selected files and passphrases are processed on WaveSign servers; use a fresh test passphrase, not an account password. The plugin does not save it and has no client-side telemetry.

### Install and connect

1. Open **Settings → Community plugins** in Obsidian. Install and enable **BRAT**.
2. Following [BRAT's setup instructions](https://tfthacker.com/brat-quick-guide), add `roloport/wavesign-obsidian` and select `0.1.0`.
3. Enable **WaveSign** under Community plugins.
4. Press **Ctrl+P**, run **WaveSign: Connect WaveSign account**, and complete browser sign-in and approval.
5. Return to Obsidian and check that WaveSign settings show **Connected**.

### Try your first file

1. Put a small PNG, JPG, or WEBP in the test vault. Right-click it and choose **Sign with WaveSign**.
2. Review the confirmation and enter your test passphrase.
3. Find the new `.wavesigned.png` and matching `.wavesign.sig.json` beside the original.
4. Right-click the signed image, choose **Verify with WaveSign**, and enter the same passphrase. Expect **Authentic**.
5. Repeat verification with an intentionally wrong passphrase. Expect **Verification failed**.
6. If possible, repeat with a short PDF.

Keep signed media and matching JSON together. You need both and the same passphrase to verify. Lost JSON cannot currently be regenerated. JPG/WEBP outputs become PNG; PDFs become image-PDFs and lose searchable/selectable text, forms, annotations, and original structure. Upload limits: media 25 MiB, verification JSON 1 MiB.

### Feedback checklist

Mark each item **Pass / Fail / Not tried**:

- Installation and connection were straightforward.
- Signing created both output files without changing the original.
- The unchanged signed file verified as Authentic.
- A wrong passphrase was rejected.
- Signing again preserved earlier outputs.
- Cancelling before upload created no output.
- PDF signing and verification worked.
- Disconnecting blocked further signing and verification.

**Would this fit your publishing workflow? What was confusing or missing?**

[Open a GitHub issue](https://github.com/roloport/wavesign-obsidian/issues/new) titled **Beta feedback — 0.1.0** with your Windows/Obsidian/plugin versions, file type and approximate size, reproduction steps, expected/actual result, and exact error or redacted screenshot. Issues are public: never include passphrases, login codes, tokens, signature JSON contents, or private documents.
