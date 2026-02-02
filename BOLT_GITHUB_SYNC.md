# How to Sync Bolt Project with GitHub

## Step 1: Use Bolt's GitHub Integration

### In Bolt's UI (Top Bar):

1. **Look for the GitHub icon** (usually top-right corner)
2. **Click it** to open GitHub integration
3. You'll see options:
   - **"Create new repository"** - Creates a new GitHub repo
   - **"Connect existing repository"** - Links to existing repo

### Option A: Create New Repository

1. Click **"Create new repository"**
2. Enter repository name (e.g., `revoa-app`)
3. Choose **Private** or **Public**
4. Click **"Create and Push"**
5. Bolt will automatically:
   - Create the repo on GitHub
   - Push all your code
   - Set up the connection

### Option B: Connect Existing Repository

1. Click **"Connect existing repository"**
2. Select your repository from the list
3. Click **"Connect and Push"**
4. Bolt will push all code to that repo

## Step 2: Verify the Push

After Bolt finishes:

1. **Go to your GitHub repo**:
   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO
   ```

2. **Check for the workflow file**:
   - Click "Code" tab
   - Navigate to `.github/workflows/`
   - You should see `import-products.yml`

3. **Enable GitHub Actions** (if needed):
   - Click "Actions" tab at the top
   - If you see "Workflows aren't being run on this repository"
   - Click **"I understand my workflows, go ahead and enable them"**

## Step 3: Configure Secrets

After the code is pushed, run the setup script:

```bash
./after-github-push.sh
```

This will:
- Prompt for your GitHub username and repo name
- Help you create a GitHub Personal Access Token
- Set Supabase Edge Function secrets
- Redeploy the agent-dispatch function
- Show you exactly what GitHub secrets to add

## Step 4: Add GitHub Repository Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these secrets (the script will show you the values):

1. **SUPABASE_URL**
2. **SUPABASE_ANON_KEY**
3. **SUPABASE_SERVICE_ROLE**
4. **REVOA_ADMIN_TOKEN** (or EMAIL+PASSWORD)

## Step 5: Test Real Mode

1. Open `/admin/ai-import` in your app
2. Click **"Run AI Agent Now"** (Real Mode)
3. You should see:
   - New job with "queued" status
   - GitHub Actions run URL
4. Click the GitHub link to watch execution

---

## Troubleshooting

### Can't Find GitHub Integration in Bolt?

If you don't see a GitHub icon in Bolt:

1. **Check Bolt's settings/preferences**
2. **Look for "Version Control" or "Git" options**
3. **Try the command palette** (usually Cmd/Ctrl+K)
   - Type "GitHub" or "Git"
   - Look for "Connect to GitHub"

### Manual Push (If Bolt Integration Doesn't Work)

If Bolt doesn't have GitHub integration, you can push manually:

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Add AI Agent workflow"

# Create repo on GitHub.com manually, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Then run: `./after-github-push.sh`

### "Actions" Tab Not Showing?

1. **Check repo settings**:
   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/settings/actions
   ```

2. **Under "Actions permissions"**:
   - Select: ✅ "Allow all actions and reusable workflows"
   - Click "Save"

3. **Refresh the Actions tab**:
   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/actions
   ```

### Workflow File Missing?

If `.github/workflows/import-products.yml` doesn't appear:

1. **Check if Bolt pushed all files**:
   - Look at the repo file tree on GitHub
   - Search for "import-products.yml"

2. **If missing, manually push**:
   ```bash
   git add .github/workflows/import-products.yml
   git commit -m "Add workflow file"
   git push
   ```

---

## Quick Checklist

- [ ] Code synced from Bolt to GitHub
- [ ] Workflow file visible: `.github/workflows/import-products.yml`
- [ ] "Actions" tab appears in GitHub
- [ ] GitHub Actions enabled in repo settings
- [ ] Ran `./after-github-push.sh` to configure secrets
- [ ] GitHub repo secrets added (4 values)
- [ ] Tested "Run AI Agent Now" button

---

## What Happens When It Works

1. **Click "Run AI Agent Now"** in `/admin/ai-import`
2. **Job appears** with "queued" status
3. **GitHub link appears** - click it
4. **Watch the workflow run** on GitHub Actions
5. **After completion**:
   - Job status: "completed"
   - Summary shows product counts
6. **Check `/admin/product-approvals`**:
   - New products with pricing, images, GIFs

---

## Need Help?

If you're stuck:

1. **Check if code is on GitHub**: Visit your repo URL
2. **Check if workflow exists**: Look for `.github/workflows/import-products.yml`
3. **Check Actions tab**: Should show the workflow
4. **Check secrets**: Both Supabase and GitHub secrets must be set
5. **Check logs**: Supabase function logs and GitHub Actions logs

**Once the code is on GitHub and secrets are set, everything will work!**
