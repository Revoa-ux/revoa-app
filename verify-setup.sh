#!/bin/bash
# Quick verification script for Real Mode setup

set -e

echo "🔍 Verifying Real Mode Setup..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Git repository
echo "1️⃣  Checking Git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git branch --show-current)
    REMOTE=$(git remote get-url origin 2>/dev/null || echo "NOT SET")
    echo -e "${GREEN}✓${NC} Git initialized"
    echo "   Branch: $BRANCH"
    echo "   Remote: $REMOTE"

    if [[ "$REMOTE" == "NOT SET" ]]; then
        echo -e "${RED}✗${NC} No remote configured. Run: git remote add origin https://github.com/USERNAME/REPO.git"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Git not initialized. Run: git init"
    exit 1
fi
echo ""

# Check 2: Workflow file exists locally
echo "2️⃣  Checking workflow file..."
if [ -f ".github/workflows/import-products.yml" ]; then
    echo -e "${GREEN}✓${NC} Workflow file exists: .github/workflows/import-products.yml"
else
    echo -e "${RED}✗${NC} Workflow file missing!"
    exit 1
fi
echo ""

# Check 3: Python script exists
echo "3️⃣  Checking Python importer..."
if [ -f "scripts/revoa_import.py" ]; then
    echo -e "${GREEN}✓${NC} Python script exists: scripts/revoa_import.py"

    # Check for run_summary.json output
    if grep -q "run_summary.json" scripts/revoa_import.py; then
        echo -e "${GREEN}✓${NC} Script writes run_summary.json"
    else
        echo -e "${RED}✗${NC} Script doesn't write run_summary.json"
    fi

    # Check for UPSERT mode
    if grep -q '"mode": "upsert"' scripts/revoa_import.py; then
        echo -e "${GREEN}✓${NC} Script uses UPSERT mode"
    else
        echo -e "${YELLOW}⚠${NC} Script may not use UPSERT mode"
    fi
else
    echo -e "${RED}✗${NC} Python script missing!"
    exit 1
fi
echo ""

# Check 4: Edge function exists
echo "4️⃣  Checking edge functions..."
if [ -f "supabase/functions/agent-dispatch/index.ts" ]; then
    echo -e "${GREEN}✓${NC} agent-dispatch exists"

    # Check workflow file reference
    if grep -q "import-products.yml" supabase/functions/agent-dispatch/index.ts; then
        echo -e "${GREEN}✓${NC} References import-products.yml"
    else
        echo -e "${RED}✗${NC} Wrong workflow file reference!"
    fi
else
    echo -e "${RED}✗${NC} agent-dispatch missing!"
    exit 1
fi

if [ -f "supabase/functions/agent-callback/index.ts" ]; then
    echo -e "${GREEN}✓${NC} agent-callback exists"
else
    echo -e "${RED}✗${NC} agent-callback missing!"
fi

if [ -f "supabase/functions/import-products/index.ts" ]; then
    echo -e "${GREEN}✓${NC} import-products exists"
else
    echo -e "${RED}✗${NC} import-products missing!"
fi
echo ""

# Check 5: Check if pushed to GitHub
echo "5️⃣  Checking if code is pushed to GitHub..."
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}✓${NC} No uncommitted changes"

    # Check if pushed
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")

    if [ -z "$REMOTE" ]; then
        echo -e "${YELLOW}⚠${NC} Remote branch not set. Push with: git push -u origin main"
    elif [ "$LOCAL" = "$REMOTE" ]; then
        echo -e "${GREEN}✓${NC} Code is pushed to GitHub"
    else
        echo -e "${YELLOW}⚠${NC} Local commits not pushed. Run: git push"
    fi
else
    echo -e "${YELLOW}⚠${NC} Uncommitted changes. Run: git add . && git commit -m 'Setup AI Agent'"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo ""
echo "1. If not pushed, run:"
echo "   git add ."
echo "   git commit -m 'Add AI Agent workflow'"
echo "   git push origin main"
echo ""
echo "2. Create GitHub Personal Access Token:"
echo "   https://github.com/settings/tokens"
echo "   Scopes: repo + workflow"
echo ""
echo "3. Set Supabase secrets:"
echo "   npx supabase secrets set GITHUB_TOKEN=ghp_..."
echo "   npx supabase secrets set GITHUB_OWNER=username"
echo "   npx supabase secrets set GITHUB_REPO=repo-name"
echo ""
echo "4. Set GitHub repo secrets:"
echo "   Go to: https://github.com/USERNAME/REPO/settings/secrets/actions"
echo "   Add: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE"
echo "   Add: REVOA_ADMIN_TOKEN (or EMAIL+PASSWORD)"
echo ""
echo "5. Redeploy edge functions:"
echo "   npx supabase functions deploy agent-dispatch"
echo ""
echo "6. Test at: /admin/ai-import"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
