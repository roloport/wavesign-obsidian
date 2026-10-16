import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { webcrypto } from 'node:crypto';

const encoder = new TextEncoder();
const png = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0);
const pdf = encoder.encode('%PDF-1.7\nsynthetic container fixture');
const json = encoder.encode('{"synthetic":true}');
const zip = (entries) => zipSync(entries).buffer;
const valid = zip({ 'signed.png': png, 'sig.json': json });
const notices = [];
class TFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').at(-1);
    this.extension = path.split('.').at(-1);
    this.stat = { size: 1 };
  }
}
let response;
const timers = [];
const obsidian = {
  Plugin: class { constructor(app) { this.app = app; } async saveData(value) { this.saved = value; } },
  Modal: class {}, TFile, TAbstractFile: class {}, App: class {}, Menu: class {},
  PluginSettingTab: class {}, Setting: class {}, Vault: class {},
  Notice: class { constructor(message) { notices.push(message); } },
  normalizePath: (path) => path,
  requestUrl: () => typeof response === 'function' ? response() : Promise.resolve(response),
};
async function load(entry) {
  const bundle = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', external: ['obsidian'], platform: 'browser' });
  const sandbox = {
    Error, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, URL, crypto: webcrypto, setTimeout, clearTimeout,
    window: { setTimeout(callback) { timers.push(callback); }, open() {} },
    module: { exports: {} }, require(name) { assert.equal(name, 'obsidian'); return obsidian; },
  };
  vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
  return sandbox.module.exports;
}
const { readSignedPackage, MAX_PACKAGE_BYTES } = await load('src/package.ts');
assert.deepEqual(readSignedPackage(valid, false).media, png);
assert.deepEqual(readSignedPackage(zip({ 'signed.pdf': pdf, 'sig.json': json }), true).media, pdf);
assert.deepEqual(readSignedPackage(zip({ 'signed.pdf': pdf, 'sig.json': encoder.encode('[{"synthetic":true}]') }), true).media, pdf);
for (const archive of [
  new ArrayBuffer(0), new ArrayBuffer(30),
  zip({ 'signed.png': png }),
  zip({ 'signed.pdf': pdf, 'sig.json': json }),
  zip({ '../signed.png': png, 'sig.json': json }),
  zip({ 'signed.png': png, 'sig.json': json, 'extra.txt': json }),
  zip({ 'signed.png': new Uint8Array(), 'sig.json': json }),
  zip({ 'signed.png': pdf, 'sig.json': json }),
  ...['[]', 'null', '{}', 'broken'].map((metadata) => zip({ 'signed.png': png, 'sig.json': encoder.encode(metadata) })),
]) assert.throws(() => readSignedPackage(archive, false), /invalid or oversized/);
// Forge declared uncompressed size without allocating a large payload.
const oversized = new Uint8Array(valid.slice(0));
const view = new DataView(oversized.buffer);
let directory = -1;
for (let i = 0; i < oversized.length - 4; i++) if (view.getUint32(i, true) === 0x02014b50) { directory = i; break; }
assert.ok(directory >= 0);
view.setUint32(directory + 24, MAX_PACKAGE_BYTES + 1, true);
assert.throws(() => readSignedPackage(oversized.buffer, false), /invalid or oversized/);
const duplicate = new Uint8Array(zip({ 'signed.png': png, 'sig.json': json, 'other.json': json }));
const duplicateView = new DataView(duplicate.buffer);
for (let i = 0; i < duplicate.length - 46; i++) {
  if (duplicateView.getUint32(i, true) === 0x02014b50
    && new TextDecoder().decode(duplicate.subarray(i + 46, i + 56)) === 'other.json') {
    duplicate.set(encoder.encode('signed.png'), i + 46);
  }
}
assert.throws(() => readSignedPackage(duplicate.buffer, false), /invalid or oversized/);

