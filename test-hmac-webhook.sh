#!/bin/bash

# HMAC Webhook Test Script
# Tests if your webhooks are properly verifying HMAC signatures

echo "🔍 Testing Shopify Webhook HMAC Verification"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Shopify Client Secret
echo "📋 Enter your SHOPIFY_CLIENT_SECRET:"
read -s SHOPIFY_CLIENT_SECRET
echo ""

if [ -z "$SHOPIFY_CLIENT_SECRET" ]; then
  echo -e "${RED}❌ SHOPIFY_CLIENT_SECRET is required${NC}"
  exit 1
fi

# Test payload
TEST_PAYLOAD='{"id":12345,"name":"#1001"}'

# Calculate HMAC
HMAC=$(echo -n "$TEST_PAYLOAD" | openssl dgst -sha256 -hmac "$SHOPIFY_CLIENT_SECRET" -binary | base64)

echo "✅ Generated test HMAC: ${HMAC:0:20}..."
echo ""

# Test URLs from shopify.app.toml
URLS=(
  "https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback"
  "https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/shopify-uninstall-webhook"
  "https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/shopify-order-webhook"
)

for URL in "${URLS[@]}"; do
  echo "🧪 Testing: $URL"

  # Test with VALID HMAC (should return 200)
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Hmac-Sha256: $HMAC" \
    -H "X-Shopify-Shop-Domain: test-shop.myshopify.com" \
    -H "X-Shopify-Topic: app/uninstalled" \
    -H "X-Shopify-Webhook-Id: test-webhook-$(date +%s)" \
    -d "$TEST_PAYLOAD")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" == "200" ]; then
    echo -e "  ${GREEN}✅ Valid HMAC accepted (200)${NC}"
  else
    echo -e "  ${RED}❌ Valid HMAC rejected ($HTTP_CODE)${NC}"
    echo "  Response: $BODY"
  fi

  # Test with INVALID HMAC (should return 401)
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Hmac-Sha256: invalid_hmac_signature_12345678" \
    -H "X-Shopify-Shop-Domain: test-shop.myshopify.com" \
    -H "X-Shopify-Topic: app/uninstalled" \
    -H "X-Shopify-Webhook-Id: test-webhook-$(date +%s)" \
    -d "$TEST_PAYLOAD")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" == "401" ]; then
    echo -e "  ${GREEN}✅ Invalid HMAC rejected (401)${NC}"
  else
    echo -e "  ${RED}❌ Invalid HMAC not rejected ($HTTP_CODE)${NC}"
  fi

  echo ""
done

echo "=============================================="
echo "📊 Summary:"
echo ""
echo "Expected results:"
echo "  • Valid HMAC → 200 OK"
echo "  • Invalid HMAC → 401 Unauthorized"
echo ""
echo "If any test failed:"
echo "  1. Check SHOPIFY_CLIENT_SECRET in Supabase Dashboard"
echo "  2. Verify edge functions are deployed"
echo "  3. Check function logs for errors"
echo ""
echo "To check Supabase secrets:"
echo "  Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions"
