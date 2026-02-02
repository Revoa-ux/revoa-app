# Quick Start: Real Mode Setup (5 Minutes)

## ⚡ Fast Track Setup

### Step 1: Push to GitHub (2 minutes)

```bash
# Navigate to project directory
cd /path/to/project

# Initialize git
git init
git add .
git commit -m "Add AI Agent workflow with price-first importer"

# Option A: Create new repo (using GitHub CLI)
gh repo create revoa-app --private --source=. --remote=origin --push

# Option B: Use existing repo
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

**Verify:** Visit `https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/.github/workflows/import-products.yml`

### Step 2: Create GitHub Token (1 minute)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `Revoa AI Agent`
4. Scopes: ✅ `repo` + ✅ `workflow`
5. Generate and **copy the token**

### Step 3: Set Supabase Secrets (1 minute)

```bash
# Install Supabase CLI (if needed)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref iipaykvimkbbnoobtpzz

# Set secrets (replace with your values)
supabase secrets set GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
supabase secrets set GITHUB_OWNER=YOUR_GITHUB_USERNAME
supabase secrets set GITHUB_REPO=YOUR_REPO_NAME

# Verify
supabase secrets list
```

### Step 4: Set GitHub Secrets (1 minute)

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Click "New repository secret" and add:

**Required (copy-paste these):**

1. **SUPABASE_URL**
   ```
   https://iipaykvimkbbnoobtpzz.supabase.co
   ```

2. **SUPABASE_ANON_KEY**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcGF5a3ZpbWtiYm5vb2J0cHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjU4MTgsImV4cCI6MjA1Nzc0MTgxOH0.qjJd6vbFZMHiTR7IA8IGtVxAzFuPbR5YHcAtLTSlUlA
   ```

3. **SUPABASE_SERVICE_ROLE**
   - Get from: https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/settings/api
   - Copy the "service_role" key

**Authentication (pick one):**

**Option A:** Admin Token
- **REVOA_ADMIN_TOKEN**: Your admin JWT token

**Option B:** Email/Password
- **REVOA_ADMIN_EMAIL**: `tyler@revoa.app` (or your admin email)
- **REVOA_ADMIN_PASSWORD**: Your password

### Step 5: Deploy Functions (30 seconds)

```bash
supabase functions deploy agent-dispatch
```

### Step 6: Test! 🎉

1. Open your app at `/admin/ai-import`
2. Click **"Run AI Agent Now"** (Real Mode)
3. Watch the magic happen!

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub (workflow file visible)
- [ ] GitHub token created with `repo` + `workflow` scopes
- [ ] Supabase secrets set (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)
- [ ] GitHub secrets set (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE, admin auth)
- [ ] Edge function deployed
- [ ] Button launches GitHub Actions run
- [ ] Products appear in approvals after completion

---

## 🚨 Troubleshooting

### "Failed to dispatch GitHub workflow" (404)

**Check 1:** Workflow file exists on GitHub
```bash
# Visit this URL (replace with your values):
https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/.github/workflows/import-products.yml
```

**Check 2:** Verify secrets in Supabase
```bash
supabase secrets list
# Should show GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO as "set"
```

**Check 3:** Test GitHub API manually
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/actions/workflows/import-products.yml/dispatches \
  -d '{"ref":"main","inputs":{"job_id":"test","niche":"all"}}'

# Should return 204 (success) or error details
```

**Check 4:** Verify branch name
```bash
git branch --show-current
# If not "main", update agent-dispatch/index.ts line 289
```

### Products not appearing?

Check GitHub Actions logs:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

Check Supabase logs:
```
https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/logs/edge-functions
```

Check import_jobs table:
```sql
SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT 5;
```

---

## 📚 More Details

See `SETUP_REAL_MODE.md` for comprehensive documentation.
See `SECRETS_REFERENCE.md` for all secret values and locations.

---

## 🎯 What You'll Get

After a successful run, check `/admin/product-approvals` for:

- ✅ Products that passed pricing rules (AE ≤ 50% of Amazon OR spread ≥ $20)
- ✅ 1080×1080 main product images
- ✅ 3+ clean GIFs (3-6 seconds, text-free segments, ≤20MB)
- ✅ Inspiration reel links from TikTok/Instagram
- ✅ AI-generated ad copy (titles, descriptions, headlines)
- ✅ Pricing data (supplier cost, recommended retail, margin)

Click "Approve" to add them to your product catalog!
