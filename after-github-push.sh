#!/bin/bash
# Run this AFTER Bolt pushes your code to GitHub

set -e

echo "🚀 Post-GitHub Push Setup"
echo ""
echo "This script configures Real Mode after your code is on GitHub."
echo ""

# Get GitHub info
read -p "GitHub Username: " GITHUB_USERNAME
read -p "GitHub Repo Name: " GITHUB_REPO_NAME
echo ""

# Verify repo exists
echo "✅ Verifying GitHub repo..."
REPO_URL="https://github.com/$GITHUB_USERNAME/$GITHUB_REPO_NAME"
echo "   Repo: $REPO_URL"
echo ""

# Check for workflow file
echo "🔍 Checking if workflow file exists on GitHub..."
WORKFLOW_URL="$REPO_URL/blob/main/.github/workflows/import-products.yml"
echo "   Expected at: $WORKFLOW_URL"
echo ""
echo "   ⚠️  If you get 404, the workflow file hasn't been pushed yet."
echo "   Wait for Bolt to finish syncing, then run this script again."
echo ""
read -p "Press Enter to continue (or Ctrl+C to exit)..."
echo ""

# Get GitHub token
echo "🔑 Creating GitHub Personal Access Token..."
echo ""
echo "1. Go to: https://github.com/settings/tokens/new"
echo "2. Name: Revoa AI Agent"
echo "3. Scopes: ✅ repo + ✅ workflow"
echo "4. Generate token"
echo ""
read -p "Paste your GitHub token (ghp_...): " GITHUB_TOKEN
echo ""

# Set Supabase secrets
echo "🔐 Setting Supabase Edge Function secrets..."
echo ""

if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    npm install -g supabase
fi

echo "Logging in to Supabase..."
supabase login

echo "Linking to project..."
supabase link --project-ref iipaykvimkbbnoobtpzz

echo "Setting secrets..."
supabase secrets set GITHUB_TOKEN="$GITHUB_TOKEN"
supabase secrets set GITHUB_OWNER="$GITHUB_USERNAME"
supabase secrets set GITHUB_REPO="$GITHUB_REPO_NAME"

echo ""
echo "✅ Supabase secrets configured!"
echo ""

# Redeploy functions
echo "🔄 Redeploying edge functions..."
supabase functions deploy agent-dispatch
echo ""
echo "✅ Functions redeployed!"
echo ""

# GitHub secrets instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 IMPORTANT: Set GitHub Repository Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Go to: $REPO_URL/settings/secrets/actions"
echo ""
echo "Click 'New repository secret' and add:"
echo ""
echo "1. Name: SUPABASE_URL"
echo "   Value: https://iipaykvimkbbnoobtpzz.supabase.co"
echo ""
echo "2. Name: SUPABASE_ANON_KEY"
echo "   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcGF5a3ZpbWtiYm5vb2J0cHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjU4MTgsImV4cCI6MjA1Nzc0MTgxOH0.qjJd6vbFZMHiTR7IA8IGtVxAzFuPbR5YHcAtLTSlUlA"
echo ""
echo "3. Name: SUPABASE_SERVICE_ROLE"
echo "   Value: Get from https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/settings/api"
echo "   (Look for 'service_role' key)"
echo ""
echo "4. Admin Auth - Choose ONE option:"
echo ""
echo "   Option A: Name: REVOA_ADMIN_TOKEN"
echo "             Value: Your admin JWT token"
echo ""
echo "   Option B: Name: REVOA_ADMIN_EMAIL"
echo "             Value: your-email@example.com"
echo "             AND"
echo "             Name: REVOA_ADMIN_PASSWORD"
echo "             Value: your-password"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Press Enter after setting GitHub secrets..."
echo ""

# Enable GitHub Actions
echo "📋 Final Steps:"
echo ""
echo "1. Go to: $REPO_URL/settings/actions"
echo "2. Under 'Actions permissions', select:"
echo "   ✅ 'Allow all actions and reusable workflows'"
echo "3. Save changes"
echo ""
echo "4. Go to: $REPO_URL/actions"
echo "5. You should see 'Import Products (AI Agent)' workflow"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test Real Mode:"
echo "1. Open: /admin/ai-import"
echo "2. Click 'Run AI Agent Now' (Real Mode)"
echo "3. Job should start and link to GitHub Actions run"
echo ""
echo "📊 Monitor at:"
echo "   GitHub: $REPO_URL/actions"
echo "   Supabase: https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/logs/edge-functions"
echo ""
