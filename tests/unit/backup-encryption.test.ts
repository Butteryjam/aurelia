import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { encryptBackupDirectory } from '../../scripts/backup/encrypt-backup'
import { decryptBackupContainer } from '../../scripts/backup/decrypt-backup'

describe('Aurelia Backup Encryption & Decryption Suite', () => {
  const baseDir = path.join(os.homedir(), 'AureliaBackups')
  const backupFolders = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse()

  const sourceBackup = path.join(baseDir, backupFolders[0])
  const tempEncPath = path.join(os.tmpdir(), `test_aurelia_${Date.now()}.enc`)
  const tempDecDir = path.join(os.tmpdir(), `test_aurelia_dec_${Date.now()}`)
  const testPassphrase = 'AureliaCulinaryVault2026!SecureKey'

  it('encrypts verified backup directory into AES-256-GCM container', () => {
    const encResult = encryptBackupDirectory(sourceBackup, testPassphrase, tempEncPath)

    expect(encResult.success).toBe(true)
    expect(fs.existsSync(tempEncPath)).toBe(true)
    expect(encResult.totalFilesEncrypted).toBeGreaterThanOrEqual(38)
    expect(encResult.totalBytesEncrypted).toBeGreaterThan(0)
    expect(encResult.sha256).toHaveLength(64)
  })

  it('rejects decryption when provided with wrong passphrase', () => {
    expect(() => {
      decryptBackupContainer(tempEncPath, 'WrongPassword123!', tempDecDir)
    }).toThrow(/Decryption failed/i)
  })

  it('successfully decrypts, unpacks, and cryptographically verifies container with correct passphrase', () => {
    const decResult = decryptBackupContainer(tempEncPath, testPassphrase, tempDecDir)

    expect(decResult.success).toBe(true)
    expect(decResult.totalFilesExtracted).toBeGreaterThanOrEqual(38)
    expect(fs.existsSync(path.join(tempDecDir, 'manifest.json'))).toBe(true)
    expect(fs.existsSync(path.join(tempDecDir, 'data/recipes.json'))).toBe(true)
    expect(fs.existsSync(path.join(tempDecDir, 'schema/consolidated_schema.sql'))).toBe(true)
  })

  // Clean up temporary test files
  it('cleans up temporary encryption artifacts', () => {
    if (fs.existsSync(tempEncPath)) {
      fs.unlinkSync(tempEncPath)
    }
    if (fs.existsSync(tempDecDir)) {
      fs.rmSync(tempDecDir, { recursive: true, force: true })
    }
    expect(fs.existsSync(tempEncPath)).toBe(false)
    expect(fs.existsSync(tempDecDir)).toBe(false)
  })
})
