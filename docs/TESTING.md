# Beta acceptance record

Verified 2026-10-16 on Windows, Obsidian 1.14.4, in a separate test vault with synthetic fixtures only. No existing user vault was changed.

## Passed in the real desktop plugin

- Browser-assisted account approval produces a Connected state.
- The connection and adjacent signature-JSON pairing survive an app reload.
- Signing attachments in a note selects four unique PNG/JPG/WEBP/two-page PDF inputs, deduplicating a repeated image embed.
- Before upload, confirmation lists selected files and discloses server-side passphrase processing and rasterized-PDF limitations.
- Signing creates three PNG outputs and one PDF, each with its matching JSON; same-stem collisions get versioned names.
- All four original fixture files remain byte-identical by SHA-256 comparison.
- The signed PNG and two-page PDF verify as Authentic using their original disposable operation key.
- An intentionally wrong key yields Verification failed with the combined tampering/invalid-key verdict.
- Verification progress and the final result remain visible in a modal until dismissed.
- Plugin settings contain only the secret reference, connection ID, and connection time; no plaintext token or passphrase fields.
- After the owner clicked Disconnect, the real settings screen showed Not connected and the saved connection ID/time were empty. A signing attempt stopped before upload confirmation and created no additional package.

## Automated checks

`npm test` covers output naming, strict verification-response validation, successful and rejected requests, timeout handling, pending/success/failure/error modal states, and late responses after dismissal. Tests also execute the real plugin class with a fake Obsidian host to confirm disconnected sign/verify never reach the API, successful revocation clears local settings, and failed remote revocation still removes the local credential while warning the user. `npm run build` passes TypeScript checking and produces the plugin bundle.

These tests do not establish formal cryptographic guarantees.

## Failure-mode hardening (2026-10-16)

The real plugin/API/package implementations were exercised with a mocked host and synthetic responses. Passing cases cover:

- Malformed, empty, extra-entry, duplicate-entry, path-traversal, wrong-format, invalid-JSON, and oversized-declared ZIP contents. Metadata is kept opaque; both image objects and per-page PDF arrays are accepted. Directory sizes are checked before decompression allocation.
- Failure at each of two staging writes and two final renames removes all tracked partial outputs, preserving the original. Signature-name collisions preserve existing files. Failed cleanup reports remaining paths explicitly.
- Cancellation at either pre-upload prompt makes no API request or output. A batch continues after one file fails.
- Duplicate Connect requests are suppressed. Disconnect blocks new operations before the remote request finishes. Approval arriving after disconnect is revoked instead of stored; unloading cancels pending browser opening.
- Offline, timeout, 401/403/413/422/429/502, HTML/non-JSON error responses, malformed verification JSON, invalid token scopes, and untrusted approval addresses. Raw transport errors and server bodies are not displayed.
- Previously produced real production outputs from all four formats pass the updated package validator without displaying signature contents. This is a container-compatibility check, not a new authenticity test.

Local `npm test`, TypeScript checking, and the production build pass. CI runs these automated checks on Windows/macOS/Linux with Node 20; this does not establish Obsidian app compatibility on those platforms. The generated bundle includes the bundled ZIP library's MIT license.

The development SDK is pinned to Obsidian 1.14.4 with a refreshed lockfile, replacing its vulnerable development-only Moment dependency. The complete dependency audit reports zero known vulnerabilities as of 2026-10-16. Neither the SDK nor Moment is bundled into the released plugin.

## Still pending before external beta

- Actual desktop disconnection and its local guard passed. Service-side token revocation was tested separately against production; the old real desktop token was not extracted from SecretStorage for an independent post-disconnect API query.
- The focused mocked failure-mode review passed. The final candidate's real connection, four-format signing, and all four output-verification checks also passed as recorded below. The owner has been asked to finish the final candidate Disconnect check.
- Mobile, macOS, and Linux have not been tested. Do not describe them as validated.
- A draft beta may be prepared after CI, but must stay unpublished until the final candidate smoke test and release review. No Community directory submission has been made.

The proprietary signing core and private service credential are not part of this repository or its release assets. Operation keys, account codes, tokens, and signature contents must not be added to test reports.

## Final 0.1.0 candidate smoke test

Tested 2026-10-16 in Windows Obsidian 1.14.4 with the installed bundle matching the attested GitHub draft release. `main.js` SHA-256: `aeb41cc0122bd2cb88368b2549e18d1152e6a9d2c3d394d8a3780ae3b9bdaaf2`.

- The owner reconnected the test vault; its actual settings panel showed Connected.
- Signing the same four unique synthetic attachments produced new versioned pairs, preserving the earlier outputs: `sample-5.wavesigned.png` (PNG input), `sample-6.wavesigned.png` (JPG input), `sample-7.wavesigned.png` (WEBP input), and `sample-8.wavesigned.pdf` (two-page PDF), each with its adjacent `.wavesign.sig.json`.
- Each of those four new outputs was individually verified through its real Obsidian file menu against production. All four returned Authentic / AUTHENTIC in the persistent result modal.
- SHA-256 checks confirmed all four originals and `Start here.md` were byte-identical. No `.wavesign-tmp-*` files remained.
- The disposable operation key was cleared from temporary test memory and was not written to reports or plugin settings.
- The owner was asked to click Disconnect for the last candidate account-cleanup check. This final action is not yet recorded as complete.

The release remains a draft. This smoke test does not establish macOS/Linux/mobile app compatibility or change the outstanding platform/release-review requirements.
