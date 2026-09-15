import { App, Modal, Setting, TFile } from 'obsidian';

export class PassphraseModal extends Modal {
  private resolve: (value: string | null) => void;
  private value = '';

  constructor(app: App, resolve: (value: string | null) => void) {
    super(app);
    this.resolve = resolve;
  }

  onOpen(): void {
    this.setTitle('WaveSign passphrase');
    this.contentEl.createEl('p', { text: 'Enter the passphrase for this operation. The plugin will not store it.' });
    new Setting(this.contentEl).setName('Passphrase').addText((text) => {
      text.inputEl.type = 'password';
      text.inputEl.autocomplete = 'off';
      text.onChange((value) => { this.value = value; });
      window.setTimeout(() => text.inputEl.focus(), 0);
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()))
      .addButton((button) => button.setButtonText('Continue').setCta().onClick(() => {
        if (!this.value.trim()) return;
        const value = this.value;
        this.value = '';
        this.resolve(value);
        this.resolve = () => undefined;
        this.close();
      }));
  }

  onClose(): void {
    this.value = '';
    this.contentEl.empty();
    this.resolve(null);
    this.resolve = () => undefined;
  }
}

export class ConfirmUploadModal extends Modal {
  private resolve: (value: boolean) => void;
  private files: TFile[];

  constructor(app: App, files: TFile[], resolve: (value: boolean) => void) {
    super(app);
    this.files = files;
    this.resolve = resolve;
  }

  onOpen(): void {
    this.setTitle(`Send ${this.files.length} file${this.files.length === 1 ? '' : 's'} to WaveSign?`);
    const list = this.contentEl.createEl('ul', { cls: 'wavesign-file-list' });
    for (const file of this.files) list.createEl('li', { text: file.path });
    this.contentEl.createEl('div', {
      cls: 'wavesign-disclosure',
      text: 'Selected files and the operation passphrase are sent over HTTPS and processed on WaveSign servers. Signed images return as PNG. Signed PDFs become image-PDFs and lose searchable text, forms, annotations, and original PDF structure.',
    });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()))
      .addButton((button) => button.setButtonText('Continue').setCta().onClick(() => {
        this.resolve(true);
        this.resolve = () => undefined;
        this.close();
      }));
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolve(false);
    this.resolve = () => undefined;
  }
}
