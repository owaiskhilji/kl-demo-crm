import crypto from 'crypto';

/**
 * Validates the X-Hub-Signature-256 header sent by Meta webhooks.
 * This ensures the payload actually came from Meta and hasn't been tampered with.
 * 
 * @param payload The raw string body of the HTTP request
 * @param signatureHeader The value of the X-Hub-Signature-256 header
 * @returns boolean indicating if the signature is valid
 */


export function verifyWebhookSignature(payload: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !process.env.META_APP_SECRET) {
    return false;
  }

  try {
    // Signature looks like: sha256=abcdef123456...
    const signature = signatureHeader.replace('sha256=', '');
    
    // Generate HMAC-SHA256 from the raw payload using our App Secret
    const expectedSignature = crypto
      .createHmac('sha256', process.env.META_APP_SECRET)
      .update(payload)
      .digest('hex');

    // Convert both to buffers for a constant-time comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error("[verifyWebhookSignature] Error verifying signature:", error);
    return false;
  }
}
