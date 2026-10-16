export interface VerificationResult {
  is_valid: boolean;
  verdict: string;
}

export function parseVerificationResult(value: unknown): VerificationResult {
  if (typeof value !== 'object' || value === null
    || !('is_valid' in value) || typeof value.is_valid !== 'boolean'
    || !('verdict' in value) || typeof value.verdict !== 'string' || !value.verdict.trim()) {
    throw new Error('WaveSign returned an invalid verification result. No authenticity verdict is available.');
  }
  return { is_valid: value.is_valid, verdict: value.verdict };
}

export async function withVerificationTimeout<T>(request: PromiseLike<T>, timeoutMs = 150_000,
  message = 'Verification timed out. No verdict is available. Server processing may still finish; wait before trying again.'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
