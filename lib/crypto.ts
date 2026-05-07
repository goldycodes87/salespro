import crypto from 'crypto'

const ALGO = 'aes-256-cbc'

function getKey(): Buffer {
  const keyHex = process.env.CALDAV_ENCRYPTION_KEY
  if (!keyHex) throw new Error('CALDAV_ENCRYPTION_KEY not set')
  return Buffer.from(keyHex, 'hex')
}

export function encryptCredentials(data: object): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptCredentials<T = unknown>(encoded: string): T {
  const key = getKey()
  const [ivHex, encHex] = encoded.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return JSON.parse(decrypted.toString('utf8')) as T
}