const WaveSignPlugin = (await load('src/main.ts')).default;
function host(fail = '') {
  let secret = 'synthetic-credential';
  const files = new Map([['嵌套 folder/sample.png', new TFile('嵌套 folder/sample.png')]]);
  let creates = 0, renames = 0;
  return {
    files,
    secretStorage: { getSecret() { return secret; }, setSecret(_id, value) { secret = value; } },
    vault: {
      getAbstractFileByPath: (path) => files.get(path),
      async createBinary(path) {
        creates++;
        if (fail === `create${creates}`) throw new Error('Synthetic write failure');
        if (files.has(path)) throw new Error('Collision');
        const file = new TFile(path); files.set(path, file); return file;
      },
      async rename(file, target) {
        renames++;
        if (fail === `rename${renames}` || (fail === 'cleanup' && renames === 2)) throw new Error('Synthetic rename failure');
        if (files.has(target)) throw new Error('Collision');
        files.delete(file.path); file.path = target; files.set(target, file);
      },
      async delete(file) {
        if (fail === 'cleanup') throw new Error('Synthetic delete failure');
        files.delete(file.path);
      },
      async readBinary() { return png.buffer; },
    },
  };
}
const input = new TFile('嵌套 folder/sample.png');
for (const step of ['create1', 'create2', 'rename1', 'rename2']) {
  const app = host(step), plugin = new WaveSignPlugin(app);
  await assert.rejects(plugin.writeSignedPackage(input, valid), /Synthetic/);
  assert.deepEqual([...app.files.keys()], [input.path], `${step} must remove all owned partial files`);
}
const cleanup = host('cleanup');
await assert.rejects(new WaveSignPlugin(cleanup).writeSignedPackage(input, valid), /cleanup was incomplete.*incomplete outputs/);
const collision = host();
const existing = new TFile('嵌套 folder/sample.wavesign.sig.json');
collision.files.set(existing.path, existing);
await new WaveSignPlugin(collision).writeSignedPackage(input, valid);
assert.equal(collision.files.get(existing.path), existing);
assert.ok(collision.files.has('嵌套 folder/sample-2.wavesigned.png'));
assert.ok(collision.files.has('嵌套 folder/sample-2.wavesign.sig.json'));
const malformedHost = host();
await assert.rejects(new WaveSignPlugin(malformedHost).writeSignedPackage(input, new ArrayBuffer(0)), /invalid/);
assert.equal(malformedHost.files.size, 1);
for (const cancel of ['confirmation', 'passphrase']) {
  const app = host(), plugin = new WaveSignPlugin(app);
  plugin.confirmUpload = async () => cancel !== 'confirmation';
  plugin.requestPassphrase = async () => null;
  plugin.api = new Proxy({}, { get() { throw new Error('Cancelled operation reached API'); } });
  await plugin.signFiles([input]);
  assert.equal(app.files.size, 1);
}
const mixedHost = host(), mixed = new WaveSignPlugin(mixedHost);
mixed.confirmUpload = async () => true;
mixed.requestPassphrase = async () => 'synthetic-operation-key';
let calls = 0;
mixed.api = { async sign() { calls++; if (calls === 1) throw new Error('Synthetic failure'); return valid; } };
await mixed.signFiles([input, new TFile('嵌套 folder/second.png')]);
assert.equal(calls, 2);
assert.ok(mixedHost.files.has('嵌套 folder/second.wavesigned.png'));
assert.ok(notices.some((message) => /Synthetic failure/.test(message)));

// Simulate disconnect while device token polling is in flight.
const raceHost = host(); raceHost.secretStorage.setSecret('', '');
const race = new WaveSignPlugin(raceHost);
let finishPoll, startedPoll, revoked = 0;
const polling = new Promise((resolve) => { startedPoll = resolve; });
race.api = {
  async startDevice() { return { verification_uri_complete: 'https://wave-sign.com/connect/obsidian', user_code: 'TEST', expires_in: 600, interval: 5 }; },
  pollDevice() { startedPoll(); return new Promise((resolve) => { finishPoll = resolve; }); },
  async revoke() { revoked++; },
};
const connecting = race.connect();
await Promise.resolve();
await race.connect(); // Must not start a second browser flow.
assert.ok(notices.some((message) => /already pending/.test(message)));
timers.shift()();
await polling;
await race.disconnect();
finishPoll({ access_token: 'synthetic-late-token', integration_id: 'synthetic-id' });
await connecting;
assert.equal(race.isConnected(), false);
assert.equal(revoked, 1, 'late approved token must be revoked, never saved');

