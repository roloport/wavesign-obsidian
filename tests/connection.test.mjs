import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const notices = [];
class Plugin {
  constructor(app) { this.app = app; }
  async saveData(value) { this.savedSettings = value; }
}
class Modal {}
class TFile {}
const obsidian = {
  Plugin, Modal, TFile, TAbstractFile: class {}, App: class {}, Menu: class {},
  PluginSettingTab: class {}, Setting: class {}, Vault: class {},
  Notice: class { constructor(message) { notices.push(message); } },
  normalizePath: (path) => path,
  requestUrl() { throw new Error('Unexpected network request in a disconnected operation'); },
};
const bundle = await build({ entryPoints: ['src/main.ts'], bundle: true, write: false, format: 'cjs', external: ['obsidian'], platform: 'browser' });
const sandbox = { Error, module: { exports: {} }, require(name) { assert.equal(name, 'obsidian'); return obsidian; } };
vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
const WaveSignPlugin = sandbox.module.exports.default;

function appWithSecret(initial) {
  let secret = initial;
  const cleared = [];
  return {
    cleared,
    secretStorage: {
      getSecret() { return secret; },
      setSecret(id, value) { cleared.push([id, value]); secret = value; },
    },
  };
}

const disconnectedApp = appWithSecret(null);
const disconnected = new WaveSignPlugin(disconnectedApp);
disconnected.api = new Proxy({}, { get() { throw new Error('Disconnected operation reached the API'); } });
await disconnected.signFiles([{ path: 'synthetic.png' }]);
await disconnected.verifyFile({ path: 'synthetic.wavesigned.png' });
assert.deepEqual(notices.splice(0), ['Connect your WaveSign account first.', 'Connect your WaveSign account first.']);
assert.equal(disconnected.isConnected(), false);

const connectedApp = appWithSecret('synthetic-test-credential');
const connected = new WaveSignPlugin(connectedApp);
let revocations = 0;
connected.api = { async revoke(token) { assert.equal(token, 'synthetic-test-credential'); revocations += 1; } };
await connected.disconnect();
assert.equal(revocations, 1);
assert.equal(connected.isConnected(), false);
assert.deepEqual(connectedApp.cleared, [['wavesign-obsidian-token', '']]);
assert.equal(connected.savedSettings.integrationId, '');
assert.equal(connected.savedSettings.connectedAt, '');

const offlineApp = appWithSecret('synthetic-test-credential');
const offline = new WaveSignPlugin(offlineApp);
offline.api = { async revoke() { throw new Error('Offline'); } };
await offline.disconnect();
assert.equal(offline.isConnected(), false, 'a revocation failure must still remove the local credential');
assert.equal(offline.savedSettings.integrationId, '');
assert.ok(notices.some((message) => /local token will still be removed/.test(message)));
console.log('WaveSign disconnected-operation and credential-cleanup tests passed.');
