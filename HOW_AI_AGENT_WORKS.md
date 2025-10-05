# How the AI Agent Product Import Works

## Overview

The AI agent will use a Python script to automatically import products into your Revoa platform. Here's how it all fits together:

## The Setup (What We Just Did)

### 1. **The Import Script** (`ai_agent_import.py`)
   - Located in your project root directory
   - Written in Python (works anywhere Python 3 is installed)
   - Contains automatic login functionality
   - Has the 3 pilot products pre-configured

### 2. **Admin Account** (`tyler@revoa.app`)
   - Email: `tyler@revoa.app`
   - Password: `RevoaAI17`
   - This account needs to have `is_admin: true` in the database

### 3. **The Import API** (Already exists in your system)
   - Edge Function: `supabase/functions/import-products/index.ts`
   - Endpoint: `https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/import-products`
   - Handles bulk product imports with images, media, creatives, variants

## How It Works (Step by Step)

```
┌─────────────────────────────────────────────────────────────┐
│  1. AI Agent (or you) runs: python ai_agent_import.py      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Script logs in with tyler@revoa.app / RevoaAI17         │
│     → Gets JWT access token from Supabase Auth              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Script sends 3 products to import-products API          │
│     → Solar Step Lights                                     │
│     → Under-Door Draft Stopper                              │
│     → Resistance Bands Set                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. API validates admin permissions                         │
│     → Checks if user has is_admin: true                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. API creates products in database                        │
│     → Sets approval_status: "pending"                       │
│     → Stores images, creatives, metadata                    │
│     → Returns product IDs                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. You review products in admin panel                      │
│     → Go to https://members.revoa.app/admin/products        │
│     → Click on each product to review                       │
│     → Click "Approve" or "Reject"                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Approved products appear in user catalog                │
│     → Users see them at /products                           │
│     → Users can add them to their Shopify stores            │
└─────────────────────────────────────────────────────────────┘
```

## Who Runs the Script?

**Three Options:**

### Option A: You Run It Here (in this Bolt project)
```bash
cd /tmp/cc-agent/52284140/project
python3 ai_agent_import.py
```

**Pros:**
- Quick testing
- You control when it runs
- Can see output immediately

**Cons:**
- Manual process
- Have to run it each time

### Option B: AI Agent Runs It (ChatGPT/Claude with code execution)
- Give the AI agent the script file content
- They run it in their Python environment
- They report results back to you

**Pros:**
- Fully automated
- AI agent handles scheduling
- Can run on a schedule

**Cons:**
- Less direct control
- Harder to debug if issues occur

### Option C: Set Up Automated Cron Job
- Put script on a server
- Schedule with cron/systemd
- Runs automatically on schedule

**Pros:**
- Completely hands-off
- Reliable scheduling
- Production-ready

**Cons:**
- Requires server setup
- More complex infrastructure

## For Your AI Agent

Share this with your AI agent (ChatGPT/Claude/etc):

```
I have a Python script ready for you to import products into my Revoa platform.

Here's what you need to do:

1. Use this script: /tmp/cc-agent/52284140/project/ai_agent_import.py
   (I'll share the contents with you)

2. The credentials are already configured:
   - Email: tyler@revoa.app
   - Password: RevoaAI17

3. Run the script in your Python environment

4. Report back the results (successful/failed products)

5. After I approve them in the admin panel, you can:
   - Upload actual product images/videos
   - Update prices with real Amazon/AliExpress data
   - Add more products in batches

The script has 3 pilot products pre-configured. After this test succeeds,
we can scale to larger batches (5-10 products at a time).
```

## Testing Right Now

Want to test it immediately? Run this:

```bash
cd /tmp/cc-agent/52284140/project
python3 ai_agent_import.py
```

You should see:
```
============================================================
🤖 Revoa AI Agent - Product Import Tool
============================================================
🔐 Logging in as tyler@revoa.app...
✅ Login successful!

📦 Importing 3 products...

✅ Import completed!
   Total: 3
   Successful: 3
   Failed: 0

📋 Product IDs created:
   - <uuid-1>
   - <uuid-2>
   - <uuid-3>

🎉 Success! Products are now pending approval.
📍 Review at: https://members.revoa.app/admin/products
```

## What Happens Next

After running the script:

1. **Immediately**: Products appear in admin panel as "pending"
2. **You review**: Check names, descriptions, pricing at `/admin/products`
3. **You approve**: Click the green checkmark on each product
4. **Users see them**: Products appear in `/products` catalog
5. **AI agent continues**: They can now upload images and refine data

## Security Notes

- The script uses environment credentials (email/password)
- JWT tokens expire after ~1 hour (script logs in each time)
- Only admins can import products (enforced by API)
- All imports are logged in `product_import_logs` table
- Products require explicit approval before being visible

## Troubleshooting

**Login fails:**
- Check that tyler@revoa.app exists in auth.users
- Verify password is exactly: RevoaAI17
- Ensure user has is_admin: true in user_profiles

**Import fails:**
- Check API logs in Supabase dashboard
- Verify Edge Function is deployed
- Check CORS headers if running from browser

**Products don't appear:**
- They're in "pending" status - check filter in admin panel
- Check approval_status column in products table
