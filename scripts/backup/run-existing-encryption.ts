/**
 * Operational Runner: Encrypt and Verify Existing 2026-10-25_14-50-25 Backup
 *
 * Requirements:
 *  1. Encrypt C:\Users\svish\AureliaBackups\2026-10-25_14-50-25 into .enc
 *  2. Preserve the original backup directory untouched.
 *  3. Decrypt into a temporary directory and verify SHA-256 checksums match.
 *  4. Write the key to a private file outside Git: %USERPROFILE%\AureliaBackups\2026-10-25_14-50-25.key
 *  5. Do NOT log or print the passphrase.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { encryptBackupDirectory } from './encrypt-backup'
import { decryptBackupContainer } from './decrypt-backup'
import { verifyBackup } from './verify-backup'

async function main() {
  const targetDir = 'C:\\Users\\svish\\AureliaBackups\\2026-10-25_14-50-25'
  const targetEncFile = 'C:\\Users\\svish\\AureliaBackups\\2026-10-25_14-50-25.enc'
  const keyFile = 'C:\\Users\\svish\\AureliaBackups\\2026-10-25_14-50-25.key'

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Target backup directory does not exist: ${targetDir}`)
  }

  // 1. Generate or load a cryptographically strong 256-bit passphrase
  let passphrase = ''
  if (fs.existsSync(keyFile)) {
    passphrase = fs.readFileSync(keyFile, 'utf8').trim()
  } else {
    // Generate a high-entropy 32-byte (256-bit) hexadecimal key
    passphrase = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(keyFile, passphrase + '\n', { mode: 0o600, encoding: 'utf8' })
  }

  console.log(`[Step 1/3] Encrypting ${targetDir}...`)
  console.log(`[Security Notice] Passphrase securely stored in: ${keyFile} (outside Git)`)

  const encResult = encryptBackupDirectory(targetDir, passphrase, targetEncFile)

  console.log(`\n[Step 2/3] Verifying original directory preservation...`)
  if (!fs.existsSync(targetDir)) {
    throw new Error(`CRITICAL ERROR: Original backup directory was deleted or moved!`)
  }
  const originalFiles = fs.readdirSync(targetDir)
  console.log(` -> Original backup directory is intact with ${originalFiles.length} root items.`)

  console.log(`\n[Step 3/3] Performing round-trip test decryption and checksum verification...`)
  const tempVerifyDir = path.join(
    os.tmpdir(),
    `aurelia_enc_verify_${Date.now()}_${Math.random().toString(36).substring(7)}`
  )

  try {
    const decResult = decryptBackupContainer(targetEncFile, passphrase, tempVerifyDir)

    // Full 7-phase verification
    const verification = verifyBackup(tempVerifyDir)
    if (!verification.success) {
      throw new Error(`Decrypted archive failed checksum verification!`)
    }

    console.log(`\n==================================================================`)
    console.log(`[OPERATIONAL SUCCESS: ENCRYPTION & DECRYPTION FULLY VERIFIED]`)
    console.log(` Original Archive:   ${targetDir} (Preserved)`)
    console.log(` Encrypted File:     ${targetEncFile} (${(encResult.totalBytesEncrypted / 1024 / 1024).toFixed(2)} MB)`)
    console.log(` Key File:           ${keyFile} (Passphrase NOT exposed in logs/git)`)
    console.log(` SHA-256 (Encrypted):${encResult.sha256}`)
    console.log(` Verified Files:     ${verification.totalFilesChecked}`)
    console.log(` Verified Records:   ${verification.totalRowsVerified}`)
    console.log(` Verified Images:    ${verification.storageFilesVerified}`)
    console.log(`==================================================================`)
  } finally {
    if (fs.existsSync(tempVerifyDir)) {
      fs.rmSync(tempVerifyDir, { recursive: true, force: true })
    }
  }
}

main().catch((err) => {
  console.error('[OPERATIONAL RUNNER FAILED]:', err.message || err)
  process.exit(1)
})
