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
Saved in both JSON format (`data/<table_name>.json`) and a single, dependency-ordered SQL restore script (`data/restore-data.sql`):
1. `profiles`
2. `ingredients`
3. `tags`
4. `user_preferences`
5. `ai_rate_limits`
6. `recipes`
7. `collections`
8. `shopping_lists`
9. `meal_plans`
10. `recipe_ingredients`
11. `recipe_instructions`
12. `collection_recipes`
13. `recipe_tags`
14. `favorites`
15. `shopping_list_items`
16. `cooking_sessions`
17. `recipe_versions`
18. `recipe_sources`
19. `ai_conversations`
20. `meal_plan_items`
21. `ai_messages`

### 3. Recipe Photography & Storage Files
- Full binary objects from the `recipe-images` bucket saved under `storage/recipe-images/<user_id>/<filename>`.
- `storage/storage-inventory.json` with file paths, sizes, MIME types, and SHA-256 hashes.

### 4. Auth User Inventory
- Safe user metadata saved to `auth/users-inventory.json` (user ID, email, role, created_at, metadata).
- **Strictly excludes**: password hashes, encryption secrets, recovery tokens, and OTP codes.

### 5. Cryptographic Manifest
- `manifest.json` with SHA-256 checksums and exact file sizes for every single artifact in the backup archive.

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
