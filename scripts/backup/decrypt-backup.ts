/**
 * Aurelia Backup Decryption Utility
 *
 * Decrypts and unpacks an AES-256-GCM encrypted Aurelia backup container (.enc).
 * Verifies cryptographic authentication tag before extracting files to guarantee
 * zero tampering.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { deriveKey } from './encrypt-backup'
import { verifyBackup } from './verify-backup'

const MAGIC_HEADER = Buffer.from('AURELIA_ENC_V1', 'utf8') // 14 bytes
const SALT_LENGTH = 32
const IV_LENGTH = 12
const TAG_LENGTH = 16

export interface DecryptionResult {
  success: boolean
  encryptedFile: string
  outputDir: string
  totalFilesExtracted: number
  totalBytesDecrypted: number
}

/**
 * Decrypts an encrypted container and extracts the files into outputDir.
 */
export function decryptBackupContainer(
  encryptedFilePath: string,
  passphrase: string,
  outputDir: string
): DecryptionResult {
  if (!fs.existsSync(encryptedFilePath)) {
    throw new Error(`Encrypted backup file not found: ${encryptedFilePath}`)
  }

  const raw = fs.readFileSync(encryptedFilePath)

  // Verify minimum size: Header + Salt + IV + Tag + minimum ciphertext
  const minLength = MAGIC_HEADER.length + SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 4
  if (raw.length < minLength) {
    throw new Error(`File is too small to be a valid Aurelia encrypted archive.`)
  }

  let offset = 0
  const header = raw.subarray(offset, offset + MAGIC_HEADER.length)
  offset += MAGIC_HEADER.length

  if (!header.equals(MAGIC_HEADER)) {
    throw new Error(`Invalid file header. Expected magic bytes: AURELIA_ENC_V1`)
  }

  const salt = raw.subarray(offset, offset + SALT_LENGTH)
  offset += SALT_LENGTH

  const iv = raw.subarray(offset, offset + IV_LENGTH)
  offset += IV_LENGTH

  const authTag = raw.subarray(offset, offset + TAG_LENGTH)
  offset += TAG_LENGTH

  const ciphertext = raw.subarray(offset)

  // Derive key and decrypt with authentication check
  const key = deriveKey(passphrase, salt)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let plaintext: Buffer
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch (err: any) {
    throw new Error(
      `Decryption failed! Incorrect passphrase or file corrupted/tampered: ${err.message}`
    )
  }

  // Parse catalog
  const catalogLength = plaintext.readUInt32BE(0)
  const catalogJson = plaintext.subarray(4, 4 + catalogLength).toString('utf8')
  const catalog: Array<{ path: string; size: number }> = JSON.parse(catalogJson)

  let fileOffset = 4 + catalogLength
  let totalBytesDecrypted = 0

  fs.mkdirSync(outputDir, { recursive: true })

  for (const item of catalog) {
    const fileData = plaintext.subarray(fileOffset, fileOffset + item.size)
    fileOffset += item.size
    totalBytesDecrypted += item.size

    const fullDest = path.join(outputDir, item.path)
    fs.mkdirSync(path.dirname(fullDest), { recursive: true })
    fs.writeFileSync(fullDest, fileData)
  }

  console.log(`==================================================================`)
  console.log(`[Backup Decryption Succeeded]`)
  console.log(` Encrypted Source:   ${encryptedFilePath}`)
  console.log(` Extracted Location: ${outputDir}`)
  console.log(` Files Extracted:    ${catalog.length}`)
  console.log(` Total Decrypted:    ${(totalBytesDecrypted / 1024 / 1024).toFixed(2)} MB`)
  console.log(`==================================================================`)

  // Run integrity verification on extracted files
  console.log(`[Verify] Validating extracted archive against manifest...`)
  const check = verifyBackup(outputDir)
  if (!check.success) {
    throw new Error(`Extracted backup failed post-decryption verification checks!`)
  }

  return {
    success: true,
    encryptedFile: encryptedFilePath,
    outputDir,
    totalFilesExtracted: catalog.length,
    totalBytesDecrypted,
  }
}

import { resolvePassphrase } from './passphrase-utils'

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const fileIndex = args.indexOf('--file')
  const outIndex = args.indexOf('--out')

  if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error(
      'Usage: npx tsx scripts/backup/decrypt-backup.ts --file <file.enc> [--password <passphrase> | --password-file <path> | --stdin] [--out <dir>]'
    )
    process.exit(1)
  }

  const encryptedFile = args[fileIndex + 1]
  const outputDir =
    outIndex !== -1
      ? args[outIndex + 1]
      : path.join(os.tmpdir(), `aurelia_restore_${Date.now()}`)

  resolvePassphrase(args, 'Enter backup passphrase to decrypt: ', encryptedFile)
    .then((passphrase) => {
      decryptBackupContainer(encryptedFile, passphrase, outputDir)
      process.exit(0)
    })
    .catch((err: any) => {
      console.error('[DECRYPTION ERROR]:', err.message || err)
      process.exit(1)
    })
}
