import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
// Estándar para AES-GCM (antes eran 16). decryptApiKey no depende de esta
// constante: el IV se lee del hex ya guardado en cada ciphertext, con el
// largo que tenía en el momento de cifrar. Por eso este cambio es compatible
// hacia atrás: las keys cifradas antes, con IV de 16 bytes, siguen
// descifrando bien; solo las nuevas usan 12.
const IV_LENGTH = 12
const ENCRYPTION_SECRET_PATTERN = /^[0-9a-f]{64}$/i

function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET
  if (!secret || !ENCRYPTION_SECRET_PATTERN.test(secret)) {
    throw new Error(
      'API_KEY_ENCRYPTION_SECRET debe ser una cadena hexadecimal de exactamente 64 caracteres (0-9, a-f).'
    )
  }
  return Buffer.from(secret, 'hex')
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey()
  const [ivHex, tagHex, encrypted] = ciphertext.split(':')

  if (!ivHex || !tagHex || !encrypted) {
    throw new Error('Invalid ciphertext format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function getKeyHint(key: string): string {
  if (key.length <= 8) return '****'
  return `...${key.slice(-6)}`
}
