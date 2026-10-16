import { App, Modal, Setting } from 'obsidian';
import type { VerificationResult } from './verification-result';

/** Keeps the verdict visible until dismissed; stores no key, token, or file data. */
export class VerificationModal extends Modal {
  private closed = false;

  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    this.closed = false;
    this.setTitle('WaveSign verification');
    this.render('Verifying…', 'Waiting for WaveSign. No authenticity verdict is available yet.');
  }

  showResult(result: VerificationResult): void {
    this.render(result.is_valid ? 'Authentic' : 'Verification failed', result.verdict);
  }

  showError(message: string): void {
    this.render('Verification could not complete', message);
  }

  private render(heading: string, message: string): void {
    if (this.closed) return;
    this.contentEl.empty();
    this.contentEl.createEl('h3', { text: heading });
    this.contentEl.createEl('p', { text: message });
    new Setting(this.contentEl).addButton((button) => button
      .setButtonText('Close').onClick(() => this.close()));
  }

  onClose(): void {
    this.closed = true;
    this.contentEl.empty();
  }
}
