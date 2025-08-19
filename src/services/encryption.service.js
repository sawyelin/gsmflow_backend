import crypto from 'crypto';

class EncryptionService {
  constructor() {
    // Use the JWT_SECRET as the encryption key since it's already available in the environment
    this.algorithm = 'aes-256-cbc';
    // Ensure key is exactly 32 bytes for aes-256-cbc
    this.secretKey = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback_encryption_key_change_me').digest();
    // IV should be 16 bytes for aes-256-cbc
    this.ivLength = 16;
  }

  /**
   * Encrypt a string using AES-256-CBC
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text in format 'iv:encryptedData'
   */
  encrypt(text) {
    if (!text) return null;
    
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string using AES-256-CBC
   * @param {string} encryptedText - Text to decrypt in format 'iv:encryptedData'
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    // Check if the text is already encrypted (contains iv:encryptedData format)
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // If not encrypted, return as is
      return encryptedText;
    }
    
    try {
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      // If decryption fails, return the original text
      return encryptedText;
    }
  }

  /**
   * Simple hash function for non-sensitive data
   * @param {string} text - Text to hash
   * @returns {string} - Hashed text
   */
  hash(text) {
    if (!text) return null;
    
    try {
      return crypto.createHash('sha256').update(text).digest('hex');
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }
}

export default EncryptionService;
