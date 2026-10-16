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

## Still pending before external beta

- Actual desktop disconnection and its local guard passed. Service-side token revocation was tested separately against production; the old real desktop token was not extracted from SecretStorage for an independent post-disconnect API query.
- Complete focused failure-mode review (offline/rate-limit/error responses, malformed ZIP/JSON, partial-output cleanup, and cancellation).
- Mobile, macOS, and Linux have not been tested. Do not describe them as validated.
- No beta tag/release or Community directory submission has been published.

The proprietary signing core and private service credential are not part of this repository or its release assets. Operation keys, account codes, tokens, and signature contents must not be added to test reports.
