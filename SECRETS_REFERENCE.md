# Secrets Reference Card

## Your Supabase Project

**Project Reference:** `iipaykvimkbbnoobtpzz`
**Project URL:** `https://iipaykvimkbbnoobtpzz.supabase.co`

## Supabase Edge Function Secrets

Set these via Supabase CLI for the `agent-dispatch` function:

```bash
supabase secrets set GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
supabase secrets set GITHUB_OWNER=YOUR_GITHUB_USERNAME
supabase secrets set GITHUB_REPO=YOUR_REPO_NAME
```

**Get your values:**
- `GITHUB_TOKEN`: Create at https://github.com/settings/tokens (needs `repo` + `workflow` scopes)
- `GITHUB_OWNER`: Your GitHub username
- `GITHUB_REPO`: The repository name where you pushed this code

## GitHub Repository Secrets

Set these at: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

### Required Secrets

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `SUPABASE_URL` | `https://iipaykvimkbbnoobtpzz.supabase.co` | Already known |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcGF5a3ZpbWtiYm5vb2J0cHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjU4MTgsImV4cCI6MjA1Nzc0MTgxOH0.qjJd6vbFZMHiTR7IA8IGtVxAzFuPbR5YHcAtLTSlUlA` | Already in .env |
| `SUPABASE_SERVICE_ROLE` | Get from Supabase Dashboard | See below ⬇️ |

### Get Service Role Key

1. Go to: https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/settings/api
2. Scroll to "Project API keys"
3. Copy the **service_role** secret key (starts with `eyJ...`)
4. Add as `SUPABASE_SERVICE_ROLE` secret in GitHub

### Admin Authentication (Choose ONE)

**Option A: Use Admin Token (Recommended)**

| Secret Name | Value |
|------------|-------|
| `REVOA_ADMIN_TOKEN` | Generate a long-lived JWT token for an admin user |

**Option B: Use Email/Password**

| Secret Name | Value |
|------------|-------|
| `REVOA_ADMIN_EMAIL` | Your admin email (e.g., `tyler@revoa.app`) |
| `REVOA_ADMIN_PASSWORD` | Your admin password |

## Quick Copy-Paste Values

### SUPABASE_URL
```
https://iipaykvimkbbnoobtpzz.supabase.co
```

### SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcGF5a3ZpbWtiYm5vb2J0cHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjU4MTgsImV4cCI6MjA1Nzc0MTgxOH0.qjJd6vbFZMHiTR7IA8IGtVxAzFuPbR5YHcAtLTSlUlA
```

## Verification Checklist

After setting all secrets:

```bash
# Verify Supabase secrets
supabase secrets list

# Should show:
# - GITHUB_TOKEN (set)
# - GITHUB_OWNER (set)
# - GITHUB_REPO (set)
```

```bash
# Test GitHub API access
curl -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/.github/workflows/import-products.yml

# Should return file details (not 404)
```

## Test Real Mode

1. Open: `/admin/ai-import`
2. Click: **"Run AI Agent Now"** (Real Mode)
3. Verify:
   - Job appears with "queued" status
   - GitHub run URL appears
   - Click link to watch execution
4. After completion:
   - Job status shows "completed"
   - Summary displays counts
   - Products appear in `/admin/product-approvals`

## Troubleshooting

### Still getting 404?

1. Verify workflow file exists on GitHub:
   ```bash
   https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/.github/workflows/import-products.yml
   ```

2. Check branch name matches:
   ```typescript
   // In agent-dispatch/index.ts line 289
   ref: 'main',  // Change if using different branch
   ```

3. Verify GitHub token has correct scopes:
   - ✅ repo (Full control)
   - ✅ workflow (Update workflows)

4. Check Supabase function logs:
   https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/logs/edge-functions

### Check import_jobs table

```sql
SELECT
  id,
  status,
  source,
  error,
  created_at
FROM import_jobs
ORDER BY created_at DESC
LIMIT 5;
```

Look for error messages in the `error` column.
