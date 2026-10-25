import { describe, it, expect } from 'vitest'
import {
  APPLICATION_TABLES,
  computeSha256,
  formatSqlValue,
  generateSqlInserts,
  generateAuthRecoverySql,
  generateStorageRemapSql,
} from '../../scripts/backup/backup'
import { verifyBackup } from '../../scripts/backup/verify-backup'

describe('Aurelia Backup & Disaster Recovery Workflow Suite', () => {
  // ─── 1. Table Schema Dependency Ordering ─────────────────────────────
  describe('1. Schema & Foreign Key Dependency Ordering', () => {
    it('contains all 21 application tables', () => {
      expect(APPLICATION_TABLES.length).toBe(21)
      expect(APPLICATION_TABLES).toContain('profiles')
      expect(APPLICATION_TABLES).toContain('recipes')
      expect(APPLICATION_TABLES).toContain('ingredients')
      expect(APPLICATION_TABLES).toContain('recipe_ingredients')
      expect(APPLICATION_TABLES).toContain('recipe_instructions')
      expect(APPLICATION_TABLES).toContain('collections')
      expect(APPLICATION_TABLES).toContain('collection_recipes')
      expect(APPLICATION_TABLES).toContain('tags')
      expect(APPLICATION_TABLES).toContain('recipe_tags')
      expect(APPLICATION_TABLES).toContain('favorites')
      expect(APPLICATION_TABLES).toContain('shopping_lists')
      expect(APPLICATION_TABLES).toContain('shopping_list_items')
      expect(APPLICATION_TABLES).toContain('cooking_sessions')
      expect(APPLICATION_TABLES).toContain('meal_plans')
      expect(APPLICATION_TABLES).toContain('meal_plan_items')
      expect(APPLICATION_TABLES).toContain('user_preferences')
      expect(APPLICATION_TABLES).toContain('ai_conversations')
      expect(APPLICATION_TABLES).toContain('ai_messages')
      expect(APPLICATION_TABLES).toContain('recipe_versions')
      expect(APPLICATION_TABLES).toContain('recipe_sources')
      expect(APPLICATION_TABLES).toContain('ai_rate_limits')
    })

    it('orders parents before children to prevent foreign-key restoration violations', () => {
      const idx = (name: string) => APPLICATION_TABLES.indexOf(name as any)

      // profiles before recipes
      expect(idx('profiles')).toBeLessThan(idx('recipes'))

      // recipes before child entities
      expect(idx('recipes')).toBeLessThan(idx('recipe_ingredients'))
      expect(idx('recipes')).toBeLessThan(idx('recipe_instructions'))
      expect(idx('recipes')).toBeLessThan(idx('recipe_versions'))
      expect(idx('recipes')).toBeLessThan(idx('recipe_sources'))
      expect(idx('recipes')).toBeLessThan(idx('favorites'))
      expect(idx('recipes')).toBeLessThan(idx('cooking_sessions'))

      // collections before collection_recipes
      expect(idx('collections')).toBeLessThan(idx('collection_recipes'))

      // tags before recipe_tags
      expect(idx('tags')).toBeLessThan(idx('recipe_tags'))

      // shopping_lists before shopping_list_items
      expect(idx('shopping_lists')).toBeLessThan(idx('shopping_list_items'))

      // meal_plans before meal_plan_items
      expect(idx('meal_plans')).toBeLessThan(idx('meal_plan_items'))

      // ai_conversations before ai_messages
      expect(idx('ai_conversations')).toBeLessThan(idx('ai_messages'))
    })
  })

  // ─── 2. Cryptographic Checksum Engine ────────────────────────────────
  describe('2. Checksum Utility (computeSha256)', () => {
    it('computes accurate SHA-256 hashes for strings and buffers', () => {
      const sample = 'Aurelia Culinary Archive Backup Test String'
      const hash1 = computeSha256(sample)
      const hash2 = computeSha256(Buffer.from(sample, 'utf8'))

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true)
    })
  })

  // ─── 3. SQL Literal Formatting & Escaping ───────────────────────────
  describe('3. SQL Literal Formatting (formatSqlValue)', () => {
    it('formats null and undefined as NULL', () => {
      expect(formatSqlValue(null)).toBe('NULL')
      expect(formatSqlValue(undefined)).toBe('NULL')
    })

    it('formats booleans correctly', () => {
      expect(formatSqlValue(true)).toBe('TRUE')
      expect(formatSqlValue(false)).toBe('FALSE')
    })

    it('formats numbers correctly', () => {
      expect(formatSqlValue(42)).toBe('42')
      expect(formatSqlValue(3.14)).toBe('3.14')
    })

    it('escapes single quotes in strings to prevent SQL syntax errors', () => {
      expect(formatSqlValue("Chef's Special")).toBe("'Chef''s Special'")
      expect(formatSqlValue("It's a culinary 'delight'")).toBe("'It''s a culinary ''delight'''")
    })

    it('formats arrays and objects as escaped JSONB literals by default', () => {
      expect(formatSqlValue({ key: 'val', note: "chef's" })).toBe(
        `'{"key":"val","note":"chef''s"}'::jsonb`
      )
      expect(formatSqlValue(['Produce', 'Dairy'])).toBe(`'["Produce","Dairy"]'::jsonb`)
    })

    it('formats PostgreSQL native text[] columns as ARRAY literals', () => {
      expect(
        formatSqlValue(['vegetarian', 'gluten-free'], 'dietary_preferences', 'profiles')
      ).toBe("ARRAY['vegetarian', 'gluten-free']::text[]")
      expect(formatSqlValue([], 'dietary_preferences', 'profiles')).toBe("'{}'::text[]")
    })
  })

  // ─── 4. SQL INSERT Generator ─────────────────────────────────────────
  describe('4. SQL INSERT Generator (generateSqlInserts)', () => {
    it('returns comment for empty table without syntax errors', () => {
      const sql = generateSqlInserts('ingredients', [])
      expect(sql).toBe('-- Table: public.ingredients (0 rows)\n')
    })

    it('generates well-formed INSERT statements with ON CONFLICT DO UPDATE for entity tables', () => {
      const rows = [
        { id: '111', title: 'French Toast', is_public: true, servings: 2 },
        { id: '222', title: "Baker's Sourdough", is_public: false, servings: 4 },
      ]
      const sql = generateSqlInserts('recipes', rows)

      expect(sql).toContain('INSERT INTO public.recipes ("id", "title", "is_public", "servings")')
      expect(sql).toContain("('111', 'French Toast', TRUE, 2)")
      expect(sql).toContain("('222', 'Baker''s Sourdough', FALSE, 4)")
      expect(sql).toContain('ON CONFLICT ("id") DO UPDATE SET')
    })

    it('omits GENERATED ALWAYS columns (e.g. recipes.fts) from the INSERT column list', () => {
      const rows = [
        { id: '333', title: 'Curry', fts: "'curri':1", is_public: true },
      ]
      const sql = generateSqlInserts('recipes', rows)

      expect(sql).toContain('"id", "title", "is_public"')
      expect(sql).not.toContain('"fts"')
    })

    it('generates ON CONFLICT DO NOTHING for composite primary key junctions', () => {
      const rows = [{ collection_id: 'col-1', recipe_id: 'rec-1' }]
      const sql = generateSqlInserts('collection_recipes', rows)

      expect(sql).toContain('INSERT INTO public.collection_recipes ("collection_id", "recipe_id")')
      expect(sql).toContain('ON CONFLICT ("collection_id", "recipe_id") DO NOTHING;')
    })
  })

  // ─── 5. Auth Recovery & Storage Remap SQL Generators ─────────────────
  describe('5. Auth Recovery & Storage Remap SQL Generators', () => {
    it('generates auth-recovery.sql pre-provisioning anchors with exact user UUIDs', () => {
      const users = [
        { id: 'user-uuid-1', email: 'chef@example.com', role: 'authenticated' },
      ]
      const sql = generateAuthRecoverySql(users)

      expect(sql).toContain('INSERT INTO auth.users')
      expect(sql).toContain("'user-uuid-1'")
      expect(sql).toContain("'chef@example.com'")
      expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET')
    })

    it('generates storage remap SQL that rewrites project domains', () => {
      const sql = generateStorageRemapSql('old-project-ref', 'new-project-ref')

      expect(sql).toContain('UPDATE public.recipes')
      expect(sql).toContain("replace(image_url, 'https://old-project-ref.supabase.co', 'https://new-project-ref.supabase.co')")
      expect(sql).toContain('UPDATE public.collections')
      expect(sql).toContain('UPDATE public.recipe_versions')
    })
  })

  // ─── 6. Backup Verification Engine ───────────────────────────────────
  describe('6. Backup Verification Engine (verifyBackup)', () => {
    it('successfully verifies the active local backup in %USERPROFILE%/AureliaBackups', () => {
      const report = verifyBackup()

      expect(report.success).toBe(true)
      expect(report.totalTablesChecked).toBe(21)
      expect(report.totalRowsVerified).toBeGreaterThan(0)
      expect(report.storageFilesVerified).toBeGreaterThan(0)
      expect(report.storageReferencesVerified).toBeGreaterThan(0)
      expect(report.ownershipReferencesVerified).toBeGreaterThan(0)
      expect(report.missingFiles).toHaveLength(0)
      expect(report.checksumMismatches).toHaveLength(0)
      expect(report.errors).toHaveLength(0)
    })
  })
})
