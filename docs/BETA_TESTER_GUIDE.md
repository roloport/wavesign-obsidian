# WaveSign for Obsidian — Beta Tester Guide

**Version:** 0.1.0 · **Platform:** Windows

Allow about 15 minutes. Use a separate test vault and non-sensitive sample files. macOS, Linux, and mobile are not yet validated.

## Before you begin

You need Obsidian 1.11.5 or later, internet access, and a WaveSign account.

Selected files and signing passphrases are sent to WaveSign for server-side processing. Use a fresh test passphrase—not an account password. The plugin does not save this passphrase and has no client-side telemetry.

## Install and connect

1. In Obsidian, open **Settings → Community plugins**. Install and enable **BRAT**.
2. Using [BRAT's setup instructions](https://tfthacker.com/brat-quick-guide), add `roloport/wavesign-obsidian` and select release `0.1.0`.
3. Enable **WaveSign** under Community plugins.
4. Press **Ctrl+P**, run **WaveSign: Connect WaveSign account**, and complete the browser sign-in and approval.
5. Return to Obsidian. WaveSign settings should show **Connected**.

[Release and manual-install downloads](https://github.com/roloport/wavesign-obsidian/releases/tag/0.1.0)

## Try your first file

1. Put a small PNG, JPG, or WEBP image in the test vault.
2. Right-click it and choose **Sign with WaveSign**.
3. Review the upload confirmation and enter your test passphrase.
4. Find the new `.wavesigned.png` file and matching `.wavesign.sig.json`.
5. Right-click the signed image, choose **Verify with WaveSign**, and enter the same passphrase. Expect **Authentic**.
6. Verify again with an intentionally wrong passphrase. Expect **Verification failed**.
7. If possible, repeat with a short PDF.

Keep the signed file and matching JSON together. Verification requires both files and the original passphrase; lost JSON cannot currently be regenerated.

Signed images become PNG. Signed PDFs become image-PDFs and lose searchable/selectable text, forms, annotations, and original PDF structure. Limits: 25 MiB media; 1 MiB verification JSON.

## Feedback checklist

Mark each item **Pass / Fail / Not tried**:

- Installation and account connection were straightforward.
- Signing created both output files without changing the original.
- The unchanged signed file verified as Authentic.
- A wrong passphrase was rejected.
- Signing again preserved earlier outputs.
- Cancelling before upload created no output.
- PDF signing and verification worked.
- Disconnecting blocked further signing and verification.

**Would this fit your publishing workflow? What was confusing or missing?**

For any problem, [open a GitHub issue](https://github.com/roloport/wavesign-obsidian/issues/new) titled **Beta feedback — 0.1.0** and include:

- Windows, Obsidian, and WaveSign versions
- File type and approximate size
- Steps taken, expected result, and actual result
- Exact error text or a redacted screenshot

Issues are public. Never include passphrases, login codes, tokens, signature JSON contents, or private documents.

[Privacy policy](https://wave-sign.com/privacy) · [Service terms](https://wave-sign.com/terms)
