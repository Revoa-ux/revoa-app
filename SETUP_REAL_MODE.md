# Real Mode Setup Guide

## Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Add AI Agent workflow with price-first importer"

# Create a new repo on GitHub (or use existing)
# Option A: Create via GitHub CLI
gh repo create revoa-app --private --source=. --remote=origin --push

# Option B: Create manually on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Verify Workflow File on GitHub

Visit: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/blob/main/.github/workflows/import-products.yml`

Confirm the file exists and is visible.

## Step 3: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `Revoa AI Agent`
4. Expiration: Choose appropriate timeframe
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again)

## Step 4: Set Supabase Edge Function Secrets

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Set secrets for agent-dispatch function
npx supabase secrets set GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
npx supabase secrets set GITHUB_OWNER=YOUR_GITHUB_USERNAME
npx supabase secrets set GITHUB_REPO=YOUR_REPO_NAME

# Verify secrets were set
npx supabase secrets list
```

## Step 5: Set GitHub Repository Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/settings/secrets/actions`

Click "New repository secret" for each:

### Required Secrets:

**SUPABASE_URL**
```
https://YOUR_PROJECT_REF.supabase.co
```

**SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Find in Supabase Dashboard → Settings → API → anon public)

**SUPABASE_SERVICE_ROLE**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
(Find in Supabase Dashboard → Settings → API → service_role secret)

**Authentication (choose ONE method):**

**Option A:** Use admin token
- `REVOA_ADMIN_TOKEN` = Generate a long-lived token for an admin user

**Option B:** Use email/password
- `REVOA_ADMIN_EMAIL` = Your admin email
- `REVOA_ADMIN_PASSWORD` = Your admin password

## Step 6: Redeploy Edge Functions

```bash
# Redeploy agent-dispatch to pick up new secrets
npx supabase functions deploy agent-dispatch

# Verify deployment
npx supabase functions list
```

## Step 7: Test the Setup

1. Open your app at `/admin/ai-import`
2. Click **"Run AI Agent Now"** (Real Mode)
3. You should see:
   - New job appears with status "queued" → "running"
   - GitHub run URL link appears
   - Click link to watch the GitHub Actions run
4. After completion:
   - Job status updates to "completed"
   - Summary shows total/successful/failed/skipped counts
5. Check `/admin/product-approvals`:
   - New products with pricing validation passed
   - 1080×1080 main images
   - 3+ clean GIFs (text-free segments)
   - Inspiration reel links
   - Generated ad copy

## Troubleshooting 404 Errors

If you still get "Failed to dispatch GitHub workflow" with 404:

### Check 1: Workflow file exists
```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO_NAME/contents/.github/workflows/import-products.yml
```

Should return file details (not 404).

### Check 2: Verify branch
```bash
# Check your default branch name
git branch --show-current
```

If it's not `main`, update the dispatch call in `agent-dispatch/index.ts` line 289:
```typescript
ref: 'main',  // Change to 'master' or your branch name
```

### Check 3: Test GitHub token manually
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/import-products.yml/dispatches \
  -d '{"ref":"main","inputs":{"job_id":"test-123","niche":"all"}}'
```

Should return 204 (success) or error details.

### Check 4: Verify secrets in Supabase
```bash
npx supabase secrets list
```

Should show:
- GITHUB_TOKEN (set)
- GITHUB_OWNER (set)
- GITHUB_REPO (set)

## Quick Checklist

- [ ] Repo exists on GitHub: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME`
- [ ] Workflow file visible: `.github/workflows/import-products.yml` on `main` branch
- [ ] GitHub PAT created with `repo` + `workflow` scopes
- [ ] Supabase secrets set: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
- [ ] GitHub repo secrets set: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, admin auth
- [ ] Edge functions redeployed
- [ ] Test button works and creates GitHub Actions run
- [ ] Products appear in approvals after run completes

## Environment Variables Reference

### Supabase Edge Function Secrets (for agent-dispatch)
```bash
GITHUB_TOKEN=ghp_...           # GitHub Personal Access Token
GITHUB_OWNER=username          # Your GitHub username
GITHUB_REPO=repo-name          # Repository name
```

### GitHub Repository Secrets (for workflow runner)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ...

# Auth option A:
REVOA_ADMIN_TOKEN=eyJ...

# Auth option B:
REVOA_ADMIN_EMAIL=admin@example.com
REVOA_ADMIN_PASSWORD=your_password
```

## Support

If you encounter issues:

1. Check GitHub Actions logs: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions`
2. Check Supabase function logs: Supabase Dashboard → Edge Functions → agent-dispatch → Logs
3. Check import_jobs table: Run `SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT 5;`
