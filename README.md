# WaveSign for Obsidian

WaveSign creates and verifies tamper-evident authentication packages for images and PDFs in an Obsidian vault. It adds an invisible embedded signal and returns mandatory `sig.json` verification metadata. It is not a visible watermark or an electronic-signature product.

## Status

Version `0.1.0` is an early Windows-tested beta for a small tester group. Use a separate test vault. Obsidian 1.11.5 or later is required; this is the first desktop release with Secret Storage encrypted at rest. Real Obsidian testing has covered Windows 1.14.4; macOS, Linux, Android, and iOS are not validated. It is not listed in the Community directory. See [test coverage](docs/TESTING.md).

An account is required. Connecting opens `wave-sign.com` in the browser for a one-time approval; the plugin never receives your account password. The resulting integration token is limited to file signing and verification, expires after 90 days, and can be revoked by disconnecting.

## Beta installation

New tester? Start with the [15-minute installation guide and feedback checklist](docs/BETA_TESTER_GUIDE.md).

In BRAT (1.1.0 or later), add `roloport/wavesign-obsidian` and select the `0.1.0` release for a frozen beta. See the [GitHub release](https://github.com/roloport/wavesign-obsidian/releases/tag/0.1.0). For a manual test, download `main.js`, `manifest.json`, and `styles.css` from that release and copy them into:

```text
<your-vault>/.obsidian/plugins/wavesign/
```

Reload Obsidian, enable WaveSign under Community plugins, then run **Connect WaveSign account** from the command palette.

## Commands

- Connect WaveSign account
- Sign selected image or PDF
- Sign attachments in current note
- Verify selected signed file
- Disconnect WaveSign account

Original files are never overwritten. Signed images are returned as PNG. A signed PDF is a rasterized image-PDF, so searchable/selectable text, forms, annotations, and original PDF structure are not retained.

Default outputs are created beside the original:

```text
<stem>.wavesigned.png|pdf
<stem>.wavesign.sig.json
```

Existing outputs are preserved; WaveSign chooses a versioned filename on collision.

Verification shows progress and keeps the final verdict open until you dismiss it. A timeout or network failure is not an authenticity verdict.

Uploads are limited to 25 MiB for media and 1 MiB for verification JSON. Longer PDFs can exceed the metadata limit. Cancelling either pre-upload prompt sends nothing; closing a verification window or timing out does not cancel work already submitted to the server. If storage prevents automatic cleanup after a failed write, the plugin identifies incomplete files that must not be shared as a finished package.

## Privacy and security

- Selected files and operation passphrases are sent over HTTPS to `wave-sign.com` and processed on WaveSign servers.
- The plugin stores its revocable WaveSign integration token in Obsidian SecretStorage.
- The signing passphrase is requested for each operation and is not stored by the plugin.
- The plugin contains no WaveSign server credential or proprietary signing engine.
- The plugin has no client-side telemetry.
- Verification requires the signed media, matching `sig.json`, and the same passphrase. The metadata cannot currently be regenerated if it is lost.

See the current [privacy policy](https://wave-sign.com/privacy) and [service terms](https://wave-sign.com/terms).

## Development

```sh
npm ci
npm test
npm run build
```

Release assets are `main.js`, `manifest.json`, and `styles.css`.

The release workflow builds a draft pre-release for manual review; it never automatically distributes a beta. Release format follows the [Obsidian release guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) and [BRAT developer guide](https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md), checked 2026-10-16. Bundled fflate is MIT-licensed; its full license is included in the generated bundle.
