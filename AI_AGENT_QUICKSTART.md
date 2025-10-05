# AI Agent Quick Start - READY TO USE!

## What's Ready

I've created a complete Python import script that's ready for your AI agent to use. Everything is configured and ready to go!

## Files Created

1. **`ai_agent_import.py`** - The import script (fully configured)
2. **`FOR_AI_AGENT.md`** - Instructions for your AI agent
3. **`SUMMARY_FOR_YOU.md`** - Quick reference for you

## Before You Start

### Check if tyler@revoa.app Exists

**Option 1: Check in Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project (0ec90b57d6e95fcbda19832f)
3. Go to Authentication → Users
4. Search for `tyler@revoa.app`

**Option 2: Try to Login**
1. Go to https://members.revoa.app
2. Try logging in with:
   - Email: tyler@revoa.app
   - Password: RevoaAI17

### If tyler@revoa.app Doesn't Exist

**Create it via Supabase Dashboard:**

1. Go to your Supabase Dashboard
2. Authentication → Users → Add User
3. Fill in:
   - Email: `tyler@revoa.app`
   - Password: `RevoaAI17`
   - Auto-confirm email: ✅ (check this)
4. Click "Create User"

**Then set admin permissions:**

1. Go to Table Editor → `user_profiles`
2. Find the row where `user_id` matches tyler's UUID
3. Set these columns:
   - `is_admin`: `true`
   - `admin_role`: `super_admin` (or `admin`)
4. Click Save

### If No user_profiles Row Exists

If there's no row in user_profiles for tyler:

1. Get tyler's user UUID from auth.users
2. In Table Editor → user_profiles → Insert Row
3. Fill in:
   - `user_id`: [tyler's UUID from auth.users]
   - `email`: `tyler@revoa.app`
   - `is_admin`: `true`
   - `admin_role`: `super_admin`
4. Click Insert

## How to Use

### Option A: Run It Yourself (Local Machine)

```bash
# Make sure you have Python 3 and requests library
pip install requests

# Run the script
python ai_agent_import.py
```

Expected output:
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
   - abc123-def456-...
   - xyz789-uvw012-...
   - mno345-pqr678-...

🎉 Success! Products are now pending approval.
📍 Review at: https://members.revoa.app/admin/products
```

### Option B: Give to AI Agent

**Copy this message and send to your AI agent:**

---

Hi! I have a Python script ready for you to import products into my Revoa platform.

**What you need to do:**

1. The script file is `ai_agent_import.py` (I'll share the contents below)
2. Run it in your Python environment
3. Report back the results

**Requirements:**
- Python 3.7+
- `requests` library (install with `pip install requests`)

**The script is fully configured with:**
- Admin credentials: tyler@revoa.app / RevoaAI17
- 3 pilot products pre-loaded
- Automatic login and import

Just run: `python ai_agent_import.py`

**Script contents:**
```python
[Copy the contents of ai_agent_import.py here]
```

After you run it, report back:
- ✅ How many products imported successfully
- ❌ Any errors that occurred
- 📋 The product IDs created

Once imported, I'll review and approve them in the admin panel!

---

## After Import

1. **Check Admin Panel**
   - Go to https://members.revoa.app/admin/products
   - You should see 3 products with "pending" status

2. **Review Products**
   - Solar Step Lights ($9.80 → $29.40)
   - Draft Stopper ($6.50 → $19.50)
   - Resistance Bands ($11.00 → $33.00)

3. **Approve Them**
   - Click on each product
   - Review the details
   - Click "Approve" (green checkmark)

4. **Verify in Catalog**
   - Go to https://members.revoa.app/products
   - Products should now be visible to all users

## What the AI Agent Does Next

After this pilot succeeds, the AI agent can:

1. **Upload Real Assets**
   - Download images from Instagram reels
   - Upload to Supabase Storage: `product-assets` bucket
   - Update products with real image URLs

2. **Verify Pricing**
   - Check Amazon and AliExpress for actual costs
   - Update supplier_price and recommended_retail_price
   - Add source URLs to metadata

3. **Create Marketing Content**
   - Generate text-free demo GIFs (1-5 seconds each)
   - Write ad copy variations
   - Create headline options

4. **Scale Up**
   - Import batches of 5-10 products
   - Use the same script, just modify the products array
   - Keep using external_id to prevent duplicates

## Troubleshooting

### Login Fails (400/401 error)

**Problem:** tyler@revoa.app doesn't exist or password is wrong

**Solution:**
1. Go to Supabase Dashboard → Authentication → Users
2. Check if user exists
3. If not, create it (see "Before You Start" section above)
4. Make sure password is exactly: `RevoaAI17` (capital R, capital A, capital I)

### Login Succeeds But Import Fails (403 error)

**Problem:** User exists but doesn't have admin permissions

**Solution:**
1. Go to Supabase Dashboard → Table Editor → user_profiles
2. Find tyler@revoa.app's row
3. Set `is_admin` to `true`
4. Set `admin_role` to `super_admin`

### Products Don't Appear

**Problem:** Products are in "pending" status

**Solution:**
1. Go to https://members.revoa.app/admin/products
2. Click the "Pending" filter button (should be selected by default)
3. Products should be there
4. If not, check the import script output for errors

### Network/Connection Errors

**Problem:** Can't reach Supabase endpoint

**Solution:**
- Make sure you have internet connection
- Try running from a different network
- Check if Supabase is down: https://status.supabase.com/

## Need Help?

If you get stuck:
1. Check the error message carefully
2. Verify tyler@revoa.app exists and has admin permissions
3. Make sure the password is exactly `RevoaAI17`
4. Try running the script again (it's safe to re-run)

## Success Checklist

- [ ] tyler@revoa.app exists in Supabase Auth
- [ ] User has is_admin: true in user_profiles
- [ ] Script runs without errors
- [ ] 3 products appear in admin panel
- [ ] Products are in "pending" status
- [ ] You can approve products
- [ ] Approved products appear in /products catalog

Once all checkboxes are complete, the AI agent can start scaling up imports!

---

**Ready to go?** Run the script or give it to your AI agent!
