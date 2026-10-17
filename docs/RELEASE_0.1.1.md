# WaveSign 0.1.1 — Community directory review fix

Changes the account settings heading to comply with Obsidian's automated review. Signing, verification, authentication, storage, networking and dependencies are unchanged from 0.1.0. This is an early release, not a claim of validation on additional platforms.

## Installation

Use [Add to Obsidian](https://community.obsidian.md/plugins/wavesign) once directory review permits installation. While review is pending, use BRAT with `roloport/wavesign-obsidian` and tag `0.1.1`, or download `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/wavesign/`. Reload Obsidian and enable WaveSign.

## Requirements and disclosures

- Obsidian 1.11.5+, internet access and a WaveSign account are required.
- Real-app acceptance testing covered Windows Obsidian 1.14.4 on 0.1.0. The 0.1.1 heading-only patch passes automated tests and build; macOS, Linux, Android and iOS remain unvalidated in the real app.
- Selected files and operation passphrases are sent over HTTPS to WaveSign servers. The plugin does not store passphrases and has no client-side telemetry.
- Verification requires the signed media, matching signature JSON and the same passphrase. Lost metadata cannot currently be regenerated.
- Originals are preserved. Signed images become PNG. PDFs become rasterized image-PDFs, losing searchable/selectable text, forms, annotations and original structure.
- Limits: media 25 MiB; verification JSON 1 MiB. Longer PDFs may exceed the metadata limit.
- The client is MIT-licensed; the remote signing engine is proprietary. This is tamper-evident authentication, not an electronic signature or formal cryptographic guarantee.

[Privacy policy](https://wave-sign.com/privacy) · [Service terms](https://wave-sign.com/terms) · [Test coverage](https://github.com/roloport/wavesign-obsidian/blob/main/docs/TESTING.md)
