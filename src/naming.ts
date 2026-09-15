export type OutputPaths = { media: string; signature: string };

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
}

export function outputPaths(inputPath: string, version = 1): OutputPaths {
  const slash = inputPath.lastIndexOf('/');
  const folder = slash >= 0 ? inputPath.slice(0, slash + 1) : '';
  const filename = slash >= 0 ? inputPath.slice(slash + 1) : inputPath;
  const dot = filename.lastIndexOf('.');
  const stem = dot >= 0 ? filename.slice(0, dot) : filename;
  const extension = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
  const versionedStem = version > 1 ? `${stem}-${version}` : stem;
  const mediaExtension = extension === 'pdf' ? 'pdf' : 'png';
  return {
    media: normalize(`${folder}${versionedStem}.wavesigned.${mediaExtension}`),
    signature: normalize(`${folder}${versionedStem}.wavesign.sig.json`),
  };
}
