/**
 * Integration Test: Actual Isolated Database Restoration
 *
 * Verifies that the real PostgreSQL 16 engine can execute the complete
 * disaster recovery pipeline against the backed-up database artifacts:
 *  - Schema compilation and creation.
 *  - Auth UUID pre-provisioning.
 *  - 21-table dependency-ordered data insertion.
 *  - Storage URL remapping.
 *  - RLS policies and foreign-key integrity.
 */

import { describe, it, expect } from 'vitest'
import { runActualRestoreTest } from '../../scripts/backup/test-actual-restore'

describe('Aurelia Actual PostgreSQL Database Restoration Test Suite', () => {
  it('successfully restores entire backup into isolated PostgreSQL 16 instance with 100% referential integrity', async () => {
    const result = await runActualRestoreTest()

    expect(result.success).toBe(true)
    expect(result.postgresVersion).toContain('PostgreSQL')
    expect(result.totalRowsRestored).toBe(663)
    expect(Object.keys(result.tablesRestored)).toHaveLength(21)
    expect(result.foreignKeysVerified).toBe(true)
    expect(result.rlsPoliciesCount).toBe(63)
    expect(result.storageUrlsRemappedCount).toBe(4)
    expect(result.userOwnershipVerified).toBe(true)
    expect(result.accountTypesVerified.googleOAuth).toBe(5)
    expect(result.accountTypesVerified.emailPassword).toBe(6)
    expect(result.errors).toHaveLength(0)
  }, 60000)
})
