# Aurelia Backup Workflow Guide

This document describes the safe, zero-cost backup workflow for the Aurelia platform.

---

## Quick Reference Commands

Run these commands from `C:\RecipeVault  mobile version`:

| Task | Command |
| :--- | :--- |
| **Inspect Read-Only Inventory** | `npx tsx scripts/backup/backup.ts --inventory` |
| **Run Full Backup** | `npx tsx scripts/backup/backup.ts` |
| **PowerShell Runner (Backup + Verify)** | `powershell -ExecutionPolicy Bypass -File scripts/backup/backup.ps1` |
| **Verify Latest Backup Checksums** | `npx tsx scripts/backup/verify-backup.ts` |
| **Verify Specific Backup Folder** | `npx tsx scripts/backup/verify-backup.ts --dir "C:\Users\<user>\AureliaBackups\<TIMESTAMP>"` |
| **Encrypt Backup Archive (AES-256-GCM)** | `npx tsx scripts/backup/encrypt-backup.ts --password "<passphrase>"` |
| **Decrypt Encrypted Backup Container** | `npx tsx scripts/backup/decrypt-backup.ts --file "<file.enc>" --password "<passphrase>"` |
| **Dry-Run Restore Safety Check** | `npx tsx scripts/backup/restore.ts --dry-run` |

---

## Where Backups Are Stored

Backups are saved **outside both Git repositories** at:
```text
%USERPROFILE%\AureliaBackups\<TIMESTAMP>\
```
*(e.g., `C:\Users\svish\AureliaBackups\2026-10-25_14-50-25`)*

Older backups are preserved chronologically and are **never deleted automatically**.

---

## What Is Backed Up

### 1. Database Schema
- **All 6 Supabase Migrations** (`00001` through `00006`) copied into `schema/migrations/`.
- **Consolidated DDL Script** (`schema/consolidated_schema.sql`) containing:
  - Custom PostgreSQL enums (`measurement_system`, `difficulty_level`, `shopping_list_status`, `meal_type`, etc.)
  - All 21 table schemas, primary keys, and foreign keys
  - All indexes and full-text search vectors (`fts`)
  - All functions (`update_updated_at_column`, `handle_new_user`, `check_ai_rate_limit`)
  - All database triggers
  - All Row Level Security policies
  - All PostgREST grants

### 2. Application Data (All 21 Tables)
Saved in both JSON format (`data/<table_name>.json`) and a single, dependency-ordered, idempotent SQL restore script (`data/restore-data.sql`):
1. `profiles` (with `ON CONFLICT (id) DO UPDATE`)
2. `ingredients` (with `ON CONFLICT (id) DO UPDATE`)
3. `tags` (with `ON CONFLICT (id) DO UPDATE`)
4. `user_preferences` (with `ON CONFLICT (user_id) DO UPDATE`)
5. `ai_rate_limits` (with `ON CONFLICT (id) DO UPDATE`)
6. `recipes` (omits `fts` generated column, `ON CONFLICT (id) DO UPDATE`)
7. `collections` (with `ON CONFLICT (id) DO UPDATE`)
8. `shopping_lists` (with `ON CONFLICT (id) DO UPDATE`)
9. `meal_plans` (with `ON CONFLICT (id) DO UPDATE`)
10. `recipe_ingredients` (with `ON CONFLICT (id) DO UPDATE`)
11. `recipe_instructions` (with `ON CONFLICT (id) DO UPDATE`)
12. `collection_recipes` (junction, `ON CONFLICT (collection_id, recipe_id) DO NOTHING`)
13. `recipe_tags` (junction, `ON CONFLICT (recipe_id, tag_id) DO NOTHING`)
14. `favorites` (junction, `ON CONFLICT (user_id, recipe_id) DO NOTHING`)
15. `shopping_list_items` (with `ON CONFLICT (id) DO UPDATE`)
16. `cooking_sessions` (with `ON CONFLICT (id) DO UPDATE`)
17. `recipe_versions` (with `ON CONFLICT (id) DO UPDATE`)
18. `recipe_sources` (with `ON CONFLICT (id) DO UPDATE`)
19. `ai_conversations` (with `ON CONFLICT (id) DO UPDATE`)
20. `meal_plan_items` (with `ON CONFLICT (id) DO UPDATE`)
21. `ai_messages` (with `ON CONFLICT (id) DO UPDATE`)

