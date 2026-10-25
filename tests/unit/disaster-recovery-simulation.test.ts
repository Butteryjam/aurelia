/**
 * Aurelia Disaster Recovery Simulation & Validation Suite
 *
 * Validates the full disaster recovery lifecycle in a safe, isolated, disposable environment:
 *  1. Schema and dependency topology verification.
 *  2. Auth user UUID pre-provisioning anchors and foreign-key integrity.
 *  3. Table row counts, primary key uniqueness, and referential integrity across all 21 tables.
 *  4. Storage photography consistency (image files, hashes, and database references).
 *  5. Storage URL remapping logic from source project to target DR project.
 *  6. Production safety lock enforcement (strictly blocking production ref).
 *
 * Does NOT modify production data or require external cloud services.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  APPLICATION_TABLES,
  TABLE_PRIMARY_KEYS,
  GENERATED_ALWAYS_COLUMNS,
  generateSqlInserts,
  generateAuthRecoverySql,
  generateStorageRemapSql,
  computeSha256,
} from '../../scripts/backup/backup'
import { verifyBackup } from '../../scripts/backup/verify-backup'
import { runRestore } from '../../scripts/backup/restore'

describe('Aurelia Disaster Recovery Simulation & Offline Validation Harness', () => {
  const baseBackupsDir = path.join(os.homedir(), 'AureliaBackups')
  let activeBackupDir: string
  let disposableTestDir: string

  beforeAll(() => {
    // Locate latest active backup
    const entries = fs
      .readdirSync(baseBackupsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse()

    if (entries.length === 0) {
      throw new Error(`No backup directory found in ${baseBackupsDir}`)
    }
    activeBackupDir = path.join(baseBackupsDir, entries[0])

    // Create an isolated disposable test copy
    disposableTestDir = path.join(
      os.tmpdir(),
      `aurelia_dr_validation_${Date.now()}_${Math.random().toString(36).substring(7)}`
    )
    fs.cpSync(activeBackupDir, disposableTestDir, { recursive: true })
  })

  afterAll(() => {
    // Clean up disposable test directory
    if (fs.existsSync(disposableTestDir)) {
      fs.rmSync(disposableTestDir, { recursive: true, force: true })
    }
  })

  // ─── 1. Production Safety Lock ─────────────────────────────────────────
  describe('1. Production Safety Guardrails', () => {
    it('strictly refuses execution when target ref matches production (upzkcqovqstfsizerulx)', async () => {
      await expect(
        runRestore({
          backupDir: disposableTestDir,
          targetProjectRef: 'upzkcqovqstfsizerulx',
        })
      ).rejects.toThrow(/CRITICAL SAFETY LOCK BLOCKED EXECUTION/i)
    })

    it('strictly refuses execution when target URL contains production project ref', async () => {
      await expect(
        runRestore({
          backupDir: disposableTestDir,
          targetSupabaseUrl: 'https://upzkcqovqstfsizerulx.supabase.co',
        })
      ).rejects.toThrow(/CRITICAL SAFETY LOCK BLOCKED EXECUTION/i)
    })

    it('permits safe dry-run validation against non-production targets', async () => {
      const result = await runRestore({
        backupDir: disposableTestDir,
        dryRun: true,
        targetProjectRef: 'disaster-recovery-target-safe',
      })
      expect(result.success).toBe(true)
      expect(result.dryRun).toBe(true)
    })
  })

  // ─── 2. Auth Pre-Provisioning & Foreign Key Anchors ────────────────────
  describe('2. Auth User Inventory & UUID Preservation', () => {
    let authUsers: any[]

    beforeAll(() => {
      const raw = fs.readFileSync(
        path.join(disposableTestDir, 'auth/users-inventory.json'),
        'utf8'
      )
      authUsers = JSON.parse(raw).users || []
    })

    it('contains valid user inventory without leaking password hashes or secrets', () => {
      expect(authUsers.length).toBeGreaterThan(0)
      for (const user of authUsers) {
        expect(user.id).toBeDefined()
        expect(user.id).toMatch(/^[0-9a-f-]{36}$/)
        expect(user.email).toBeDefined()
        expect(user.encrypted_password).toBeUndefined()
        expect(user.password_hash).toBeUndefined()
        expect(user.recovery_token).toBeUndefined()
      }
    })

    it('generates well-formed auth-recovery.sql pre-provisioning anchors', () => {
      const sql = generateAuthRecoverySql(authUsers)

      expect(sql).toContain('INSERT INTO auth.users')
      expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET')
      expect(sql).not.toContain('session_replication_role')

      // Verify each user UUID is present as an anchor in the SQL
      for (const user of authUsers) {
        expect(sql).toContain(user.id)
        expect(sql).toContain(user.email)
      }
    })
  })

  // ─── 3. Full Relational & Referential Integrity Validation ─────────────
  describe('3. Relational & Referential Integrity Across 21 Tables', () => {
    const tableData: Record<string, any[]> = {}
    let authUserIds: Set<string>

    beforeAll(() => {
      const authRaw = fs.readFileSync(
        path.join(disposableTestDir, 'auth/users-inventory.json'),
        'utf8'
      )
      const authUsers = JSON.parse(authRaw).users || []
      authUserIds = new Set(authUsers.map((u: any) => u.id))

      for (const t of APPLICATION_TABLES) {
        const filePath = path.join(disposableTestDir, 'data', `${t}.json`)
        tableData[t] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      }
    })

    it('verifies that all primary keys are unique within their respective tables', () => {
      for (const [tableName, pkCols] of Object.entries(TABLE_PRIMARY_KEYS)) {
        const rows = tableData[tableName] || []
        const seen = new Set<string>()

        for (const row of rows) {
          const key = pkCols.map((c) => String(row[c])).join('::')
          expect(seen.has(key)).toBe(false)
          seen.add(key)
        }
      }
    })

    it('verifies that every user-owned record belongs to a known auth user anchor', () => {
      const userTables = [
        'profiles',
        'recipes',
        'collections',
        'shopping_lists',
        'meal_plans',
        'user_preferences',
        'ai_conversations',
        'ai_rate_limits',
      ]

      for (const t of userTables) {
        const rows = tableData[t] || []
        for (const row of rows) {
          const ownerId = row.user_id || row.id
          if (ownerId) {
            expect(authUserIds.has(ownerId)).toBe(true)
          }
        }
      }
    })

    it('verifies recipe child entity foreign keys resolve to existing recipes', () => {
      const recipeIds = new Set(tableData['recipes'].map((r) => r.id))

      // recipe_ingredients
      for (const ri of tableData['recipe_ingredients']) {
        expect(recipeIds.has(ri.recipe_id)).toBe(true)
      }

      // recipe_instructions
      for (const inst of tableData['recipe_instructions']) {
        expect(recipeIds.has(inst.recipe_id)).toBe(true)
      }

      // recipe_versions
      for (const rv of tableData['recipe_versions']) {
        expect(recipeIds.has(rv.recipe_id)).toBe(true)
      }

      // favorites
      for (const fav of tableData['favorites']) {
        expect(recipeIds.has(fav.recipe_id)).toBe(true)
      }

      // cooking_sessions
      for (const cs of tableData['cooking_sessions']) {
        expect(recipeIds.has(cs.recipe_id)).toBe(true)
      }
    })

    it('verifies ingredients foreign keys in recipe_ingredients resolve to ingredients table when present', () => {
      const ingredientIds = new Set(tableData['ingredients'].map((i) => i.id))
      for (const ri of tableData['recipe_ingredients']) {
        if (ri.ingredient_id !== null && ri.ingredient_id !== undefined) {
          expect(ingredientIds.has(ri.ingredient_id)).toBe(true)
        }
      }
    })

    it('verifies collection_recipes foreign keys resolve to collections and recipes', () => {
      const collectionIds = new Set(tableData['collections'].map((c) => c.id))
      const recipeIds = new Set(tableData['recipes'].map((r) => r.id))

      for (const cr of tableData['collection_recipes']) {
        expect(collectionIds.has(cr.collection_id)).toBe(true)
        expect(recipeIds.has(cr.recipe_id)).toBe(true)
      }
    })

    it('verifies recipe_tags foreign keys resolve to recipes and tags', () => {
      const tagIds = new Set(tableData['tags'].map((t) => t.id))
      const recipeIds = new Set(tableData['recipes'].map((r) => r.id))

      for (const rt of tableData['recipe_tags']) {
        expect(tagIds.has(rt.tag_id)).toBe(true)
        expect(recipeIds.has(rt.recipe_id)).toBe(true)
      }
    })

    it('verifies shopping_list_items resolve to existing shopping_lists', () => {
      const listIds = new Set(tableData['shopping_lists'].map((s) => s.id))
      for (const item of tableData['shopping_list_items']) {
        expect(listIds.has(item.shopping_list_id)).toBe(true)
      }
    })

    it('verifies ai_messages foreign keys resolve to existing ai_conversations', () => {
      const convIds = new Set(tableData['ai_conversations'].map((c) => c.id))
      for (const msg of tableData['ai_messages']) {
        expect(convIds.has(msg.conversation_id)).toBe(true)
      }
    })
  })

  // ─── 4. SQL Generator Hardening & Generated Columns ────────────────────
  describe('4. SQL Insert Generation Hardening', () => {
    it('omits generated always columns like recipes.fts from insert statements', () => {
      const sampleRecipe = [
        {
          id: '55555555-5555-5555-5555-555555555555',
          title: 'Lemon Herb Chicken',
          fts: "'chicken':3 'herb':2 'lemon':1",
          is_public: true,
        },
      ]
      const sql = generateSqlInserts('recipes', sampleRecipe)

      expect(sql).toContain('"id", "title", "is_public"')
      expect(sql).not.toContain('"fts"')
      expect(sql).toContain('ON CONFLICT ("id") DO UPDATE SET')
    })

    it('generates ON CONFLICT DO NOTHING for composite primary key junctions', () => {
      const sampleJunction = [
        {
          collection_id: '11111111-1111-1111-1111-111111111111',
          recipe_id: '22222222-2222-2222-2222-222222222222',
        },
      ]
      const sql = generateSqlInserts('collection_recipes', sampleJunction)

      expect(sql).toContain('INSERT INTO public.collection_recipes ("collection_id", "recipe_id")')
      expect(sql).toContain('ON CONFLICT ("collection_id", "recipe_id") DO NOTHING;')
    })
  })

  // ─── 5. Storage Photography & URL Remapping ────────────────────────────
  describe('5. Storage Photography Consistency & URL Remapping', () => {
    it('confirms every backed up image object matches its recorded SHA-256 hash', () => {
      const invPath = path.join(disposableTestDir, 'storage/storage-inventory.json')
      const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'))

      expect(inv.objects.length).toBeGreaterThan(0)
      for (const obj of inv.objects) {
        const filePath = path.join(disposableTestDir, obj.local_path)
        expect(fs.existsSync(filePath)).toBe(true)

        const buf = fs.readFileSync(filePath)
        const hash = computeSha256(buf)
        expect(hash).toBe(obj.sha256)
      }
    })

    it('cross-checks that all recipe and collection image URLs exist in storage files', () => {
      const invPath = path.join(disposableTestDir, 'storage/storage-inventory.json')
      const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'))
      const storagePaths = new Set(inv.objects.map((o: any) => o.path))

      const recipes = JSON.parse(
        fs.readFileSync(path.join(disposableTestDir, 'data/recipes.json'), 'utf8')
      )
      for (const r of recipes) {
        if (r.image_url && r.image_url.includes('/recipe-images/')) {
          const rel = r.image_url.split('/recipe-images/')[1]
          expect(storagePaths.has(rel)).toBe(true)
        }
      }

      const collections = JSON.parse(
        fs.readFileSync(path.join(disposableTestDir, 'data/collections.json'), 'utf8')
      )
      for (const c of collections) {
        if (c.cover_image_url && c.cover_image_url.includes('/recipe-images/')) {
          const rel = c.cover_image_url.split('/recipe-images/')[1]
          expect(storagePaths.has(rel)).toBe(true)
        }
      }
    })

    it('generates storage URL remap script to point URLs to target disaster recovery project', () => {
      const remapSql = generateStorageRemapSql('upzkcqovqstfsizerulx', 'target-dr-project-999')

      expect(remapSql).toContain('UPDATE public.recipes')
      expect(remapSql).toContain(
        "replace(image_url, 'https://upzkcqovqstfsizerulx.supabase.co', 'https://target-dr-project-999.supabase.co')"
      )
      expect(remapSql).toContain('UPDATE public.collections')
      expect(remapSql).toContain('UPDATE public.recipe_versions')
    })
  })

  // ─── 6. Comprehensive Cryptographic Check ──────────────────────────────
  describe('6. Cryptographic Archive Verification', () => {
    it('passes all 7 verification steps on the disposable copy', () => {
      const report = verifyBackup(disposableTestDir)

      expect(report.success).toBe(true)
      expect(report.totalFilesChecked).toBeGreaterThanOrEqual(38)
      expect(report.totalTablesChecked).toBe(21)
      expect(report.totalRowsVerified).toBe(663)
      expect(report.storageFilesVerified).toBe(6)
      expect(report.storageReferencesVerified).toBe(4)
      expect(report.ownershipReferencesVerified).toBe(112)
      expect(report.missingFiles).toHaveLength(0)
      expect(report.checksumMismatches).toHaveLength(0)
      expect(report.errors).toHaveLength(0)
    })
  })
})
