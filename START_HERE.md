# ⚡ START HERE: Real Mode in 3 Steps

## What You're Setting Up

The "Run AI Agent Now" button will launch a GitHub Actions workflow that:
- Scrapes Amazon & AliExpress for pricing
- Validates products against pricing rules
- Generates GIFs from inspiration videos
- Creates products in your database

## 🚀 3 Steps to Activate

### Step 1: Push Code to GitHub (via Bolt)

**In Bolt's interface:**
- Look for the **GitHub icon** (top bar, usually top-right)
- Click **"Create new repository"** or **"Connect existing"**
- Bolt will push all your code to GitHub automatically

**Verify:** Visit your GitHub repo and check that `.github/workflows/import-products.yml` exists

### Step 2: Run Setup Script

After Bolt pushes the code, run this in your terminal:

```bash
./after-github-push.sh
```

This script will:
1. Ask for your GitHub username and repo name
2. Help you create a GitHub Personal Access Token
3. Configure Supabase secrets automatically
4. Show you what GitHub secrets to add

### Step 3: Add GitHub Secrets

The script will tell you exactly what to do:

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Add 4 secrets (script shows the values to copy-paste)
3. Done!

## ✅ Test It

1. Open: `/admin/ai-import`
2. Click: **"Run AI Agent Now"** (Real Mode)
3. Watch: Job starts, GitHub link appears
4. Results: Products appear in `/admin/product-approvals`

---

## 🆘 Troubleshooting

### "Can't find GitHub icon in Bolt"
- Check Bolt's settings/preferences for Git/GitHub options
- Try command palette (Cmd/Ctrl+K) → search "GitHub"
- See: `BOLT_GITHUB_SYNC.md` for manual push instructions

### "Actions tab not showing in GitHub"
1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/actions`
2. Enable: "Allow all actions and reusable workflows"
3. Save and refresh

### "Still getting 404 error"
- Verify workflow file exists: `.github/workflows/import-products.yml`
- Check GitHub token has `repo` + `workflow` scopes
- Verify all secrets are set (both Supabase and GitHub)

---

## 📚 More Details

- **Quick Guide**: `QUICK_START.md`
- **Bolt Integration**: `BOLT_GITHUB_SYNC.md`
- **Secrets Reference**: `SECRETS_REFERENCE.md`
- **Full Setup**: `REAL_MODE_READY.md`

---

## What You Get

After a successful run, products in approvals will have:

✅ Validated pricing (passed Amazon vs AliExpress rules)
✅ 1080×1080 product images
✅ 3+ clean GIFs (text-free, 3-6 seconds)
✅ Inspiration reel links
✅ AI-generated ad copy
✅ Profit margin calculations

**All ready for you to approve and add to your catalog!**
