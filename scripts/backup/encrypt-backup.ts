/**
 * Aurelia Backup Encryption Utility
 *
 * Provides safe, zero-dependency, local-only archive encryption for Aurelia backups.
 * Uses industry-standard AES-256-GCM authenticated encryption with scrypt key derivation.
 *
 * Security & Privacy Guarantees:
 *  - 100% local execution: NO network requests, NO automatic third-party cloud uploads.
 *  - Authenticated encryption (GCM): Detects any file tampering or corruption.
 *  - Salted key derivation (scrypt): Resists brute-force and dictionary attacks.
 *  - Preserves source backups: Never deletes or overwrites existing backup folders.
 *
 * Output:
 *  %USERPROFILE%\AureliaBackups\<TIMESTAMP>.enc
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { verifyBackup } from './verify-backup'

const MAGIC_HEADER = Buffer.from('AURELIA_ENC_V1', 'utf8') // 14 bytes
const SALT_LENGTH = 32
const IV_LENGTH = 12
const TAG_LENGTH = 16

export interface EncryptionResult {
  success: boolean
  sourceDir: string
  encryptedFilePath: string
  totalFilesEncrypted: number
  totalBytesPlaintext: number
  totalBytesEncrypted: number
  sha256: string
}

/**
 * Derives a 256-bit encryption key from a passphrase and random salt using scrypt.
 */
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32, { N: 16384, r: 8, p: 1 })
}

/**
 * Packs all files in a backup directory into an encrypted AES-256-GCM container.
 */
export function encryptBackupDirectory(
  sourceDir: string,
  passphrase: string,
  outputPath?: string
): EncryptionResult {
  if (!passphrase || passphrase.trim().length < 8) {
    throw new Error('Encryption passphrase must be at least 8 characters long.')
  }

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source backup directory does not exist: ${sourceDir}`)
  }

  // Pre-encryption check: Verify source directory integrity first
  console.log(`[Encrypt] Pre-flight verification of source directory...`)
  const check = verifyBackup(sourceDir)
  if (!check.success) {
    throw new Error(
      `Cannot encrypt corrupt backup! Verification failed with ${check.errors.length} errors.`
    )
  }

  // Gather all files recursively
  const fileEntries: Array<{ relPath: string; data: Buffer }> = []
  let totalBytesPlaintext = 0

  function scanDir(currentDir: string, baseDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath, baseDir)
      } else if (entry.isFile()) {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/')
        const data = fs.readFileSync(fullPath)
        totalBytesPlaintext += data.length
        fileEntries.push({ relPath, data })
      }
    }
  }

  scanDir(sourceDir, sourceDir)

  // Construct deterministic unencrypted payload
  const catalog = fileEntries.map((f) => ({
    path: f.relPath,
    size: f.data.length,
  }))

  const catalogBuf = Buffer.from(JSON.stringify(catalog), 'utf8')
  const catalogLengthBuf = Buffer.alloc(4)
  catalogLengthBuf.writeUInt32BE(catalogBuf.length, 0)

  // Combine [catalogLength: 4 bytes] [catalogJson] [all file buffers sequentially]
  const plaintextBuffers: Buffer[] = [catalogLengthBuf, catalogBuf]
  for (const f of fileEntries) {
    plaintextBuffers.push(f.data)
  }
  const fullPlaintext = Buffer.concat(plaintextBuffers)

  // Generate cryptographic salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(passphrase, salt)

  // Encrypt with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encryptedPayload = Buffer.concat([cipher.update(fullPlaintext), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Structure: [MAGIC_HEADER: 14B] [SALT: 32B] [IV: 12B] [TAG: 16B] [CIPHERTEXT]
  const finalEncryptedFile = Buffer.concat([MAGIC_HEADER, salt, iv, authTag, encryptedPayload])

  const destinationPath =
    outputPath ||
    path.join(
      path.dirname(sourceDir),
      `${path.basename(sourceDir)}.enc`
    )

  fs.writeFileSync(destinationPath, finalEncryptedFile)

  const sha256 = crypto.createHash('sha256').update(finalEncryptedFile).digest('hex')

  console.log(`==================================================================`)
  console.log(`[Backup Encryption Succeeded]`)
  console.log(` Source Archive:    ${sourceDir}`)
  console.log(` Encrypted File:    ${destinationPath}`)
  console.log(` Files Included:    ${fileEntries.length}`)
  console.log(` Plaintext Size:    ${(totalBytesPlaintext / 1024 / 1024).toFixed(2)} MB`)
  console.log(` Encrypted Size:    ${(finalEncryptedFile.length / 1024 / 1024).toFixed(2)} MB`)
  console.log(` SHA-256 (Archive): ${sha256}`)
  console.log(`==================================================================`)

  return {
    success: true,
    sourceDir,
    encryptedFilePath: destinationPath,
    totalFilesEncrypted: fileEntries.length,
    totalBytesPlaintext,
    totalBytesEncrypted: finalEncryptedFile.length,
    sha256,
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const dirIndex = args.indexOf('--dir')
  const passIndex = args.indexOf('--password')
  const outIndex = args.indexOf('--out')

  const targetDir =
    dirIndex !== -1
      ? args[dirIndex + 1]
      : (() => {
          const baseDir = path.join(os.homedir(), 'AureliaBackups')
          const entries = fs
            .readdirSync(baseDir, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort()
            .reverse()
          return path.join(baseDir, entries[0])
        })()

  const passphrase =
    (passIndex !== -1 ? args[passIndex + 1] : process.env.AURELIA_BACKUP_PASSPHRASE) || ''

  const outputPath = outIndex !== -1 ? args[outIndex + 1] : undefined

  if (!passphrase) {
    console.error('Error: Please provide a passphrase via --password <passphrase> or AURELIA_BACKUP_PASSPHRASE.')
    process.exit(1)
  }

  try {
    encryptBackupDirectory(targetDir, passphrase, outputPath)
    process.exit(0)
  } catch (err: any) {
    console.error('[ENCRYPTION ERROR]:', err.message || err)
    process.exit(1)
  }
}
