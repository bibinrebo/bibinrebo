import crypto from 'crypto';

export const verifyGithubSignature = (rawBody: string, signature: string | null, secret: string): boolean => {
  if (!signature) return false;

  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = `sha256=${hash}`;

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};
