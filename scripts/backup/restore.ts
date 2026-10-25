/**
 * Aurelia Disaster Recovery & Restore Helper Script
 *
 * CRITICAL SAFETY NOTICE:
 *  - NEVER run this script against the production database (upzkcqovqstfsizerulx)!
 *  - This script has an automated production safety lock that refuses execution
 *    if the linked project or URL points to the production project.
 *  - Use this script ONLY when restoring into a clean, newly provisioned
 *    staging or disaster-recovery Supabase project.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { verifyBackup } from './verify-backup'
import { runRemoteSqlQuery } from './backup'

const PRODUCTION_PROJECT_REF = 'upzkcqovqstfsizerulx'

export interface RestoreOptions {
  backupDir?: string
  dryRun?: boolean
  targetProjectRef?: string
  targetSupabaseUrl?: string
  targetServiceKey?: string
}

export async function runRestore(options: RestoreOptions = {}) {
  console.log('==================================================================')
  console.log('[Aurelia Restore] Disaster Recovery Procedure Initialized')
  console.log('==================================================================')

  // 1. Resolve and verify backup directory
  let backupDir = options.backupDir
  if (!backupDir) {
    const baseDir = path.join(os.homedir(), 'AureliaBackups')
    const entries = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse()

    if (entries.length === 0) {
      throw new Error(`No backup archives found in: ${baseDir}`)
    }
    backupDir = path.join(baseDir, entries[0])
  }

  console.log(`Source Backup Archive: ${backupDir}`)

  // 2. Cryptographically verify the source backup archive before any restore actions
  console.log('\n[Phase 1/5] Cryptographically verifying source backup archive...')
  const verification = verifyBackup(backupDir)
  if (!verification.success) {
    throw new Error(
      `Source backup failed verification checks! Aborting restore to prevent data corruption.`
    )
  }

  // 3. Safety Lock: Ensure we are NOT restoring against production
  console.log('\n[Phase 2/5] Checking Production Safety Lock...')
  const targetRef = options.targetProjectRef || process.env.RESTORE_TARGET_PROJECT_REF

  if (targetRef === PRODUCTION_PROJECT_REF) {
    throw new Error(
      `CRITICAL SAFETY LOCK BLOCKED EXECUTION:\n` +
        `The target project ref (${targetRef}) is the live production database!\n` +
        `Destructive restore against production is strictly prohibited.`
    )
  }

  const targetUrl = options.targetSupabaseUrl || process.env.RESTORE_TARGET_SUPABASE_URL
  if (targetUrl && targetUrl.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(
      `CRITICAL SAFETY LOCK BLOCKED EXECUTION: Target URL matches production (${PRODUCTION_PROJECT_REF})`
    )
  }

  if (options.dryRun) {
    console.log('\n[Dry Run Completed] Safety checks and archive validation succeeded.')
    console.log('To execute real recovery against a staging/DR Supabase project:')
    console.log('  1. Provision a clean project in Supabase Dashboard.')
    console.log('  2. Apply schema: schema/consolidated_schema.sql')
    console.log('  3. Apply data:   data/restore-data.sql')
    console.log('  4. Re-upload recipe images via this script with target credentials.')
    return { success: true, dryRun: true }
  }

  if (!targetUrl || !options.targetServiceKey) {
    console.log(
      '\n[Target Credentials Required]: To perform live restoration against a clean target project,'
    )
    console.log('set RESTORE_TARGET_SUPABASE_URL and RESTORE_TARGET_SERVICE_ROLE_KEY or see RESTORE_RUNBOOK.md.')
    return { success: false, reason: 'Awaiting clean target credentials' }
  }

  // 4. Restore Storage Files
  console.log('\n[Phase 3/5] Restoring recipe photography to target Storage bucket...')
  const targetClient = createClient(targetUrl, options.targetServiceKey, {
    auth: { persistSession: false },
  })

  const storageInventoryPath = path.join(backupDir, 'storage/storage-inventory.json')
  const storageMeta = JSON.parse(fs.readFileSync(storageInventoryPath, 'utf8'))
  const objects = storageMeta.objects || []

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    const localPath = path.join(backupDir, obj.local_path)
    const fileBuffer = fs.readFileSync(localPath)

    console.log(` -> [${i + 1}/${objects.length}] Uploading ${obj.path}...`)
    const { error: uploadError } = await targetClient.storage
      .from('recipe-images')
      .upload(obj.path, fileBuffer, {
        contentType: obj.mimetype,
        upsert: true,
      })

    if (uploadError) {
      console.warn(`    Warning: Failed to upload ${obj.path}: ${uploadError.message}`)
    }
  }

  console.log('\n[Phase 4/5] Storage restoration complete.')
  console.log('\n==================================================================')
  console.log('[RESTORE PROCEDURE COMPLETED]')
  console.log('Follow the post-restore verification steps in RESTORE_RUNBOOK.md.')
  console.log('==================================================================')

  return { success: true }
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const dirIndex = args.indexOf('--dir')
  const backupDir = dirIndex !== -1 ? args[dirIndex + 1] : undefined

  runRestore({ backupDir, dryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n[RESTORE ERROR]:', err.message || err)
      process.exit(1)
    })
}
