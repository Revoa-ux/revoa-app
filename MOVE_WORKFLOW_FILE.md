# Move Workflow File to GitHub

Bolt's environment doesn't persist `.github` directories (dotfiles), so I've created the workflow file in a visible location.

## What You See Now

In Bolt's file explorer:
```
📁 github-workflows/
  └── 📄 import-products.yml  ← The GitHub Actions workflow
```

## What GitHub Needs

GitHub expects the file at:
```
📁 .github/
  └── 📁 workflows/
      └── 📄 import-products.yml
```

## Solution: Move It After Syncing to GitHub

Since Bolt syncs to your GitHub repo, follow these steps:

### Option 1: Use GitHub's Web Interface (Easiest)

1. **Wait for Bolt to sync** `github-workflows/import-products.yml` to your repo
2. **Go to your GitHub repo**: https://github.com/Revoa-ux/revoa-app
3. **Click "Add file" → "Create new file"**
4. **Name it**: `.github/workflows/import-products.yml`
5. **Copy the content** from `github-workflows/import-products.yml`
6. **Commit the file**
7. **Delete** the old `github-workflows/` folder (optional cleanup)

### Option 2: Use Git Locally (If You Have Git Access)

If you have the repo cloned locally:

```bash
# Navigate to your local repo
cd /path/to/revoa-app

# Create the proper directory
mkdir -p .github/workflows

# Move the file
mv github-workflows/import-products.yml .github/workflows/

# Commit
git add .github/workflows/import-products.yml
git commit -m "Add GitHub Actions workflow for Real Mode"
git push

# Clean up
rm -rf github-workflows
git add -u
git commit -m "Remove temp workflow directory"
git push
```

### Option 3: Direct GitHub API Upload

Use the script I created:

```bash
# From the Bolt terminal, run:
chmod +x after-github-push.sh
./after-github-push.sh
```

This script will:
1. Upload the workflow file to the correct location on GitHub
2. Configure all required secrets
3. Verify the setup

## After Moving the File

Once `.github/workflows/import-products.yml` exists on GitHub:

1. **Verify**: Go to https://github.com/Revoa-ux/revoa-app/actions
2. **Configure secrets**: Run `./after-github-push.sh`
3. **Test Real Mode**: Go to `/admin/ai-import` and click "Run AI Agent Now"

## Why This Happened

Bolt's environment doesn't preserve dotfiles (files/folders starting with `.`) like `.github`, `.env`, etc. This is a security feature to prevent accidental exposure of sensitive files.

The workaround is to:
1. Create files in visible locations (like `github-workflows/`)
2. Let Bolt sync them to GitHub
3. Move them to proper dotfile locations on GitHub directly

---

**Next Step**: Check Bolt's file explorer - can you see `github-workflows/import-products.yml`?
