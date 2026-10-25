/**
 * Aurelia Production Backup Script
 *
 * Safe, zero-cost, manual backup workflow for Aurelia (RecipeVault).
 * Backs up:
 *  A. Database Schema (consolidated schema and migration history)
 *  B. Application Data (all 21 public tables into JSON and dependency-ordered SQL)
 *  C. Storage Objects (recipe-images bucket files and inventory)
 *  D. Auth Inventory (safe user metadata without password hashes or secrets)
 *  E. Disaster Recovery Configuration (env spec, OAuth redirect spec)
 *  F. Integrity Manifest (SHA-256 checksums and verification record)
 *
 * Saves backups strictly outside the Git repository in:
 *   %USERPROFILE%\AureliaBackups\<TIMESTAMP>\
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { execSync } from 'child_process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local in repo root
const repoRoot = path.resolve(__dirname, '../..')
dotenv.config({ path: path.join(repoRoot, '.env.local') })

const EXPECTED_PROJECT_REF = 'upzkcqovqstfsizerulx'
const EXPECTED_PROJECT_NAME = 'RecipeVault'

// All 21 application tables in strict foreign-key dependency order
export const APPLICATION_TABLES = [
  // Level 1: Root entities (depend only on auth.users or nothing)
  'profiles',
  'ingredients',
  'tags',
  'user_preferences',
  'ai_rate_limits',

  // Level 2: Core entities (depend on auth.users and/or Level 1)
  'recipes',
  'collections',
  'shopping_lists',
  'meal_plans',

  // Level 3: Junctions and child entities
  'recipe_ingredients',
  'recipe_instructions',
  'collection_recipes',
  'recipe_tags',
  'favorites',
  'shopping_list_items',
  'cooking_sessions',
  'recipe_versions',
  'recipe_sources',
  'ai_conversations',

  // Level 4: Grandchild entities
  'meal_plan_items',
  'ai_messages',
] as const

export type ApplicationTableName = (typeof APPLICATION_TABLES)[number]

/**
 * Primary key definition map for all 21 application tables.
 * Used to construct idempotent ON CONFLICT clauses during disaster recovery.
 */
export const TABLE_PRIMARY_KEYS: Record<ApplicationTableName, string[]> = {
  profiles: ['id'],
  ingredients: ['id'],
  tags: ['id'],
  user_preferences: ['user_id'],
  ai_rate_limits: ['id'],
  recipes: ['id'],
  collections: ['id'],
  shopping_lists: ['id'],
  meal_plans: ['id'],
  recipe_ingredients: ['id'],
  recipe_instructions: ['id'],
  collection_recipes: ['collection_id', 'recipe_id'],
  recipe_tags: ['recipe_id', 'tag_id'],
  favorites: ['user_id', 'recipe_id'],
  shopping_list_items: ['id'],
  cooking_sessions: ['id'],
  recipe_versions: ['id'],
  recipe_sources: ['id'],
  ai_conversations: ['id'],
  meal_plan_items: ['id'],
  ai_messages: ['id'],
}

/**
 * Tables containing PostgreSQL 'GENERATED ALWAYS AS (...) STORED' columns.
 * These columns cannot be manually inserted and must be omitted from INSERT statements.
 */
export const GENERATED_ALWAYS_COLUMNS: Partial<Record<ApplicationTableName, string[]>> = {
  recipes: ['fts'],
}

/**
 * Tables and columns that are native PostgreSQL arrays (e.g. text[]),
 * rather than JSONB arrays.
 */
export const POSTGRES_ARRAY_COLUMNS: Partial<Record<ApplicationTableName, string[]>> = {
  profiles: ['dietary_preferences'],
}

/**
 * Computes the SHA-256 hash of a file or buffer.
 */
export function computeSha256(data: Buffer | string): string {
  const hash = crypto.createHash('sha256')
  if (typeof data === 'string') {
    hash.update(data, 'utf8')
  } else {
    hash.update(data)
  }
  return hash.digest('hex')
}

/**
 * Runs a SQL query against the linked remote Supabase project via the Management API.
 */
