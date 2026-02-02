# ✅ Real Mode Setup Complete

Your AI Agent is configured and ready for Real Mode! Follow these steps to activate it.

## 🎯 What's Configured

### ✅ Price-First AI Agent
- **Location:** `scripts/revoa_import.py`
- **Features:**
  - ✅ Amazon Prime price scraping
  - ✅ AliExpress top-3 candidate validation (min 300 sales)
  - ✅ Pricing rules: AE ≤ 50% of Amazon OR spread ≥ $20
  - ✅ Auto-GIF generation (3-6s, text-free, ≤20MB)
  - ✅ UPSERT mode (updates existing products)
  - ✅ Outputs `run_summary.json`

### ✅ GitHub Actions Workflow
- **Location:** `.github/workflows/import-products.yml`
- **Triggers:**
  - Manual dispatch (from "Run AI Agent" button)
  - Daily at 6 AM UTC
  - Push to products/assets/scripts
- **Dependencies:** ffmpeg, Python 3.11, opencv-python-headless, yt-dlp
- **Script:** `python scripts/revoa_import.py`
- **Callback:** Posts results to `agent-callback` function

### ✅ Edge Functions
- **agent-dispatch** (line 277): Calls `import-products.yml` workflow
- **import-products** (line 560): UPSERT mode enabled
- **agent-callback**: Stores summary in `import_jobs` table

### ✅ Database
- `is_super_admin` column added to `user_profiles`
- Your accounts marked as super-admins

---

## 🚀 Activation Steps (5 Minutes)

### Step 1: Push to GitHub

```bash
# Initialize git
git init
git add .
git commit -m "Add AI Agent workflow with price-first importer"

# Push to GitHub (choose one option)

# Option A: Create new repo with GitHub CLI
gh repo create revoa-app --private --source=. --remote=origin --push

# Option B: Use existing repo
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

**Verify:** Visit `https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/.github/workflows/import-products.yml`

### Step 2: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Name: `Revoa AI Agent`
3. Scopes: ✅ `repo` + ✅ `workflow`
4. Generate and copy the token (starts with `ghp_`)

### Step 3: Configure Supabase Secrets

```bash
# Install Supabase CLI (if needed)
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref iipaykvimkbbnoobtpzz

# Set GitHub integration secrets
supabase secrets set GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE
supabase secrets set GITHUB_OWNER=YOUR_GITHUB_USERNAME
supabase secrets set GITHUB_REPO=YOUR_REPO_NAME

# Verify
supabase secrets list
```

### Step 4: Configure GitHub Repository Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these secrets (click "New repository secret"):

| Secret Name | Value | Source |
|------------|-------|--------|
| `SUPABASE_URL` | `https://iipaykvimkbbnoobtpzz.supabase.co` | Your project |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From .env file |
| `SUPABASE_SERVICE_ROLE` | Get from Dashboard | See below ⬇️ |

**Get Service Role Key:**
1. Visit: https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/settings/api
2. Copy "service_role" key (starts with `eyJ...`)

**Admin Authentication (choose ONE):**

**Option A - Token (Recommended):**
- `REVOA_ADMIN_TOKEN`: Generate long-lived JWT for admin user

**Option B - Email/Password:**
- `REVOA_ADMIN_EMAIL`: Your admin email (e.g., `tyler@revoa.app`)
- `REVOA_ADMIN_PASSWORD`: Your admin password

### Step 5: Deploy Edge Functions

```bash
# Redeploy to pick up new secrets
supabase functions deploy agent-dispatch

# Verify deployment
supabase functions list
```

### Step 6: Test Real Mode! 🎉

1. Open: `https://your-app.com/admin/ai-import`
2. Click: **"Run AI Agent Now"** (Real Mode)
3. You should see:
   - New job with status "queued" → "running"
   - GitHub Actions run URL link
4. Click the GitHub link to watch execution
5. After completion:
   - Job status: "completed"
   - Summary: total/successful/failed/skipped counts
6. Check: `/admin/product-approvals` for new products

---

## 📊 Expected Results

After a successful run, products in `/admin/product-approvals` will have:

- ✅ **Pricing validation passed**: AE ≤ 50% of Amazon OR spread ≥ $20
- ✅ **Main image**: 1080×1080 product photo
- ✅ **GIFs**: 3+ clean animations (3-6s, text-free, ≤20MB)
- ✅ **Inspiration reels**: TikTok/Instagram video links
- ✅ **Generated copy**: Titles, descriptions, ad headlines
- ✅ **Pricing data**: Supplier cost, recommended retail, profit margin

---

## 🔍 Verification Checklist

Before testing, confirm:

- [ ] Code pushed to GitHub
- [ ] Workflow file visible at: `.github/workflows/import-products.yml`
- [ ] GitHub token created with `repo` + `workflow` scopes
- [ ] Supabase secrets set: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
- [ ] GitHub secrets set: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, admin auth
- [ ] Edge function redeployed: `agent-dispatch`
- [ ] Super-admin status confirmed in database

**Quick verification:**

```bash
# Check Supabase secrets
supabase secrets list

# Test GitHub API access
curl -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/contents/.github/workflows/import-products.yml

# Should return file details (not 404)
```

---

## 🚨 Troubleshooting

### Still getting 404 error?

**1. Verify workflow file exists on GitHub:**
```
https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/.github/workflows/import-products.yml
```

**2. Check branch name:**
```bash
git branch --show-current
# If not "main", update agent-dispatch/index.ts line 289
```

**3. Verify GitHub token scopes:**
- Must have: ✅ repo (Full control) + ✅ workflow (Update workflows)
- Regenerate if missing scopes

**4. Test dispatch manually:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/actions/workflows/import-products.yml/dispatches \
  -d '{"ref":"main","inputs":{"job_id":"test-123","niche":"all"}}'

# Should return 204 (success) or error message
```

### Check logs:

**GitHub Actions:**
```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

**Supabase Function Logs:**
```
https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/logs/edge-functions
```

**Import Jobs Table:**
```sql
SELECT id, status, source, error, created_at
FROM import_jobs
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📚 Additional Resources

- **Quick Start:** See `QUICK_START.md` for 5-minute setup
- **Secrets Reference:** See `SECRETS_REFERENCE.md` for all values
- **Detailed Setup:** See `SETUP_REAL_MODE.md` for comprehensive guide
- **Verification Script:** Run `./verify-setup.sh` to check configuration
- **Setup Commands:** Run `./setup-commands.sh` for interactive setup

---

## 🎊 Success!

Once activated, the "Run AI Agent Now" button will:

1. Create an import job in your database
2. Dispatch a GitHub Actions workflow
3. Execute the price-first Python script
4. Scrape Amazon/AliExpress for pricing
5. Validate against pricing rules
6. Generate GIFs from inspiration reels
7. Upload all assets to Supabase Storage
8. UPSERT products to your database
9. Callback with summary and GitHub run URL
10. Display results in your admin dashboard

**All products will appear in `/admin/product-approvals` for review before going live!**

---

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review GitHub Actions logs for errors
3. Check Supabase function logs for dispatch issues
4. Verify all secrets are set correctly
5. Confirm workflow file exists on correct branch

**Common Issues:**

- **404 Error:** Workflow file not pushed or wrong repo/branch
- **401 Error:** GitHub token missing or invalid scopes
- **403 Error:** Not super-admin (check `is_super_admin` column)
- **500 Error:** Missing Supabase secrets or GitHub configuration

---

**You're all set! Push to GitHub and start importing products with Real Mode!** 🚀
