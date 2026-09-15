import assert from 'node:assert/strict';
import { outputPaths } from '../.test-build/naming.js';

assert.deepEqual(outputPaths('Assets/photo.jpg'), {
  media: 'Assets/photo.wavesigned.png',
  signature: 'Assets/photo.wavesign.sig.json',
});

assert.deepEqual(outputPaths('Evidence/report.pdf', 2), {
  media: 'Evidence/report-2.wavesigned.pdf',
  signature: 'Evidence/report-2.wavesign.sig.json',
});

console.log('WaveSign naming tests passed.');