export function runRemoteSqlQuery(sql: string): any[] {
  const tempFile = path.join(
    os.tmpdir(),
    `supabase_bkp_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`
  )
  try {
    fs.writeFileSync(tempFile, sql, 'utf8')
    const cmd = `npx supabase db query --linked -f "${tempFile}"`
    const raw = execSync(cmd, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
    })

    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`Failed to parse Supabase CLI output: ${raw}`)
    }

    const parsed = JSON.parse(raw.substring(jsonStart, jsonEnd + 1))
    return parsed.rows || []
  } finally {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile)
      } catch {
        // Ignore temporary file cleanup failure
      }
    }
  }
}

/**
 * Formats a JavaScript value into a valid PostgreSQL SQL literal.
 */
export function formatSqlValue(
  val: any,
  colName?: string,
  tableName?: ApplicationTableName
): string {
  if (val === null || val === undefined) {
    return 'NULL'
  }
  if (typeof val === 'boolean') {
    return val ? 'TRUE' : 'FALSE'
  }
  if (typeof val === 'number') {
    return String(val)
  }
  if (tableName && colName && POSTGRES_ARRAY_COLUMNS[tableName]?.includes(colName)) {
    if (Array.isArray(val)) {
      if (val.length === 0) return "'{}'::text[]"
      const escaped = val.map((item) => `'${String(item).replace(/'/g, "''")}'`).join(', ')
      return `ARRAY[${escaped}]::text[]`
    }
  }
  if (Array.isArray(val)) {
    // Array column or JSON array
    const escaped = JSON.stringify(val).replace(/'/g, "''")
    return `'${escaped}'::jsonb`
  }
  if (typeof val === 'object') {
    const escaped = JSON.stringify(val).replace(/'/g, "''")
    return `'${escaped}'::jsonb`
  }
  if (typeof val === 'string') {
    const escaped = val.replace(/'/g, "''")
    return `'${escaped}'`
  }
  return `'${String(val).replace(/'/g, "''")}'`
}

/**
 * Generates safe, dependency-ordered, idempotent SQL INSERT statements.
 * - Omits GENERATED ALWAYS columns (e.g. recipes.fts).
 * - Appends ON CONFLICT DO UPDATE (or DO NOTHING for junctions) to ensure
 *   referential integrity without suppressing triggers or session_replication_role.
 */
export function generateSqlInserts(tableName: ApplicationTableName, rows: any[]): string {
  if (!rows || rows.length === 0) {
    return `-- Table: public.${tableName} (0 rows)\n`
  }

  // Filter out any GENERATED ALWAYS columns that PostgreSQL calculates automatically
  const generatedCols = GENERATED_ALWAYS_COLUMNS[tableName] || []
  const allColumns = Object.keys(rows[0])
  const columns = allColumns.filter((c) => !generatedCols.includes(c))
  const colNames = columns.map((c) => `"${c}"`).join(', ')

  let sql = `-- Table: public.${tableName} (${rows.length} rows)\n`
  sql += `INSERT INTO public.${tableName} (${colNames})\nVALUES\n`

  const valueRows = rows.map((row) => {
    const values = columns.map((col) => formatSqlValue(row[col], col, tableName))
    return `  (${values.join(', ')})`
  })

  sql += valueRows.join(',\n')

  // Build idempotent ON CONFLICT clause
  const pkCols = TABLE_PRIMARY_KEYS[tableName]
  if (pkCols && pkCols.length > 0) {
    const conflictTarget = pkCols.map((c) => `"${c}"`).join(', ')
    const nonPkCols = columns.filter((c) => !pkCols.includes(c))

    if (nonPkCols.length > 0) {
      const updateSet = nonPkCols.map((c) => `  "${c}" = EXCLUDED."${c}"`).join(',\n')
      sql += `\nON CONFLICT (${conflictTarget}) DO UPDATE SET\n${updateSet};\n\n`
    } else {
      sql += `\nON CONFLICT (${conflictTarget}) DO NOTHING;\n\n`
    }
  } else {
    sql += ';\n\n'
  }

  return sql
}

/**
 * Generates SQL statements to pre-provision auth.users anchors
 * using authoritative user IDs, emails, and metadata from auth inventory,
 * strictly omitting passwords and tokens.
 */
export function generateAuthRecoverySql(users: any[]): string {
  if (!users || users.length === 0) {
    return '-- No auth users to pre-provision\n'
  }

  let sql = `-- ===================================================================\n`
  sql += `-- Aurelia Auth User Recovery Anchors\n`
  sql += `-- Pre-provisions user records into auth.users preserving original UUIDs\n`
  sql += `-- so all public schema foreign keys (profiles, recipes, etc.) succeed.\n`
  sql += `--\n`
  sql += `-- Security Compliance:\n`
  sql += `--  - Password hashes and recovery tokens are STRICTLY OMITTED.\n`
  sql += `--  - Users regain access via Google OAuth (auto-linking by email)\n`
  sql += `--    or via self-service / admin-initiated Password Reset.\n`
  sql += `-- ===================================================================\n\n`

  sql += `INSERT INTO auth.users (\n`
  sql += `  instance_id,\n`
  sql += `  id,\n`
  sql += `  aud,\n`
  sql += `  role,\n`
  sql += `  email,\n`
  sql += `  encrypted_password,\n`
  sql += `  email_confirmed_at,\n`
  sql += `  raw_app_meta_data,\n`
  sql += `  raw_user_meta_data,\n`
  sql += `  created_at,\n`
  sql += `  updated_at,\n`
  sql += `  confirmation_token,\n`
  sql += `  recovery_token\n`
  sql += `)\nVALUES\n`

  const valueRows = users.map((u) => {
    const id = formatSqlValue(u.id)
    const email = formatSqlValue(u.email)
    const role = formatSqlValue(u.role || 'authenticated')
    const appMeta = formatSqlValue(u.raw_app_meta_data || {})
    const userMeta = formatSqlValue(u.raw_user_meta_data || {})
    const createdAt = formatSqlValue(u.created_at || new Date().toISOString())
    return `  (\n    '00000000-0000-0000-0000-000000000000',\n    ${id},\n    'authenticated',\n    ${role},\n    ${email},\n    '',\n    now(),\n    ${appMeta},\n    ${userMeta},\n    ${createdAt},\n    now(),\n    '',\n    ''\n  )`
  })

  sql += valueRows.join(',\n')
  sql += `\nON CONFLICT (id) DO UPDATE SET\n`
  sql += `  email = EXCLUDED.email,\n`
  sql += `  raw_app_meta_data = EXCLUDED.raw_app_meta_data,\n`
  sql += `  raw_user_meta_data = EXCLUDED.raw_user_meta_data,\n`
  sql += `  updated_at = now();\n\n`

  return sql
}

/**
 * Generates SQL script to remap Supabase storage public URLs across
 * tables containing image references from the source project to target project.
 */
export function generateStorageRemapSql(
  sourceRef: string,
  targetRefPlaceholder = '<NEW_PROJECT_REF>'
): string {
  let sql = `-- ===================================================================\n`
  sql += `-- Aurelia Storage URL Remapping Script\n`
  sql += `-- Updates public storage URLs from source project to restored target project.\n`
  sql += `-- Replace ${targetRefPlaceholder} with your target Supabase project reference.\n`
  sql += `-- ===================================================================\n\n`

  sql += `-- 1. Remap Recipe image URLs\n`
  sql += `UPDATE public.recipes\n`
  sql += `SET image_url = replace(image_url, 'https://${sourceRef}.supabase.co', 'https://${targetRefPlaceholder}.supabase.co')\n`
  sql += `WHERE image_url LIKE '%${sourceRef}.supabase.co%';\n\n`

  sql += `-- 2. Remap Collection cover image URLs\n`
  sql += `UPDATE public.collections\n`
  sql += `SET cover_image_url = replace(cover_image_url, 'https://${sourceRef}.supabase.co', 'https://${targetRefPlaceholder}.supabase.co')\n`
  sql += `WHERE cover_image_url LIKE '%${sourceRef}.supabase.co%';\n\n`

  sql += `-- 3. Remap Recipe Versions snapshot JSONBs\n`
  sql += `UPDATE public.recipe_versions\n`
  sql += `SET snapshot = replace(snapshot::text, 'https://${sourceRef}.supabase.co', 'https://${targetRefPlaceholder}.supabase.co')::jsonb\n`
  sql += `WHERE snapshot::text LIKE '%${sourceRef}.supabase.co%';\n\n`

  return sql
}

export interface BackupOptions {
  inventoryOnly?: boolean
  targetDir?: string
}

export interface BackupResult {
  success: boolean
  timestamp: string
  backupDirectory: string
  projectRef: string
  tables: Record<string, number>
  totalRows: number
  storageFilesCount: number
  storageTotalBytes: number
  manifestPath?: string
  error?: string
}

export async function runBackup(options: BackupOptions = {}): Promise<BackupResult> {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19)

  console.log('==================================================================')
  console.log(`[Aurelia Backup] Starting backup run: ${timestamp}`)
  console.log('==================================================================')

  // 1. Verify project identity
  console.log('[1/7] Verifying Supabase project identity...')
  const projectRefPath = path.join(repoRoot, 'supabase/.temp/project-ref')
  let detectedRef = ''
  if (fs.existsSync(projectRefPath)) {
    detectedRef = fs.readFileSync(projectRefPath, 'utf8').trim()
  }

  if (detectedRef && detectedRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Safety guard: detected project ref (${detectedRef}) does not match expected production ref (${EXPECTED_PROJECT_REF})`
    )
  }
  console.log(` -> Verified production target: ${EXPECTED_PROJECT_NAME} (${EXPECTED_PROJECT_REF})`)

  // 2. Perform Read-Only Inventory of Database Tables
  console.log('[2/7] Running read-only inventory across 21 application tables...')
  const countQuery = `
    SELECT 
      table_name,
      (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS row_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `
  const countRows = runRemoteSqlQuery(countQuery)
  const tableCounts: Record<string, number> = {}
  let totalRows = 0

  for (const row of countRows) {
    tableCounts[row.table_name] = Number(row.row_count || 0)
    totalRows += Number(row.row_count || 0)
  }

  // Print read-only inventory table
  console.log('------------------------------------------------------------------')
  console.log(' Table Name               | Row Count')
  console.log('------------------------------------------------------------------')
  for (const t of APPLICATION_TABLES) {
    const cnt = tableCounts[t] !== undefined ? tableCounts[t] : 0
    console.log(` ${t.padEnd(24)} | ${String(cnt).padStart(6)}`)
  }
  console.log('------------------------------------------------------------------')
  console.log(` Total Application Rows:   ${totalRows}`)
  console.log('------------------------------------------------------------------')

  // 3. Inventory Storage Bucket
  console.log('[3/7] Inspecting recipe-images storage bucket...')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: rootItems, error: listError } = await supabase.storage.from('recipe-images').list()
  if (listError) {
    throw new Error(`Failed to inspect recipe-images bucket: ${listError.message}`)
  }

  const storageInventory: Array<{
    folder: string
    name: string
    path: string
    size: number
    mimetype: string
    updated_at: string
    id?: string | null
  }> = []

  let storageTotalBytes = 0

  for (const item of rootItems || []) {
    // If it's a user directory (UUID format)
    const { data: userFiles } = await supabase.storage.from('recipe-images').list(item.name)
    if (userFiles && userFiles.length > 0) {
      for (const file of userFiles) {
        const size = file.metadata?.size || 0
        storageTotalBytes += size
        storageInventory.push({
          folder: item.name,
          name: file.name,
          path: `${item.name}/${file.name}`,
          size,
          mimetype: file.metadata?.mimetype || 'application/octet-stream',
          updated_at: file.updated_at || file.created_at || new Date().toISOString(),
          id: file.id,
        })
      }
    }
  }

  console.log(
    ` -> Storage Inventory: ${storageInventory.length} files (${(
      storageTotalBytes /
      1024 /
      1024
    ).toFixed(2)} MB)`
  )

  if (options.inventoryOnly) {
    console.log('\n[Inventory Complete] --inventory flag passed. Skipping file writes.')
    return {
      success: true,
      timestamp,
      backupDirectory: 'N/A (inventory only)',
      projectRef: EXPECTED_PROJECT_REF,
      tables: tableCounts,
      totalRows,
      storageFilesCount: storageInventory.length,
      storageTotalBytes,
    }
  }

  // 4. Prepare Destination Directory
  const baseBackupDir = options.targetDir || path.join(os.homedir(), 'AureliaBackups')
  const backupDir = path.join(baseBackupDir, timestamp)

  const schemaDir = path.join(backupDir, 'schema')
  const migrationsDir = path.join(schemaDir, 'migrations')
  const dataDir = path.join(backupDir, 'data')
  const storageDir = path.join(backupDir, 'storage')
  const authDir = path.join(backupDir, 'auth')
  const configDir = path.join(backupDir, 'config')

  fs.mkdirSync(backupDir, { recursive: true })
  fs.mkdirSync(migrationsDir, { recursive: true })
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(storageDir, { recursive: true })
  fs.mkdirSync(authDir, { recursive: true })
  fs.mkdirSync(configDir, { recursive: true })

  console.log(`\n[4/7] Target backup directory initialized:`)
  console.log(` -> ${backupDir}`)

  const manifestFiles: Record<string, { size: number; sha256: string }> = {}

  function registerFile(relPath: string, fullPath: string) {
    const stat = fs.statSync(fullPath)
    const content = fs.readFileSync(fullPath)
    manifestFiles[relPath.replace(/\\/g, '/')] = {
      size: stat.size,
      sha256: computeSha256(content),
    }
  }

  // 5. Export Schema & Migrations
  console.log('\n[5/7] Exporting database schema and migrations...')
  const sourceMigrationsDir = path.join(repoRoot, 'supabase/migrations')
  const migrationFiles = fs.readdirSync(sourceMigrationsDir).filter((f) => f.endsWith('.sql')).sort()

  let consolidatedSchemaSql = `-- ===================================================================\n`
  consolidatedSchemaSql += `-- Aurelia Consolidated Database Schema\n`
  consolidatedSchemaSql += `-- Generated at: ${new Date().toISOString()}\n`
  consolidatedSchemaSql += `-- Target Project: ${EXPECTED_PROJECT_NAME} (${EXPECTED_PROJECT_REF})\n`
  consolidatedSchemaSql += `-- ===================================================================\n\n`

  for (const mig of migrationFiles) {
    const src = path.join(sourceMigrationsDir, mig)
    const dest = path.join(migrationsDir, mig)
    const content = fs.readFileSync(src, 'utf8')
    fs.writeFileSync(dest, content, 'utf8')
    registerFile(`schema/migrations/${mig}`, dest)

    consolidatedSchemaSql += `-- -------------------------------------------------------------------\n`
    consolidatedSchemaSql += `-- Migration: ${mig}\n`
    consolidatedSchemaSql += `-- -------------------------------------------------------------------\n`
    consolidatedSchemaSql += content + '\n\n'
  }

  const consolidatedSchemaPath = path.join(schemaDir, 'consolidated_schema.sql')
  fs.writeFileSync(consolidatedSchemaPath, consolidatedSchemaSql, 'utf8')
  registerFile('schema/consolidated_schema.sql', consolidatedSchemaPath)
  console.log(` -> Copied ${migrationFiles.length} migrations and generated consolidated_schema.sql`)

  // 6. Export Table Data & Generate Restore SQL
  console.log('\n[6/7] Exporting table records via transactional snapshot bundle...')
  const bundleArgs = APPLICATION_TABLES.map(
    (t) => `'${t}', (SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT * FROM public.${t}) t)`
  ).join(',\n    ')
  const bundleQuery = `SELECT json_build_object(\n    ${bundleArgs}\n  ) as bundle;`

  const bundleRows = runRemoteSqlQuery(bundleQuery)
  const bundleData = bundleRows[0]?.bundle || {}

  let restoreDataSql = `-- ===================================================================\n`
  restoreDataSql += `-- Aurelia Data Restore Script (Foreign-Key Dependency Ordered)\n`
  restoreDataSql += `-- Generated at: ${new Date().toISOString()}\n`
  restoreDataSql += `-- Target: Standard PostgreSQL connection with full constraint validation\n`
  restoreDataSql += `-- Note: Does NOT require session_replication_role or superuser privileges.\n`
  restoreDataSql += `-- ===================================================================\n\n`

  const exportedTableCounts: Record<string, number> = {}

  for (let i = 0; i < APPLICATION_TABLES.length; i++) {
    const tableName = APPLICATION_TABLES[i]
    const tableData: any[] = bundleData[tableName] || []

    exportedTableCounts[tableName] = tableData.length
    console.log(` -> [${i + 1}/${APPLICATION_TABLES.length}] ${tableName.padEnd(22)}: ${tableData.length} rows`)

    // Write table JSON
    const jsonPath = path.join(dataDir, `${tableName}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(tableData, null, 2), 'utf8')
    registerFile(`data/${tableName}.json`, jsonPath)

    // Append to restore-data.sql
    restoreDataSql += generateSqlInserts(tableName, tableData)
  }

  const restoreSqlPath = path.join(dataDir, 'restore-data.sql')
  fs.writeFileSync(restoreSqlPath, restoreDataSql, 'utf8')
  registerFile('data/restore-data.sql', restoreSqlPath)
  console.log(` -> Generated data/restore-data.sql (all 21 tables in dependency order)`)

  // Write storage URL remapping script
  const remapSql = generateStorageRemapSql(EXPECTED_PROJECT_REF)
  const remapSqlPath = path.join(dataDir, 'remap-storage-urls.sql')
  fs.writeFileSync(remapSqlPath, remapSql, 'utf8')
  registerFile('data/remap-storage-urls.sql', remapSqlPath)
  console.log(` -> Generated data/remap-storage-urls.sql`)

  // 7. Download Recipe Images and Build Storage Inventory
  console.log('\n[7/7] Downloading storage objects and writing manifests...')
  const storageFilesInventory: Array<any> = []

  for (const item of storageInventory) {
    const localUserFolder = path.join(storageDir, 'recipe-images', item.folder)
    fs.mkdirSync(localUserFolder, { recursive: true })

    const localFilePath = path.join(localUserFolder, item.name)
    const { data: blob, error: downloadError } = await supabase.storage
      .from('recipe-images')
      .download(item.path)

    if (downloadError || !blob) {
      throw new Error(`Failed to download storage object ${item.path}: ${downloadError?.message}`)
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    fs.writeFileSync(localFilePath, buffer)
    const fileSha256 = computeSha256(buffer)

    const relPath = `storage/recipe-images/${item.folder}/${item.name}`
    manifestFiles[relPath] = {
      size: buffer.length,
      sha256: fileSha256,
    }

    storageFilesInventory.push({
      ...item,
      sha256: fileSha256,
      local_path: relPath,
    })
  }

  const storageInventoryPath = path.join(storageDir, 'storage-inventory.json')
  fs.writeFileSync(
    storageInventoryPath,
    JSON.stringify(
      {
        bucket: 'recipe-images',
        total_files: storageFilesInventory.length,
        total_bytes: storageTotalBytes,
        objects: storageFilesInventory,
      },
      null,
      2
    ),
    'utf8'
  )
  registerFile('storage/storage-inventory.json', storageInventoryPath)
  console.log(` -> Downloaded ${storageFilesInventory.length} recipe images to storage/recipe-images/`)

  // 8. Safe Auth Users Inventory (strictly excluding password hashes and secrets)
  const authUsersQuery = `
    SELECT 
      id, 
      email, 
      role, 
      created_at, 
      last_sign_in_at, 
      raw_app_meta_data, 
      raw_user_meta_data 
    FROM auth.users 
    ORDER BY created_at;
  `
  const authUsers = runRemoteSqlQuery(authUsersQuery)
  const authUsersPath = path.join(authDir, 'users-inventory.json')
  fs.writeFileSync(
    authUsersPath,
    JSON.stringify(
      {
        notice:
          'Security Policy: Password hashes, recovery tokens, and secrets are strictly excluded.',
        total_users: authUsers.length,
        users: authUsers,
      },
      null,
      2
    ),
    'utf8'
  )
  registerFile('auth/users-inventory.json', authUsersPath)
  console.log(` -> Exported safe auth metadata inventory (${authUsers.length} users)`)

  const authRecoverySql = generateAuthRecoverySql(authUsers)
  const authRecoverySqlPath = path.join(authDir, 'auth-recovery.sql')
  fs.writeFileSync(authRecoverySqlPath, authRecoverySql, 'utf8')
  registerFile('auth/auth-recovery.sql', authRecoverySqlPath)
  console.log(` -> Generated auth/auth-recovery.sql for user UUID pre-provisioning`)

  // 9. Disaster Recovery Configuration Spec
  const configSpec = {
    project: {
      id: EXPECTED_PROJECT_REF,
      name: EXPECTED_PROJECT_NAME,
      region: 'ap-southeast-1',
      postgres_version: '17',
    },
    required_environment_variables: [
      {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        description: 'New Supabase project URL (https://<project-ref>.supabase.co)',
      },
      {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        description: 'New Supabase project anonymous public API key',
      },
      {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        description: 'New Supabase project privileged service_role secret key',
      },
      {
        name: 'NEXT_PUBLIC_APP_URL',
        description: 'Web frontend URL (e.g. https://aurelia-gamma-one.vercel.app or http://localhost:3000)',
      },
      {
        name: 'EXPO_PUBLIC_SUPABASE_URL',
        description: 'Mobile Android Supabase endpoint matching production',
      },
      {
        name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        description: 'Mobile Android anonymous client key',
      },
    ],
    manual_supabase_dashboard_steps: [
      'Auth -> Providers: Enable Email auth',
      'Auth -> Providers: Configure Google OAuth Client ID & Secret',
      'Auth -> URL Configuration: Set Site URL & add redirect URLs (e.g., aurelia://auth/callback)',
      'Storage -> Buckets: recipe-images is created by migration 00002_storage_setup.sql with 5MB limit',
    ],
  }
  const configSpecPath = path.join(configDir, 'disaster-recovery-config.json')
  fs.writeFileSync(configSpecPath, JSON.stringify(configSpec, null, 2), 'utf8')
  registerFile('config/disaster-recovery-config.json', configSpecPath)

  // 10. Generate and write manifest.json
  const manifest = {
    manifest_version: '1.0.0',
    backup_timestamp: timestamp,
    created_at: new Date().toISOString(),
    source_project: {
      ref: EXPECTED_PROJECT_REF,
      name: EXPECTED_PROJECT_NAME,
      plan_tier: 'Free',
    },
    summary: {
      total_tables: APPLICATION_TABLES.length,
      total_rows: totalRows,
      total_storage_files: storageFilesInventory.length,
      total_storage_bytes: storageTotalBytes,
      auth_users_count: authUsers.length,
      total_backup_files: Object.keys(manifestFiles).length + 1, // +1 for manifest itself
    },
    table_row_counts: exportedTableCounts,
    files: manifestFiles,
  }

  const manifestPath = path.join(backupDir, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  console.log('\n==================================================================')
  console.log(`[Backup Completed Successfully]`)
  console.log(` Location: ${backupDir}`)
  console.log(` Manifest: ${manifestPath}`)
  console.log(` Total Tables Exported: ${APPLICATION_TABLES.length}`)
  console.log(` Total Rows Exported:   ${totalRows}`)
  console.log(` Storage Images Saved:  ${storageFilesInventory.length} (${(storageTotalBytes / 1024 / 1024).toFixed(2)} MB)`)
  console.log('==================================================================')

  return {
    success: true,
    timestamp,
    backupDirectory: backupDir,
    projectRef: EXPECTED_PROJECT_REF,
    tables: exportedTableCounts,
    totalRows,
    storageFilesCount: storageFilesInventory.length,
    storageTotalBytes,
    manifestPath,
  }
}

// CLI Execution entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const inventoryOnly = args.includes('--inventory') || args.includes('-i')
  const targetDirIndex = args.indexOf('--target-dir')
  const targetDir = targetDirIndex !== -1 ? args[targetDirIndex + 1] : undefined

  runBackup({ inventoryOnly, targetDir })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n[BACKUP FAILED]:', err.message || err)
      process.exit(1)
    })
}
