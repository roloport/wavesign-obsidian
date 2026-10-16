import { unzipSync } from 'fflate';

export const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;

// Validate the container, not the proprietary signature schema or algorithm.
export function readSignedPackage(archive: ArrayBuffer, pdf: boolean): { media: Uint8Array; signature: Uint8Array } {
  const invalid = () => new Error('WaveSign returned an invalid or oversized signing package. No output was saved.');
  if (archive.byteLength < 22 || archive.byteLength > MAX_PACKAGE_BYTES) throw invalid();
  const bytes = new Uint8Array(archive);
  const mediaName = pdf ? 'signed.pdf' : 'signed.png';
  const names = new Set<string>();
  let total = 0;
  try {
    // First pass inspects every central-directory entry without inflating any file.
    unzipSync(bytes, { filter: (file) => {
      if ((file.name !== mediaName && file.name !== 'sig.json') || names.has(file.name)
        || !Number.isSafeInteger(file.originalSize) || file.originalSize <= 0
        || (file.compression !== 0 && file.compression !== 8)) throw invalid();
      total += file.originalSize;
      if (total > MAX_PACKAGE_BYTES || file.size > bytes.length) throw invalid();
      names.add(file.name);
      return false;
    } });
    if (names.size !== 2) throw invalid();
    const entries = unzipSync(bytes);
    const media = entries[mediaName];
    const signature = entries['sig.json'];
    if (!media?.length || !signature?.length || media.length + signature.length !== total) throw invalid();
    const header = pdf ? [37, 80, 68, 70, 45] : [137, 80, 78, 71, 13, 10, 26, 10];
    if (!header.every((value, index) => media[index] === value)) throw invalid();
    const metadata: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(signature));
    // Images use an object; PDFs may use an array of per-page records. Keep the
    // proprietary payload opaque rather than imposing an invented schema.
    if (!metadata || typeof metadata !== 'object' || !Object.keys(metadata).length) throw invalid();
    return { media, signature };
  } catch {
    throw invalid();
  }
}
