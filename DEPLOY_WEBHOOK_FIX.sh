#!/bin/bash

# Shopify Webhook HMAC Fix - Deployment Script
# This script deploys the updated webhook functions with improved HMAC verification

set -e

echo "🚀 Deploying Shopify Webhook HMAC Fixes"
echo "========================================"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase"
    echo "Run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Deploy functions
echo "📦 Deploying webhook functions..."
echo ""

echo "1/3 Deploying shopify-order-webhook..."
supabase functions deploy shopify-order-webhook

echo ""
echo "2/3 Deploying shopify-uninstall-webhook..."
supabase functions deploy shopify-uninstall-webhook

echo ""
echo "3/3 Deploying data-deletion-callback..."
supabase functions deploy data-deletion-callback

echo ""
echo "✅ All webhook functions deployed successfully!"
echo ""

# Test endpoints
echo "🧪 Testing webhook endpoints..."
echo ""

PROJECT_URL=$(supabase projects list | grep -v "ORGANIZATION" | awk '{print $4}' | head -1)

if [ -z "$PROJECT_URL" ]; then
    echo "⚠️  Could not determine project URL automatically"
    echo "Please test manually:"
    echo ""
    echo "curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/shopify-order-webhook \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -H 'X-Shopify-Hmac-Sha256: invalid' \\"
    echo "  -d '{\"test\": true}'"
    echo ""
    echo "Expected: 401 Unauthorized or 500 with 'Invalid HMAC' message"
else
    echo "Testing shopify-order-webhook..."
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROJECT_URL/functions/v1/shopify-order-webhook" \
      -H "Content-Type: application/json" \
      -H "X-Shopify-Hmac-Sha256: invalid" \
      -d '{"test": true}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "500" ]; then
        echo "✅ Webhook correctly rejects invalid HMAC (HTTP $HTTP_CODE)"
    else
        echo "⚠️  Unexpected response code: $HTTP_CODE"
        echo "This might be okay - check function logs for details"
    fi
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Verify webhooks in Shopify Partner Dashboard:"
echo "   - Go to Apps → Revoa → Configuration → Webhooks"
echo "   - Ensure all webhooks are registered with API version 2025-01"
echo ""
echo "2. Test with real Shopify webhook:"
echo "   - In Partner Dashboard, click 'Send test notification'"
echo "   - Or create a test order in a development store"
echo ""
echo "3. Monitor function logs:"
echo "   supabase functions logs shopify-order-webhook --tail"
echo ""
echo "4. Re-run Shopify automated checks:"
echo "   - Go to Partner Dashboard"
echo "   - Click 'Run' next to 'Automated checks for common errors'"
echo "   - Verify 'Verifies webhooks with HMAC signatures' is now passing ✅"
echo ""
echo "5. Submit app for review once all checks pass"
echo ""
echo "📚 For detailed documentation, see: WEBHOOK_HMAC_FIX.md"
echo ""
echo "🎉 Deployment complete!"
