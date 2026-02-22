import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

/**
 * Gets the encryption key from environment variable.
 * Must be a 64-character hex string (32 bytes).
 */
const getEncryptionKey = (): Buffer => {
    const keyString = process.env.VAULT_ENCRYPTION_KEY
    if (!keyString) {
        throw new Error('VAULT_ENCRYPTION_KEY is not set in environment variables.')
    }
    const key = Buffer.from(keyString, 'hex')
    if (key.length !== 32) {
        throw new Error('VAULT_ENCRYPTION_KEY must be a 32-byte (64-character) hex string.')
    }
    return key
}

/**
 * Encrypts a plain text string.
 * @param text The plain text to encrypt.
 * @returns The encrypted string (format: iv:authTag:encryptedText).
 */
export const encrypt = (text: string): string => {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag().toString('hex')
    
    // We store the IV, Auth Tag, and the Encrypted Text separated by colons
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypts an encrypted string.
 * @param encryptedText The formatted encrypted string (iv:authTag:encryptedText).
 * @returns The decrypted plain text.
 */
export const decrypt = (encryptedText: string): string => {
    const key = getEncryptionKey()
    const parts = encryptedText.split(':')
    
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format.')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const text = parts[2]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(text, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
}
