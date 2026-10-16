# WaveSign for Obsidian

WaveSign creates and verifies tamper-evident authentication packages for images and PDFs in an Obsidian vault. It adds an invisible embedded signal and returns mandatory `sig.json` verification metadata. It is not a visible watermark or an electronic-signature product.

## Status

Version `0.1.0` is an early beta. Install it manually in a test vault or through BRAT after a beta release is published. Obsidian 1.11.5 or later is required; this is the first desktop release with Secret Storage encrypted at rest.

An account is required. Connecting opens `wave-sign.com` in the browser for a one-time approval; the plugin never receives your account password. The resulting integration token is limited to file signing and verification, expires after 90 days, and can be revoked by disconnecting.

## Beta installation

After the first GitHub release is published, add `roloport/wavesign-obsidian` to BRAT. For a manual test, copy `main.js`, `manifest.json`, and `styles.css` into:

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
