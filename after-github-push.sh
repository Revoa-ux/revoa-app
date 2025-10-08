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

# Get GitHub token first (needed to create workflow file)
echo "🔑 Creating GitHub Personal Access Token..."
echo ""
echo "1. Go to: https://github.com/settings/tokens/new"
echo "2. Name: Revoa AI Agent"
echo "3. Scopes: ✅ repo + ✅ workflow"
echo "4. Generate token"
echo ""
read -p "Paste your GitHub token (ghp_...): " GITHUB_TOKEN
echo ""

# Create workflow file on GitHub via API
echo "📝 Creating workflow file on GitHub..."
WORKFLOW_CONTENT=$(cat <<'EOF'
name: Import Products (AI Agent)

on:
  workflow_dispatch:
    inputs:
      job_id:
        description: 'Supabase import_jobs.id (UUID)'
        required: false
        type: string
      niche:
        description: 'Optional niche filter (home|lighting|fitness|all)'
        required: false
        default: 'all'
        type: string

jobs:
  import:
    runs-on: ubuntu-latest
    timeout-minutes: 90

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y ffmpeg curl

      - name: Install Python dependencies
        run: |
          pip install --upgrade pip
          pip install requests pyyaml opencv-python-headless pillow numpy yt-dlp

      - name: Verify required environment variables
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          if [ -z "$SUPABASE_URL" ]; then
            echo "ERROR: SUPABASE_URL secret not configured"
            exit 1
          fi
          if [ -z "$SUPABASE_ANON_KEY" ]; then
            echo "ERROR: SUPABASE_ANON_KEY secret not configured"
            exit 1
          fi
          echo "Environment variables verified"

      - name: Run product import script
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          REVOA_ADMIN_TOKEN: ${{ secrets.REVOA_ADMIN_TOKEN }}
          REVOA_ADMIN_EMAIL: ${{ secrets.REVOA_ADMIN_EMAIL }}
          REVOA_ADMIN_PASSWORD: ${{ secrets.REVOA_ADMIN_PASSWORD }}
          SUPABASE_SERVICE_ROLE: ${{ secrets.SUPABASE_SERVICE_ROLE }}
          JOB_ID: ${{ github.event.inputs.job_id }}
          NICHE: ${{ github.event.inputs.niche }}
          GITHUB_RUN_URL: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          mkdir -p logs
          echo "Starting import with JOB_ID: ${JOB_ID:-none}, NICHE: ${NICHE}"

          python scripts/revoa_import.py 2>&1 | tee logs/agent_output.log

          if [ ! -f run_summary.json ]; then
            echo '{"total":0,"successful":0,"failed":0,"skipped":0}' > run_summary.json
          fi

          echo "Import completed. Summary:"
          cat run_summary.json

      - name: Report success to Supabase
        if: success()
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE: ${{ secrets.SUPABASE_SERVICE_ROLE }}
        run: |
          JOB_ID="${{ github.event.inputs.job_id }}"
          if [ -z "$JOB_ID" ]; then
            JOB_ID="manual-${{ github.run_id }}"
          fi

          SUMMARY_JSON=$(cat run_summary.json)
          GITHUB_RUN_URL="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"

          echo "Reporting success to Supabase..."
          curl -sS -X POST \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE" \
            -H "Content-Type: application/json" \
            -d "{\"job_id\":\"${JOB_ID}\",\"status\":\"completed\",\"summary\":${SUMMARY_JSON},\"github_run_url\":\"${GITHUB_RUN_URL}\"}" \
            "$SUPABASE_URL/functions/v1/agent-callback"

      - name: Report failure to Supabase
        if: failure()
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE: ${{ secrets.SUPABASE_SERVICE_ROLE }}
        run: |
          JOB_ID="${{ github.event.inputs.job_id }}"
          if [ -z "$JOB_ID" ]; then
            JOB_ID="manual-${{ github.run_id }}"
          fi

          if [ -f run_summary.json ]; then
            SUMMARY_JSON=$(cat run_summary.json)
          else
            SUMMARY_JSON='{"total":0,"successful":0,"failed":1,"skipped":0}'
          fi

          GITHUB_RUN_URL="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"

          echo "Reporting failure to Supabase..."
          curl -sS -X POST \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE" \
            -H "Content-Type: application/json" \
            -d "{\"job_id\":\"${JOB_ID}\",\"status\":\"failed\",\"summary\":${SUMMARY_JSON},\"github_run_url\":\"${GITHUB_RUN_URL}\"}" \
            "$SUPABASE_URL/functions/v1/agent-callback"

      - name: Upload execution logs as artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: import-logs-${{ github.run_id }}
          path: |
            logs/agent_output.log
            run_summary.json
          retention-days: 30
EOF
)

# Encode to base64
WORKFLOW_BASE64=$(echo "$WORKFLOW_CONTENT" | base64)

# Create file via GitHub API
echo "   Uploading to GitHub..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$GITHUB_REPO_NAME/contents/.github/workflows/import-products.yml" \
  -d "{\"message\":\"Add GitHub Actions workflow for Real Mode\",\"content\":\"$WORKFLOW_BASE64\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Workflow file created successfully!"
else
  echo "   ⚠️  Response: $HTTP_CODE"
  echo "$RESPONSE_BODY" | head -5
  if echo "$RESPONSE_BODY" | grep -q "already exists"; then
    echo "   ✅ Workflow file already exists (ok)"
  else
    echo "   ⚠️  May need to create manually"
  fi
fi
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
