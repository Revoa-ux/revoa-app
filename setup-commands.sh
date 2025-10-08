#!/bin/bash
# Real Mode Setup Commands - Copy and paste these

set -e

echo "🚀 Setting up Real Mode for AI Agent"
echo ""

# ===========================================
# STEP 1: PUSH TO GITHUB
# ===========================================
echo "📤 STEP 1: Push to GitHub"
echo ""
echo "Run these commands:"
echo ""
cat << 'EOF'
# Initialize and commit
git add .
git commit -m "Add AI Agent workflow with price-first importer"

# Option A: Create new repo with GitHub CLI
gh repo create revoa-app --private --source=. --remote=origin --push

# Option B: Use existing repo (replace USERNAME and REPO)
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
EOF
echo ""
read -p "Press Enter after pushing to GitHub..."
echo ""

# ===========================================
# STEP 2: GET GITHUB INFO
# ===========================================
echo "📝 STEP 2: Enter GitHub information"
echo ""
read -p "GitHub Username: " GITHUB_USERNAME
read -p "GitHub Repo Name: " GITHUB_REPO_NAME
read -p "GitHub Personal Access Token (ghp_...): " GITHUB_TOKEN
echo ""

# ===========================================
# STEP 3: SET SUPABASE SECRETS
# ===========================================
echo "🔐 STEP 3: Setting Supabase Edge Function secrets"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    npm install -g supabase
fi

# Login to Supabase
echo "Logging in to Supabase..."
supabase login

# Link project
PROJECT_REF="iipaykvimkbbnoobtpzz"
echo "Linking to project: $PROJECT_REF"
supabase link --project-ref $PROJECT_REF

# Set secrets
echo "Setting GITHUB_TOKEN..."
echo "$GITHUB_TOKEN" | supabase secrets set GITHUB_TOKEN="$GITHUB_TOKEN"

echo "Setting GITHUB_OWNER..."
supabase secrets set GITHUB_OWNER="$GITHUB_USERNAME"

echo "Setting GITHUB_REPO..."
supabase secrets set GITHUB_REPO="$GITHUB_REPO_NAME"

echo ""
echo "✅ Supabase secrets configured!"
echo ""

# Verify
echo "Verifying secrets..."
supabase secrets list
echo ""

# ===========================================
# STEP 4: REDEPLOY EDGE FUNCTIONS
# ===========================================
echo "🔄 STEP 4: Redeploying edge functions"
echo ""

supabase functions deploy agent-dispatch
echo ""
echo "✅ Edge functions redeployed!"
echo ""

# ===========================================
# STEP 5: GITHUB REPO SECRETS
# ===========================================
echo "🔑 STEP 5: Set GitHub Repository Secrets"
echo ""
echo "Go to: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO_NAME/settings/secrets/actions"
echo ""
echo "Add these secrets (copy-paste the values):"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret: SUPABASE_URL"
echo "Value:"
echo "https://iipaykvimkbbnoobtpzz.supabase.co"
echo ""
echo "Secret: SUPABASE_ANON_KEY"
echo "Value:"
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcGF5a3ZpbWtiYm5vb2J0cHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjU4MTgsImV4cCI6MjA1Nzc0MTgxOH0.qjJd6vbFZMHiTR7IA8IGtVxAzFuPbR5YHcAtLTSlUlA"
echo ""
echo "Secret: SUPABASE_SERVICE_ROLE"
echo "Value: (Get from: https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/settings/api)"
echo "       Look for 'service_role' secret key"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Admin Authentication (choose ONE):"
echo ""
echo "Option A - Use Admin Token:"
echo "  Secret: REVOA_ADMIN_TOKEN"
echo "  Value: (Generate a long-lived token for an admin user)"
echo ""
echo "Option B - Use Email/Password:"
echo "  Secret: REVOA_ADMIN_EMAIL"
echo "  Value: your-admin@email.com"
echo ""
echo "  Secret: REVOA_ADMIN_PASSWORD"
echo "  Value: your-admin-password"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Press Enter after setting GitHub secrets..."
echo ""

# ===========================================
# STEP 6: VERIFY
# ===========================================
echo "✅ Setup Complete!"
echo ""
echo "🧪 Test the setup:"
echo "1. Open: https://your-app.com/admin/ai-import"
echo "2. Click 'Run AI Agent Now' (Real Mode)"
echo "3. You should see:"
echo "   - Job status: queued → running"
echo "   - GitHub Actions link"
echo "4. After completion:"
echo "   - Check /admin/product-approvals"
echo "   - New products with pricing, images, GIFs"
echo ""
echo "📊 Monitor:"
echo "- GitHub Actions: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO_NAME/actions"
echo "- Supabase Logs: https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/logs/edge-functions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
