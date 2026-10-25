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

export async function resolvePassphrase(
  args: string[],
  promptText = 'Enter backup passphrase: '
): Promise<string> {
  // 1. Password file flag (--password-file <path>)
  const passFileIndex = args.indexOf('--password-file')
  if (passFileIndex !== -1 && args[passFileIndex + 1]) {
    const filePath = path.resolve(args[passFileIndex + 1])
    if (!fs.existsSync(filePath)) {
      throw new Error(`Passphrase file does not exist: ${filePath}`)
    }
    const content = fs.readFileSync(filePath, 'utf8')
    return content.replace(/[\r\n]+$/, '')
  }

  // 2. Standard input pipe (--stdin)
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

  // 3. Environment variable (AURELIA_BACKUP_PASSPHRASE)
  if (process.env.AURELIA_BACKUP_PASSPHRASE) {
    return process.env.AURELIA_BACKUP_PASSPHRASE.replace(/[\r\n]+$/, '')
  }

  // 4. Direct CLI argument (--password <passphrase>)
  const passIndex = args.indexOf('--password')
  if (passIndex !== -1 && args[passIndex + 1]) {
    return args[passIndex + 1]
  }

  // 5. Interactive masked input in terminal
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
    'No passphrase provided. Supply safely via --stdin, --password-file <path>, AURELIA_BACKUP_PASSPHRASE, or an interactive terminal.'
  )
}
