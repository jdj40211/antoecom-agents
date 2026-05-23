interface StoredKey {
  provider: string
  encryptedKey: string
  keyHint: string
  isValid: boolean
  lastVerifiedAt: string
  verificationError: string | null
}

const devKeyStore = new Map<string, StoredKey>()

export function getDevKeys(): StoredKey[] {
  return Array.from(devKeyStore.values())
}

export function getDevKey(provider: string): StoredKey | undefined {
  return devKeyStore.get(provider)
}

export function setDevKey(key: StoredKey): void {
  devKeyStore.set(key.provider, key)
}

export function deleteDevKey(provider: string): boolean {
  return devKeyStore.delete(provider)
}
