import { describe, it, expect } from 'vitest'
import {
  APPLICATION_TABLES,
  computeSha256,
  formatSqlValue,
  generateSqlInserts,
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

    it('formats arrays and objects as escaped JSONB literals', () => {
      expect(formatSqlValue({ key: 'val', note: "chef's" })).toBe(
        `'{"key":"val","note":"chef''s"}'::jsonb`
      )
      expect(formatSqlValue(['Produce', 'Dairy'])).toBe(`'["Produce","Dairy"]'::jsonb`)
    })
  })

  // ─── 4. SQL INSERT Generator ─────────────────────────────────────────
  describe('4. SQL INSERT Generator (generateSqlInserts)', () => {
    it('returns comment for empty table without syntax errors', () => {
      const sql = generateSqlInserts('ingredients', [])
      expect(sql).toBe('-- Table: public.ingredients (0 rows)\n')
    })

    it('generates well-formed INSERT statements for rows', () => {
      const rows = [
        { id: '111', title: 'French Toast', is_public: true, servings: 2 },
        { id: '222', title: "Baker's Sourdough", is_public: false, servings: 4 },
      ]
      const sql = generateSqlInserts('recipes', rows)

      expect(sql).toContain('INSERT INTO public.recipes ("id", "title", "is_public", "servings")')
      expect(sql).toContain("('111', 'French Toast', TRUE, 2)")
      expect(sql).toContain("('222', 'Baker''s Sourdough', FALSE, 4)")
    })
  })

  // ─── 5. Backup Verification Engine ───────────────────────────────────
  describe('5. Backup Verification Engine (verifyBackup)', () => {
    it('successfully verifies the active local backup in %USERPROFILE%/AureliaBackups', () => {
      const report = verifyBackup()

      expect(report.success).toBe(true)
      expect(report.totalTablesChecked).toBe(21)
      expect(report.totalRowsVerified).toBeGreaterThan(0)
      expect(report.storageFilesVerified).toBeGreaterThan(0)
      expect(report.missingFiles).toHaveLength(0)
      expect(report.checksumMismatches).toHaveLength(0)
      expect(report.errors).toHaveLength(0)
    })
  })
})
