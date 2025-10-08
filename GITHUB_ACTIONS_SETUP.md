# GitHub Actions Setup Guide

This guide will help you set up the AI Agent to run via GitHub Actions (Real Mode).

## Prerequisites

- GitHub account with repository
- Supabase project credentials
- Admin user credentials

## Setup Steps

### 1. Push Code to GitHub

If you haven't already, push your project to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Description | Where to Find | Required |
|------------|-------------|---------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API | Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard → Project Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE` | Your Supabase service role key | Supabase Dashboard → Project Settings → API | Yes |
| `REVOA_ADMIN_TOKEN` | Admin token for authentication | Generate via Supabase auth | Optional* |
| `REVOA_ADMIN_EMAIL` | Admin email for authentication | Your admin user email | Optional* |
| `REVOA_ADMIN_PASSWORD` | Admin password for authentication | Your admin user password | Optional* |

**Note**: You need EITHER `REVOA_ADMIN_TOKEN` OR both `REVOA_ADMIN_EMAIL` + `REVOA_ADMIN_PASSWORD`.

### 3. Configure Edge Function Secrets

The `agent-dispatch` edge function needs GitHub credentials to trigger workflows.

Add these 3 secrets to your Supabase Edge Function environment:

| Secret Name | Description | Where to Find |
|------------|-------------|---------------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic) |
| `GITHUB_OWNER` | Your GitHub username | Your GitHub profile |
| `GITHUB_REPO` | Your repository name | Your repository name (e.g., `revoa-app`) |

**To create a GitHub Personal Access Token:**

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set note: "Revoa AI Agent Workflow Dispatch"
4. Set expiration: No expiration (or custom)
5. Select scopes: `repo` (Full control of private repositories) and `workflow` (Update GitHub Action workflows)
6. Click "Generate token"
7. Copy the token immediately (you won't see it again)

**To add secrets to Supabase Edge Functions:**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set the secrets
supabase secrets set GITHUB_TOKEN=ghp_your_token_here
supabase secrets set GITHUB_OWNER=your_github_username
supabase secrets set GITHUB_REPO=your_repo_name
```

### 4. Verify Setup

1. Log in to your app as a super-admin
2. Navigate to `/admin/ai-import`
3. Click **"Run AI Agent"** (the main button)
4. You should see:
   - "AI agent workflow started. Check job status below."
   - A new job appears in the table with status "queued" → "running"
   - A link to the GitHub Actions run

5. Click the "GitHub" link to view the workflow execution in real-time
6. Once complete (10-30 minutes), products will appear in Product Approvals

## Troubleshooting

### Error: "GitHub configuration missing"

- Make sure you've added `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` to Supabase Edge Function secrets
- Verify the values are correct
- Redeploy the edge function: `npm run deploy-functions`

### Error: "Super-admin access required"

- Only super-admins can run Real Mode
- Check your user has `is_super_admin = true` in the `user_profiles` table
- Regular admins can only use Demo Mode

### Workflow doesn't start

- Check GitHub secrets are configured correctly
- Verify the workflow file exists at `.github/workflows/import-products.yml`
- Check GitHub Actions is enabled in your repository settings
- Verify the `GITHUB_TOKEN` has `workflow` scope

### Workflow fails

- Check the GitHub Actions logs for details
- Common issues:
  - Python dependencies not installing
  - API rate limits (Instagram/TikTok)
  - Invalid product URLs
  - Missing system tools (ffmpeg, yt-dlp)

## How It Works

1. **Trigger**: You click "Run AI Agent" in the UI
2. **Dispatch**: The `agent-dispatch` edge function creates a job record and calls GitHub's workflow dispatch API
3. **Execute**: GitHub Actions runs the Python script (`scripts/revoa_import.py`)
4. **Process**: The script:
   - Scrapes Instagram/TikTok for winning products
   - Validates pricing (AliExpress ≤ 50% of Amazon OR $20+ spread)
   - Auto-generates text-free GIFs using yt-dlp + OpenCV + ffmpeg
   - Uploads assets to Supabase Storage
   - Creates products in the database
5. **Callback**: The workflow calls the `agent-callback` edge function with results
6. **Review**: Products appear in Product Approvals for your review

## Scheduled Runs

The workflow is configured to run daily at 2 AM UTC. To change this:

1. Edit `.github/workflows/import-products.yml`
2. Change the cron expression in the `schedule` section
3. Commit and push

Example cron expressions:
- `0 2 * * *` - Daily at 2 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Weekly on Monday at midnight

## Demo Mode

If you don't want to set up GitHub Actions, you can use Demo Mode:

1. Click the dropdown arrow next to "Run AI Agent"
2. Select "Demo Mode"
3. Instantly creates 5 sample products for testing

Demo Mode is perfect for:
- Testing the UI and workflow
- Verifying permissions
- Training new admins
- Quick demonstrations
