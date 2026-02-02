#!/bin/bash

# Deploy facebook-ads-sync-chunk Edge Function
# Run this after logging in to Supabase CLI

set -e

echo "🚀 Deploying facebook-ads-sync-chunk Edge Function..."
echo ""

# Check if logged in
if ! npx supabase functions list > /dev/null 2>&1; then
  echo "❌ Not authenticated with Supabase CLI"
  echo ""
  echo "Please run one of the following:"
  echo ""
  echo "Option 1: Login interactively"
  echo "  npx supabase login"
  echo ""
  echo "Option 2: Set access token environment variable"
  echo "  export SUPABASE_ACCESS_TOKEN=your_token_here"
  echo ""
  echo "Get your access token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
npx supabase functions deploy facebook-ads-sync-chunk

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully deployed facebook-ads-sync-chunk!"
  echo ""
  echo "The two-phase sync system is now active."
  echo "You can now sync Facebook Ads with progress tracking."
else
  echo ""
  echo "❌ Deployment failed. Check the error above."
  exit 1
fi
