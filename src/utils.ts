import { TFile, Vault, normalizePath } from 'obsidian';
import { outputPaths, type OutputPaths } from './naming';

export { outputPaths } from './naming';

export const SUPPORTED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'pdf']);
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_SIGNATURE_UPLOAD_BYTES = 1024 * 1024;

export function isSupportedFile(file: TFile | null | undefined): file is TFile {
  return Boolean(file && SUPPORTED_EXTENSIONS.has(file.extension.toLowerCase()));
}

export function availableOutputPaths(vault: Vault, inputPath: string): OutputPaths {
  for (let version = 1; version < 10_000; version += 1) {
    const paths = outputPaths(inputPath, version);
    if (!vault.getAbstractFileByPath(paths.media) && !vault.getAbstractFileByPath(paths.signature)) return paths;
  }
  throw new Error('Could not find available output names.');
}

export function signaturePathForSignedFile(vault: Vault, signedPath: string): string | null {
  const slash = signedPath.lastIndexOf('/');
  const folder = slash >= 0 ? signedPath.slice(0, slash + 1) : '';
  const filename = slash >= 0 ? signedPath.slice(slash + 1) : signedPath;
  const match = filename.match(/^(.*)\.wavesigned\.(?:png|pdf)$/i);
  if (!match) return null;
  const candidate = normalizePath(`${folder}${match[1]}.wavesign.sig.json`);
  return vault.getAbstractFileByPath(candidate) instanceof TFile ? candidate : null;
}

export function contentTypeFor(file: TFile): string {
  switch (file.extension.toLowerCase()) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'pdf': return 'application/pdf';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}
