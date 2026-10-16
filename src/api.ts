import { requestUrl, type RequestUrlParam, type RequestUrlResponse } from 'obsidian';
import { parseVerificationResult, withVerificationTimeout } from './verification-result';

const API_BASE = 'https://wave-sign.com/api/v1';

type MultipartPart = { name: string; filename?: string; contentType?: string; bytes: Uint8Array };

function concat(parts: Uint8Array[]): ArrayBuffer {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output.buffer;
}

export function multipartBody(parts: MultipartPart[], boundary: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  for (const part of parts) {
    const disposition = part.filename
      ? `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename.replace(/["\r\n]/g, '_')}"\r\n`
      : `Content-Disposition: form-data; name="${part.name}"\r\n`;
    const contentType = part.contentType ? `Content-Type: ${part.contentType}\r\n` : '';
    chunks.push(encoder.encode(`--${boundary}\r\n${disposition}${contentType}\r\n`));
    chunks.push(part.bytes);
    chunks.push(encoder.encode('\r\n'));
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));
  return concat(chunks);
}

function errorMessage(status: number): string {
  if (status === 401) return 'Your WaveSign connection is missing, expired, or revoked. Connect again.';
  if (status === 403) return 'WaveSign did not allow this operation. Check your connection permissions.';
  if (status === 413) return 'This file is too large for WaveSign.';
  if (status === 429) return 'WaveSign is receiving too many requests. Please wait and try again.';
  if (status >= 500) return 'WaveSign is temporarily unavailable. Please try again later.';
  return `WaveSign request failed (${status}). Please check the files and try again.`;
}

function responseJson(response: RequestUrlResponse): unknown {
  try { return response.json; }
  catch { throw new Error('WaveSign returned an unreadable response. No result is available.'); }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export class WaveSignApi {
  constructor(private timeoutMs = 150_000) {}

  private async request(options: RequestUrlParam, verification = false): Promise<RequestUrlResponse> {
    // Never expose raw transport errors or server bodies, which may echo credentials.
    const pending = Promise.resolve().then(() => requestUrl(options)).catch(() => {
      throw new Error('Could not reach WaveSign. Check your internet connection and try again.');
    });
    return withVerificationTimeout(pending, this.timeoutMs, verification ? undefined
      : 'WaveSign request timed out. Server processing may still finish; wait before trying again.');
  }

  async startDevice() {
    const response = await this.request({
      url: `${API_BASE}/integrations/device/start`,
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify({ client_name: 'Obsidian', scopes: ['files:sign', 'files:verify'] }),
      throw: false,
    });
    if (response.status !== 200) throw new Error(errorMessage(response.status));
    const value = responseJson(response);
    if (!record(value) || !nonempty(value.device_code) || !nonempty(value.user_code)
      || !nonempty(value.verification_uri_complete)
      || typeof value.expires_in !== 'number' || !Number.isFinite(value.expires_in) || value.expires_in <= 0 || value.expires_in > 1800
      || typeof value.interval !== 'number' || !Number.isFinite(value.interval) || value.interval < 1 || value.interval > 60) {
      throw new Error('WaveSign returned an invalid connection request.');
    }
    const url = new URL(value.verification_uri_complete);
    if (url.origin !== 'https://wave-sign.com' || url.pathname !== '/connect/obsidian'
      || url.username || url.password || url.searchParams.get('user_code') !== value.user_code) {
      throw new Error('WaveSign returned an invalid approval address.');
    }
    return { device_code: value.device_code, user_code: value.user_code,
      verification_uri_complete: url.href, expires_in: value.expires_in, interval: value.interval };
  }

  async pollDevice(deviceCode: string) {
    const response = await this.request({
      url: `${API_BASE}/integrations/device/token`,
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify({ device_code: deviceCode }),
      throw: false,
    });
    if (response.status === 202 || response.status === 429) return null;
    if (response.status !== 200) throw new Error(errorMessage(response.status));
    const value = responseJson(response);
    if (!record(value) || !nonempty(value.access_token) || !nonempty(value.integration_id)
      || typeof value.expires_in !== 'number' || !Number.isFinite(value.expires_in) || value.expires_in <= 0
      || !Array.isArray(value.scopes) || !value.scopes.every(nonempty)
      || !value.scopes.includes('files:sign') || !value.scopes.includes('files:verify')) {
      throw new Error('WaveSign returned an invalid connection result.');
    }
    return { access_token: value.access_token, integration_id: value.integration_id,
      expires_in: value.expires_in, scopes: value.scopes as string[] };
  }

  async revoke(token: string): Promise<void> {
    const response = await this.request({
      url: `${API_BASE}/integrations/current`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      throw: false,
    });
    if (response.status !== 204 && response.status !== 401) {
      throw new Error(errorMessage(response.status));
    }
  }

  async sign(token: string, filename: string, contentType: string, file: ArrayBuffer, passphrase: string): Promise<ArrayBuffer> {
    const boundary = `wavesign-${crypto.randomUUID()}`;
    const body = multipartBody([
      { name: 'file', filename, contentType, bytes: new Uint8Array(file) },
      { name: 'key', bytes: new TextEncoder().encode(passphrase) },
    ], boundary);
    const response = await this.request({
      url: `${API_BASE}/signing/package/sign`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      throw: false,
    });
    if (response.status !== 200) throw new Error(errorMessage(response.status));
    return response.arrayBuffer;
  }

  async verify(
    token: string,
    filename: string,
    contentType: string,
    file: ArrayBuffer,
    signatureFilename: string,
    signature: ArrayBuffer,
    passphrase: string,
  ): Promise<{ is_valid: boolean; verdict: string }> {
    const boundary = `wavesign-${crypto.randomUUID()}`;
    const body = multipartBody([
      { name: 'file', filename, contentType, bytes: new Uint8Array(file) },
      { name: 'sig_file', filename: signatureFilename, contentType: 'application/json', bytes: new Uint8Array(signature) },
      { name: 'key', bytes: new TextEncoder().encode(passphrase) },
    ], boundary);
    const response = await this.request({
      url: `${API_BASE}/signing/package/verify`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      throw: false,
    }, true);
    if (response.status !== 200) throw new Error(errorMessage(response.status));
    return parseVerificationResult(responseJson(response));
  }
}
