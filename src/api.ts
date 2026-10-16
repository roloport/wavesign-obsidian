import { requestUrl } from 'obsidian';
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

function errorMessage(status: number, json: unknown): string {
  const detail = typeof json === 'object' && json !== null && 'detail' in json
    ? String((json as { detail: unknown }).detail)
    : '';
  if (status === 401) return 'Your WaveSign connection is missing, expired, or revoked. Connect again.';
  if (status === 413) return 'This file is too large for WaveSign.';
  if (status === 429) return 'WaveSign is receiving too many requests. Please wait and try again.';
  return detail || `WaveSign request failed (${status}).`;
}

export class WaveSignApi {
  async startDevice() {
    const response = await requestUrl({
      url: `${API_BASE}/integrations/device/start`,
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify({ client_name: 'Obsidian', scopes: ['files:sign', 'files:verify'] }),
      throw: false,
    });
    if (response.status !== 200) throw new Error(errorMessage(response.status, response.json));
    return response.json as {
      device_code: string;
      user_code: string;
      verification_uri_complete: string;
      expires_in: number;
      interval: number;
    };
  }

  async pollDevice(deviceCode: string) {
    const response = await requestUrl({
      url: `${API_BASE}/integrations/device/token`,
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify({ device_code: deviceCode }),
      throw: false,
    });
    if (response.status === 202 || response.status === 429) return null;
    if (response.status !== 200) throw new Error(errorMessage(response.status, response.json));
    return response.json as {
      access_token: string;
      integration_id: string;
      expires_in: number;
      scopes: string[];
    };
  }

  async revoke(token: string): Promise<void> {
    const response = await requestUrl({
      url: `${API_BASE}/integrations/current`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      throw: false,
    });
    if (response.status !== 204 && response.status !== 401) {
      throw new Error(errorMessage(response.status, response.json));
    }
  }

  async sign(token: string, filename: string, contentType: string, file: ArrayBuffer, passphrase: string): Promise<ArrayBuffer> {
    const boundary = `wavesign-${crypto.randomUUID()}`;
    const body = multipartBody([
      { name: 'file', filename, contentType, bytes: new Uint8Array(file) },
      { name: 'key', bytes: new TextEncoder().encode(passphrase) },
    ], boundary);
    const response = await requestUrl({
      url: `${API_BASE}/signing/package/sign`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      throw: false,
    });
    if (response.status !== 200) throw new Error(errorMessage(response.status, response.json));
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
    const response = await withVerificationTimeout(requestUrl({
      url: `${API_BASE}/signing/package/verify`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      throw: false,
    }));
    if (response.status !== 200) throw new Error(errorMessage(response.status, response.json));
    return parseVerificationResult(response.json);
  }
}
