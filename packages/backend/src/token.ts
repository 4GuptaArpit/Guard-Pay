import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'guardpay_cryptographic_secret_key_2026';

export interface TokenPayload {
  agentId: string;
  merchantDomain: string;
  maxAmount: number;
  currency: string;
  nonce: string;
}

export class DualKeyTokenizer {
  /**
   * Generates a short-lived (120 seconds) cryptographic session token
   * bound specifically to the approved merchant domain and max allowable amount.
   */
  static issueToken(payload: TokenPayload): string {
    return jwt.sign(payload, SECRET, {
      expiresIn: '120s', // 2-minute ephemeral execution window
      algorithm: 'HS256',
    });
  }

  /**
   * Validates and verifies that the transaction payload has not been tampered with
   */
  static verifyToken(
    token: string,
    expectedDomain: string,
    requestedAmount: number
  ): { valid: boolean; error?: string } {
    try {
      const decoded = jwt.verify(token, SECRET) as TokenPayload;

      if (!expectedDomain.toLowerCase().includes(decoded.merchantDomain.toLowerCase())) {
        return {
          valid: false,
          error: `Domain tampering detected! Token bound to '${decoded.merchantDomain}', but requested '${expectedDomain}'`,
        };
      }

      if (requestedAmount > decoded.maxAmount) {
        return {
          valid: false,
          error: `Amount tampering detected! Token cap is $${decoded.maxAmount}, but requested $${requestedAmount}`,
        };
      }

      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: `Invalid or expired token: ${err.message}` };
    }
  }
}
