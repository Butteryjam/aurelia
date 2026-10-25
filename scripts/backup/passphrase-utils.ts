/**
 * Secure Passphrase Resolution Utilities for Aurelia Backups
 *
 * Provides safe passphrase input mechanisms that guarantee passphrases are
 * never logged, never exposed in shell process listings, and never stored in history:
 *  1. --stdin: Read from standard input stream (pipe/redirect).
 *  2. --password-file <path>: Read from a secure local credential file.
 *  3. AURELIA_BACKUP_PASSPHRASE: Read from process environment variable.
 *  4. Masked TTY interactive prompt: Terminal echo is suppressed/masked.
 *  5. --password <value>: Command-line argument (optional fallback).
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { spawnSync } from 'child_process'

const WIN_CRED_SCRIPT = path.resolve(__dirname, 'win-cred.ps1')

/**
 * Safely reads a credential from Windows Credential Manager by target name.
 * Returns null if not found or if running on non-Windows.
 */
export function readFromWinCred(target: string): string | null {
  if (process.platform !== 'win32' || !fs.existsSync(WIN_CRED_SCRIPT)) {
    return null
  }
  try {
    const res = spawnSync(
      'powershell.exe',
      ['-ExecutionPolicy', 'Bypass', '-File', WIN_CRED_SCRIPT, '-Action', 'Read', '-Target', target],
      { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
    )
    if (res.status === 0 && res.stdout) {
      const val = res.stdout.replace(/[\r\n]+$/, '')
      if (val.length > 0) return val
    }
  } catch {
    // Fall through
  }
  return null
}

/**
 * Safely decrypts a DPAPI-protected file for the current user.
 */
export function readFromDpapi(filePath: string): string | null {
  if (process.platform !== 'win32' || !fs.existsSync(WIN_CRED_SCRIPT) || !fs.existsSync(filePath)) {
    return null
  }
  try {
    const res = spawnSync(
      'powershell.exe',
      ['-ExecutionPolicy', 'Bypass', '-File', WIN_CRED_SCRIPT, '-Action', 'UnprotectFile', '-InputPath', filePath],
      { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
    )
    if (res.status === 0 && res.stdout) {
      const val = res.stdout.replace(/[\r\n]+$/, '')
      if (val.length > 0) return val
    }
  } catch {
    // Fall through
  }
  return null
}

export async function resolvePassphrase(
  args: string[],
  promptText = 'Enter backup passphrase: ',
  archiveOrDirHint?: string
): Promise<string> {
  // 1. Explicit Windows Credential Manager Target (--cred-target <target>)
  const credIndex = args.indexOf('--cred-target')
  if (credIndex !== -1 && args[credIndex + 1]) {
    const pass = readFromWinCred(args[credIndex + 1])
    if (pass) return pass
    throw new Error(`Credential target "${args[credIndex + 1]}" not found in Windows Credential Manager.`)
  }

  // 2. Explicit DPAPI File (--dpapi-file <path>)
  const dpapiIndex = args.indexOf('--dpapi-file')
  if (dpapiIndex !== -1 && args[dpapiIndex + 1]) {
    const pass = readFromDpapi(path.resolve(args[dpapiIndex + 1]))
    if (pass) return pass
    throw new Error(`Failed to decrypt DPAPI-protected file: ${args[dpapiIndex + 1]}`)
  }

  // 3. Password file flag (--password-file <path>)
  const passFileIndex = args.indexOf('--password-file')
  if (passFileIndex !== -1 && args[passFileIndex + 1]) {
    const filePath = path.resolve(args[passFileIndex + 1])
    if (!fs.existsSync(filePath)) {
      throw new Error(`Passphrase file does not exist: ${filePath}`)
    }
    // Auto-detect DPAPI encrypted file
    if (filePath.endsWith('.dpapi')) {
      const pass = readFromDpapi(filePath)
      if (pass) return pass
      throw new Error(`Failed to unprotect DPAPI key file: ${filePath}`)
    }
    const content = fs.readFileSync(filePath, 'utf8')
    return content.replace(/[\r\n]+$/, '')
  }

  // 4. Standard input pipe (--stdin)
  if (args.includes('--stdin')) {
    return new Promise<string>((resolve, reject) => {
      let data = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (chunk) => {
        data += chunk
      })
      process.stdin.on('end', () => {
        resolve(data.replace(/[\r\n]+$/, ''))
      })
      process.stdin.on('error', reject)
    })
  }

  // 5. Environment variable (AURELIA_BACKUP_PASSPHRASE)
  if (process.env.AURELIA_BACKUP_PASSPHRASE) {
    return process.env.AURELIA_BACKUP_PASSPHRASE.replace(/[\r\n]+$/, '')
  }

  // 6. Automatic Windows Credential lookup by archive or folder name
  const candidateHint =
    archiveOrDirHint ||
    (args.indexOf('--file') !== -1 ? args[args.indexOf('--file') + 1] : undefined) ||
    (args.indexOf('--dir') !== -1 ? args[args.indexOf('--dir') + 1] : undefined)

  if (candidateHint) {
    const baseName = path.basename(candidateHint).replace(/\.(enc|tar|zip|gz)$/i, '')
    const autoTarget = `AureliaBackup_${baseName}`
    const pass = readFromWinCred(autoTarget)
    if (pass) {
      console.log(`[Passphrase] Safely loaded passphrase from Windows Credential Manager (${autoTarget}).`)
      return pass
    }

    // Also check for adjacent .key.dpapi
    const candidateDpapi = path.join(path.dirname(path.resolve(candidateHint)), `${baseName}.key.dpapi`)
    if (fs.existsSync(candidateDpapi)) {
      const passFromDpapi = readFromDpapi(candidateDpapi)
      if (passFromDpapi) {
        console.log(`[Passphrase] Safely loaded passphrase from adjacent DPAPI key file (${path.basename(candidateDpapi)}).`)
        return passFromDpapi
      }
    }
  }

  // 7. Direct CLI argument (--password <passphrase>)
  const passIndex = args.indexOf('--password')
  if (passIndex !== -1 && args[passIndex + 1]) {
    return args[passIndex + 1]
  }

  // 8. Interactive masked input in terminal
  if (process.stdin.isTTY) {
    return new Promise<string>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      process.stdout.write(promptText)

      // In Node.js readline with TTY, mute output by overriding write
      const originalWrite = (rl as any)._writeToOutput
      ;(rl as any)._writeToOutput = function (stringToWrite: string) {
        if (stringToWrite.includes('\r') || stringToWrite.includes('\n')) {
          originalWrite.call(rl, stringToWrite)
        } else {
          originalWrite.call(rl, '*')
        }
      }

      rl.question('', (answer) => {
        rl.close()
        process.stdout.write('\n')
        resolve(answer.replace(/[\r\n]+$/, ''))
      })
    })
  }

  throw new Error(
    'No passphrase provided. Supply safely via Windows Credential Manager, --dpapi-file <path>, --stdin, --password-file <path>, AURELIA_BACKUP_PASSPHRASE, or an interactive terminal.'
  )
}