const unloadHost = host(); unloadHost.secretStorage.setSecret('', '');
const unloading = new WaveSignPlugin(unloadHost);
let finishStart;
unloading.api = { startDevice() { return new Promise((resolve) => { finishStart = resolve; }); } };
const opening = unloading.connect();
unloading.onunload();
finishStart({ verification_uri_complete: 'https://wave-sign.com/connect/obsidian', user_code: 'TEST', expires_in: 600, interval: 5 });
await opening;
assert.equal(unloading.isConnected(), false, 'unloading cancels a pending connection');

const revokingHost = host(), revoking = new WaveSignPlugin(revokingHost);
let finishRevoke;
let startedRevoke;
const remoteRevocation = new Promise((resolve) => { startedRevoke = resolve; });
revoking.api = { revoke() { startedRevoke(); return new Promise((resolve) => { finishRevoke = resolve; }); } };
const disconnecting = revoking.disconnect();
assert.equal(revoking.isConnected(), false, 'disconnect must block new operations before its network request completes');
await remoteRevocation; finishRevoke(); await disconnecting;
const badDiskHost = host(), badDisk = new WaveSignPlugin(badDiskHost);
let revokedAfterDiskFailure = false;
badDisk.saveSettings = async () => { throw new Error('Synthetic settings storage failure'); };
badDisk.api = { async revoke() { revokedAfterDiskFailure = true; } };
await badDisk.disconnect();
assert.equal(badDisk.isConnected(), false);
assert.equal(revokedAfterDiskFailure, true, 'a settings write failure must not prevent remote revocation');

const { WaveSignApi } = await load('src/api.ts');
const api = new WaveSignApi(15);
const verify = () => api.verify('synthetic-credential', 'test.png', 'image/png', png.buffer, 'sig.json', json.buffer, 'synthetic-key');
for (const [status, message] of [[401, /expired/], [403, /permissions/], [413, /too large/], [429, /too many/], [502, /temporarily unavailable/], [422, /check the files/]]) {
  response = { status, get json() { throw new Error('Raw private body must not be read'); } };
  await assert.rejects(verify(), message);
}
response = () => Promise.reject(new Error('Raw transport credential must not be exposed'));
await assert.rejects(verify(), /Check your internet/);
response = () => new Promise(() => {});
await assert.rejects(verify(), /timed out.*No verdict/);
await assert.rejects(api.sign('synthetic', 'test.png', 'image/png', png.buffer, 'synthetic'), /timed out.*Server processing/);
response = { status: 200, get json() { throw new SyntaxError('HTML proxy page'); } };
await assert.rejects(verify(), /unreadable response/);
response = { status: 200, json: { is_valid: 'true', verdict: 'AUTHENTIC' } };
await assert.rejects(verify(), /invalid verification/);
for (const status of [202, 429]) { response = { status }; assert.equal(await api.pollDevice('synthetic'), null); }
response = { status: 200, json: { access_token: 'synthetic', integration_id: 'test', expires_in: 10, scopes: ['files:verify'] } };
await assert.rejects(api.pollDevice('synthetic'), /invalid connection result/);
const device = { device_code: 'synthetic', user_code: 'TEST-CODE', expires_in: 600, interval: 5,
  verification_uri_complete: 'https://wave-sign.com/connect/obsidian?user_code=TEST-CODE' };
response = { status: 200, json: device };
assert.equal((await api.startDevice()).user_code, device.user_code);
for (const address of ['https://example.com/connect/obsidian?user_code=TEST-CODE', 'http://wave-sign.com/connect/obsidian?user_code=TEST-CODE', 'https://wave-sign.com/connect/obsidian?user_code=WRONG']) {
  response = { status: 200, json: { ...device, verification_uri_complete: address } };
  await assert.rejects(api.startDevice(), /invalid approval address/);
}
console.log('WaveSign package validation, rollback, cancellation, connection race, and API failure tests passed.');