Also includes:
- `data/remap-storage-urls.sql`: Automated SQL helper to update all database image URLs to a target disaster-recovery project reference.

### 3. Recipe Photography & Storage Files
- Full binary objects from the `recipe-images` bucket saved under `storage/recipe-images/<user_id>/<filename>`.
- `storage/storage-inventory.json` with file paths, sizes, MIME types, and SHA-256 hashes.

### 4. Auth User Inventory & Recovery Anchors
- Safe user metadata saved to `auth/users-inventory.json` (user ID, email, role, created_at, metadata).
- `auth/auth-recovery.sql`: Pre-provisions original user UUID anchors into `auth.users` on a new project so foreign keys succeed.
- **Strictly excludes**: password hashes, encryption secrets, recovery tokens, and OTP codes.

### 5. Cryptographic Manifest
- `manifest.json` with SHA-256 checksums and exact file sizes for every single artifact in the backup archive.

---

## Backup Protection & Archive Encryption

To protect culinary user data and recipe photography:
1. **Built-in AES-256-GCM Encryption**:
   ```powershell
   npx tsx scripts/backup/encrypt-backup.ts --password "YourStrongPassphraseHere"
   ```
   Produces a `.enc` authenticated encrypted bundle.
2. **Standard 7-Zip CLI Alternative**:
   ```cmd
   7z a -p -mhe=on "AureliaBackup.7z" "%USERPROFILE%\AureliaBackups\<TIMESTAMP>"
   ```
3. **Decryption & Extraction**:
   ```powershell
   npx tsx scripts/backup/decrypt-backup.ts --file "%USERPROFILE%\AureliaBackups\<TIMESTAMP>.enc" --password "YourStrongPassphraseHere"
   ```

---

## Safe Off-Site Storage (Zero Silent Costs)

To ensure geographic redundancy without risking cloud billing surprises:
1. **Primary Recommendation**: Copy encrypted `.enc` or `.7z` archives to a **BitLocker-encrypted external USB SSD or flash drive**. One-time hardware purchase, 0 ongoing costs, immune to cloud billing.
2. **Personal Cloud Drives (Manual Upload)**: Upload the **encrypted container** to your personal Google Drive (15 GB free tier), Microsoft OneDrive (5 GB free tier), or Proton Drive. Because files are pre-encrypted with AES-256-GCM, your personal data is protected from cloud provider indexing.
3. **Cost Warning**: Avoid automated S3/Cloud Storage bucket synchronizations that use pay-per-request pricing or require credit cards on file, where forgotten buckets or API scans can silently accrue charges.

---

## What Remains Excluded

Per security best practices and platform boundaries:
1. **Password Hashes & Auth Secrets**: Supabase-managed Auth internals are not exportable via raw SQL and are excluded to protect user credentials.
2. **Third-Party API Secrets**: Google OAuth client secrets, OpenAI API keys, and Gemini API keys are not stored in the database and must not be committed to backup files.
3. **Database Server Logs & Transient Connections**: Connection pooler logs and ephemeral session state are excluded.

---

## Windows Task Scheduler (Optional Recurring Backups)

To automate backups on your Windows machine, inspect the prepared helper script:
```powershell
# Inspect the scheduler script
Get-Content scripts/backup/schedule-backup.ps1
```

To register a daily backup task at 2:00 AM, run PowerShell as Administrator:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup/schedule-backup.ps1 -Frequency Daily -Time "02:00"
```
*(Note: Do not enable automated scheduling until you have verified the manual backup workflow.)*
