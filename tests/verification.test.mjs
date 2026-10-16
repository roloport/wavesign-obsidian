import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { parseVerificationResult, withVerificationTimeout } from '../.test-build/verification-result.js';

assert.deepEqual(parseVerificationResult({ is_valid: true, verdict: 'Authentic' }), { is_valid: true, verdict: 'Authentic' });
assert.deepEqual(parseVerificationResult({ is_valid: false, verdict: 'Wrong key or changed file' }), { is_valid: false, verdict: 'Wrong key or changed file' });
for (const value of [null, {}, { is_valid: 'false', verdict: 'Authentic' }, { is_valid: true }, { is_valid: true, verdict: '' }]) {
  assert.throws(() => parseVerificationResult(value), /invalid verification result/);
}
assert.equal(await withVerificationTimeout(Promise.resolve('done'), 50), 'done');
await assert.rejects(withVerificationTimeout(Promise.reject(new Error('Offline')), 50), /Offline/);
await assert.rejects(withVerificationTimeout(new Promise(() => {}), 5), /timed out.*No verdict/);

// Exercise the real modal implementation without reading Obsidian's secret store.
class Content {
  items = [];
  empty() { this.items.length = 0; }
  createEl(tag, options) { this.items.push({ tag, text: options.text }); }
}
class Modal {
  contentEl = new Content();
  setTitle(title) { this.title = title; }
  open() { this.onOpen(); }
  close() { this.onClose(); }
}
class Setting {
  addButton(callback) {
    const button = { setButtonText() { return this; }, onClick() { return this; } };
    callback(button);
    return this;
  }
}
const bundled = await build({ entryPoints: ['src/verification-modal.ts'], bundle: true, write: false, format: 'cjs', external: ['obsidian'] });
const sandbox = { module: { exports: {} }, require(name) { assert.equal(name, 'obsidian'); return { Modal, Setting }; } };
vm.runInNewContext(bundled.outputFiles[0].text, sandbox);
const resultWindow = new sandbox.module.exports.VerificationModal({});
resultWindow.open();
assert.equal(resultWindow.contentEl.items[0].text, 'Verifying…');
resultWindow.showResult({ is_valid: true, verdict: 'Unmodified signed pixels' });
assert.equal(resultWindow.contentEl.items[0].text, 'Authentic');
resultWindow.showResult({ is_valid: false, verdict: 'Changed file or wrong passphrase' });
assert.equal(resultWindow.contentEl.items[0].text, 'Verification failed');
resultWindow.showError('Offline. No verdict is available.');
assert.equal(resultWindow.contentEl.items[0].text, 'Verification could not complete');
resultWindow.close();
resultWindow.showResult({ is_valid: true, verdict: 'Late response' });
assert.equal(resultWindow.contentEl.items.length, 0, 'a late response must not reopen a dismissed result');
console.log('WaveSign verification validation, timeout, and modal tests passed.');
