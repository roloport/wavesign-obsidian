import {
  App,
  Menu,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
} from 'obsidian';
import { unzipSync } from 'fflate';
import { WaveSignApi } from './api';
import { ConfirmUploadModal, PassphraseModal } from './modals';
import {
  MAX_UPLOAD_BYTES,
  availableOutputPaths,
  contentTypeFor,
  isSupportedFile,
  signaturePathForSignedFile,
} from './utils';

const TOKEN_SECRET_ID = 'wavesign-obsidian-token';

interface WaveSignSettings {
  tokenSecretId: string;
  integrationId: string;
  connectedAt: string;
}

const DEFAULT_SETTINGS: WaveSignSettings = { tokenSecretId: TOKEN_SECRET_ID, integrationId: '', connectedAt: '' };

const sleep = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default class WaveSignPlugin extends Plugin {
  settings: WaveSignSettings = DEFAULT_SETTINGS;
  api = new WaveSignApi();

  async onload(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new WaveSignSettingTab(this.app, this));

    this.addCommand({ id: 'connect-account', name: 'Connect WaveSign account', callback: () => void this.connect() });
    this.addCommand({
      id: 'sign-selected-file',
      name: 'Sign selected image or PDF',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!isSupportedFile(file)) return false;
        if (!checking) void this.signFiles([file]);
        return true;
      },
    });
    this.addCommand({ id: 'sign-current-note-attachments', name: 'Sign attachments in current note', callback: () => void this.signCurrentNoteAttachments() });
    this.addCommand({
      id: 'verify-selected-file',
      name: 'Verify selected signed file',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !/\.wavesigned\.(png|pdf)$/i.test(file.name)) return false;
        if (!checking) void this.verifyFile(file);
        return true;
      },
    });
    this.addCommand({ id: 'disconnect-account', name: 'Disconnect WaveSign account', callback: () => void this.disconnect() });

    this.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
      if (!(file instanceof TFile)) return;
      if (isSupportedFile(file)) {
        menu.addItem((item) => item.setTitle('Sign with WaveSign').setIcon('shield-check').onClick(() => void this.signFiles([file])));
      }
      if (/\.wavesigned\.(png|pdf)$/i.test(file.name)) {
        menu.addItem((item) => item.setTitle('Verify with WaveSign').setIcon('badge-check').onClick(() => void this.verifyFile(file)));
      }
    }));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private token(): string | null {
    return this.app.secretStorage.getSecret(this.settings.tokenSecretId);
  }

  isConnected(): boolean {
    return Boolean(this.token());
  }

  async connect(): Promise<void> {
    if (this.token()) {
      new Notice('WaveSign is already connected. Disconnect first to use another account.');
      return;
    }
    try {
      const device = await this.api.startDevice();
      window.open(device.verification_uri_complete, '_blank', 'noopener,noreferrer');
      new Notice(`Approve code ${device.user_code} in your browser.`, 10_000);
      const deadline = Date.now() + device.expires_in * 1000;
      while (Date.now() < deadline) {
        await sleep(Math.max(device.interval, 5) * 1000);
        const result = await this.api.pollDevice(device.device_code);
        if (!result) continue;
        this.app.secretStorage.setSecret(TOKEN_SECRET_ID, result.access_token);
        this.settings = {
          tokenSecretId: TOKEN_SECRET_ID,
          integrationId: result.integration_id,
          connectedAt: new Date().toISOString(),
        };
        await this.saveSettings();
        new Notice('WaveSign account connected.');
        return;
      }
      throw new Error('The connection request expired. Start again.');
    } catch (error) {
      new Notice(error instanceof Error ? error.message : 'Could not connect WaveSign.');
    }
  }

  async disconnect(): Promise<void> {
    const token = this.token();
    try {
      if (token) await this.api.revoke(token);
    } catch (error) {
      new Notice(error instanceof Error ? `${error.message} The local token will still be removed.` : 'Server revocation failed; removing the local token.');
    } finally {
      this.app.secretStorage.setSecret(this.settings.tokenSecretId, '');
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
      new Notice('WaveSign disconnected.');
    }
  }

  private requireToken(): string | null {
    const token = this.token();
    if (!token) {
      new Notice('Connect your WaveSign account first.');
      return null;
    }
    return token;
  }

  private requestPassphrase(): Promise<string | null> {
    return new Promise((resolve) => new PassphraseModal(this.app, resolve).open());
  }

  private confirmUpload(files: TFile[]): Promise<boolean> {
    return new Promise((resolve) => new ConfirmUploadModal(this.app, files, resolve).open());
  }

  async signFiles(files: TFile[]): Promise<void> {
    const token = this.requireToken();
    if (!token || files.length === 0) return;
    const eligible = files.filter((file) => {
      if (!isSupportedFile(file)) return false;
      if (file.stat.size > MAX_UPLOAD_BYTES) {
        new Notice(`Skipped ${file.path}: larger than 25 MiB.`);
        return false;
      }
      return true;
    });
    if (!eligible.length || !(await this.confirmUpload(eligible))) return;
    const passphrase = await this.requestPassphrase();
    if (!passphrase) return;

    let completed = 0;
    const failures: string[] = [];
    for (const file of eligible) {
      try {
        const source = await this.app.vault.readBinary(file);
        const archive = await this.api.sign(token, file.name, contentTypeFor(file), source, passphrase);
        await this.writeSignedPackage(file, archive);
        completed += 1;
      } catch (error) {
        failures.push(`${file.name}: ${error instanceof Error ? error.message : 'failed'}`);
      }
    }
    if (completed) new Notice(`WaveSign created ${completed} authenticated package${completed === 1 ? '' : 's'}.`);
    if (failures.length) new Notice(`WaveSign failures:\n${failures.join('\n')}`, 12_000);
  }

  private async writeSignedPackage(input: TFile, archive: ArrayBuffer): Promise<void> {
    const entries = unzipSync(new Uint8Array(archive));
    const names = Object.keys(entries);
    if (names.length > 4) throw new Error('The server returned an unexpected package.');
    const mediaName = names.find((name) => /(^|\/)signed\.(png|pdf)$/i.test(name));
    const signatureName = names.find((name) => /(^|\/)sig\.json$/i.test(name));
    if (!mediaName || !signatureName) throw new Error('The server package is missing signed media or sig.json.');
    const media = entries[mediaName];
    const signature = entries[signatureName];
    if (!media.length || !signature.length || media.length + signature.length > 100 * 1024 * 1024) {
      throw new Error('The server returned an invalid or oversized package.');
    }

    const paths = availableOutputPaths(this.app.vault, input.path);
    const suffix = crypto.randomUUID();
    const temporaryMedia = `${paths.media}.wavesign-tmp-${suffix}`;
    const temporarySignature = `${paths.signature}.wavesign-tmp-${suffix}`;
    const created: string[] = [];
    try {
      await this.app.vault.createBinary(temporaryMedia, media.buffer.slice(media.byteOffset, media.byteOffset + media.byteLength));
      created.push(temporaryMedia);
      await this.app.vault.createBinary(temporarySignature, signature.buffer.slice(signature.byteOffset, signature.byteOffset + signature.byteLength));
      created.push(temporarySignature);
      const mediaFile = this.app.vault.getAbstractFileByPath(temporaryMedia);
      const signatureFile = this.app.vault.getAbstractFileByPath(temporarySignature);
      if (!mediaFile || !signatureFile) throw new Error('Could not stage the signed package.');
      await this.app.vault.rename(signatureFile, paths.signature);
      created.push(paths.signature);
      await this.app.vault.rename(mediaFile, paths.media);
      created.push(paths.media);
    } catch (error) {
      for (const path of created.reverse()) {
        const artifact = this.app.vault.getAbstractFileByPath(path);
        if (artifact) await this.app.vault.delete(artifact).catch(() => undefined);
      }
      throw error;
    }
  }

  async signCurrentNoteAttachments(): Promise<void> {
    const note = this.app.workspace.getActiveFile();
    if (!note || note.extension.toLowerCase() !== 'md') {
      new Notice('Open a Markdown note first.');
      return;
    }
    const resolved = this.app.metadataCache.resolvedLinks[note.path] || {};
    const files = Object.keys(resolved)
      .map((path) => this.app.vault.getAbstractFileByPath(path))
      .filter((file): file is TFile => file instanceof TFile && isSupportedFile(file));
    const unique = Array.from(new Map(files.map((file) => [file.path, file])).values());
    if (!unique.length) {
      new Notice('No eligible local image or PDF attachments were found in this note.');
      return;
    }
    await this.signFiles(unique);
  }

  async verifyFile(file: TFile): Promise<void> {
    const token = this.requireToken();
    if (!token) return;
    const signaturePath = signaturePathForSignedFile(this.app.vault, file.path);
    if (!signaturePath) {
      new Notice('Matching .wavesign.sig.json metadata was not found beside this file.');
      return;
    }
    const signatureFile = this.app.vault.getAbstractFileByPath(signaturePath);
    if (!(signatureFile instanceof TFile)) return;
    if (!(await this.confirmUpload([file, signatureFile]))) return;
    const passphrase = await this.requestPassphrase();
    if (!passphrase) return;
    try {
      const result = await this.api.verify(
        token,
        file.name,
        contentTypeFor(file),
        await this.app.vault.readBinary(file),
        signatureFile.name,
        await this.app.vault.readBinary(signatureFile),
        passphrase,
      );
      new Notice(result.is_valid ? `Authentic: ${result.verdict}` : `Verification failed: ${result.verdict}`, 10_000);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : 'Verification failed.');
    }
  }
}

class WaveSignSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: WaveSignPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl).setName('WaveSign account').setHeading();
    const connected = this.plugin.isConnected();
    new Setting(this.containerEl)
      .setName(connected ? 'Connected' : 'Not connected')
      .setDesc(connected ? 'The scoped token is stored in Obsidian SecretStorage on this device.' : 'Connect through your browser using a one-time approval code.')
      .addButton((button) => {
        button.setButtonText(connected ? 'Disconnect' : 'Connect');
        if (connected) button.setWarning();
        button.onClick(async () => {
          if (connected) await this.plugin.disconnect(); else await this.plugin.connect();
          this.display();
        });
      });
    this.containerEl.createEl('div', {
      cls: 'wavesign-disclosure',
      text: 'Files and passphrases selected for an operation are transmitted over HTTPS and processed by WaveSign. The plugin does not store passphrases and has no client-side telemetry.',
    });
    this.containerEl.createEl('p').appendText('Verification requires the signed media, matching sig.json, and the same passphrase. Losing sig.json prevents verification.');
    const links = this.containerEl.createEl('p');
    links.createEl('a', { text: 'Privacy policy', href: 'https://wave-sign.com/privacy' });
    links.appendText(' · ');
    links.createEl('a', { text: 'Service terms', href: 'https://wave-sign.com/terms' });
  }
}
