# OAuth Callback Fix - Static HTML to React Component

## 🐛 The Problem

The OAuth popup was loading the Revoa app instead of redirecting to Shopify's OAuth page. This happened because:

1. The callback was using a static HTML file (`/public/shopify-callback.html`)
2. Static HTML files can't access `import.meta.env` (a Vite feature)
3. `import.meta.env.VITE_SUPABASE_URL` returned `undefined`
4. The callback failed and loaded the main app instead

## ✅ The Solution

Converted the static HTML callback to a **proper React component** that gets processed by Vite:

### Changes Made:

1. **Created New React Component:**
   - `/src/pages/ShopifyCallback.tsx` - Full React component with proper env variable access

2. **Updated Routing:**
   - Added route in `src/App.tsx`: `/shopify-callback`

3. **Updated Configuration:**
   - Changed redirect URI from `/shopify-callback.html` → `/shopify-callback`
   - Updated files:
     - `.env`
     - `.env.example`
     - `src/lib/shopify/config.ts`
     - `shopify.app.toml`

4. **Old File:**
   - Kept `/public/shopify-callback.html` for backward compatibility
   - Can be deleted after testing new flow

---

## 🔧 What You Need to Update

### ⚠️ IMPORTANT: Update Shopify Partner Dashboard

You need to update your redirect URLs in the **Shopify Partner Dashboard**:

#### Old URLs (Remove or Update):
```
❌ https://members.revoa.app/shopify-callback.html
❌ http://localhost:5173/shopify-callback.html
```

#### New URLs (Add These):
```
✅ https://members.revoa.app/shopify-callback
✅ http://localhost:5173/shopify-callback
```

### Steps:
1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Select your app
3. Click "Configuration"
4. Scroll to "App setup" → "URLs" section
5. Find "Allowed redirection URL(s)"
6. **Replace** the `.html` URLs with the new React route URLs
7. Click "Save"

---

## 🧪 How to Test

### 1. Local Testing:
```bash
npm run dev
```

1. Go to Settings
2. Click "Connect Shopify"
3. Enter your store URL
4. **Expected:** Popup should redirect to Shopify's OAuth page (not your app)
5. Approve the app
6. **Expected:** Popup shows success message and closes
7. **Expected:** Main window shows "Connected" status

### 2. Production Testing:
1. Deploy to production
2. Follow same steps as local testing
3. Verify OAuth flow works correctly

---

## 📋 Technical Details

### Why This Fix Works:

**Before (Broken):**
```html
<!-- /public/shopify-callback.html -->
<script type="module">
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;  // ❌ undefined!
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;  // ❌ undefined!
</script>
```
- Static files in `/public` are NOT processed by Vite
- `import.meta.env` doesn't work
- Variables are `undefined`
- Callback fails

**After (Fixed):**
```tsx
// /src/pages/ShopifyCallback.tsx
export default function ShopifyCallback() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;  // ✅ Works!
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;  // ✅ Works!
  // ...
}
```
- React components in `/src` ARE processed by Vite
- `import.meta.env` works correctly
- Variables have correct values
- Callback succeeds

### Component Features:

✅ **Proper env variable access**
✅ **React Router integration**
✅ **Beautiful loading/success/error states**
✅ **PostMessage to parent window**
✅ **LocalStorage fallback**
✅ **Auto-close popup on success**
✅ **Redirect to settings if not in popup**

---

## 🎨 UI/UX Improvements

The new React component provides:

1. **Loading State:**
   - Spinning loader
   - "Connecting to Shopify" message

2. **Success State:**
   - Checkmark icon with gradient
   - "Installation Complete!" message
   - Auto-closes after 1.5 seconds

3. **Error State:**
   - Error icon
   - Clear error message
   - Technical details in code block
   - Auto-closes after 5 seconds

---

## 🔄 Migration Checklist

- [x] Created new React component (`ShopifyCallback.tsx`)
- [x] Added route to `App.tsx`
- [x] Updated redirect URI in config files
- [x] Updated `.env` and `.env.example`
- [x] Updated `shopify.app.toml`
- [x] Build successful
- [ ] **Update Shopify Partner Dashboard redirect URLs**
- [ ] Test OAuth flow locally
- [ ] Deploy to production
- [ ] Test OAuth flow in production
- [ ] (Optional) Remove old `/public/shopify-callback.html`

---

## 📝 Files Changed

1. ✅ `/src/pages/ShopifyCallback.tsx` - New React component
2. ✅ `/src/App.tsx` - Added route
3. ✅ `/src/lib/shopify/config.ts` - Updated default redirect URI
4. ✅ `/.env` - Updated redirect URI
5. ✅ `/.env.example` - Updated redirect URI
6. ✅ `/shopify.app.toml` - Updated redirect URLs

---

## ⚡ Next Steps

1. **Update Shopify Partner Dashboard** (see instructions above)
2. **Test the OAuth flow**:
   ```bash
   npm run dev
   # Navigate to Settings → Connect Shopify
   ```
3. **Verify in console**:
   - Should see: `[Callback] OAuth callback received`
   - Should see: `[Callback] OAuth completed successfully`
   - Should NOT see any "undefined" errors

4. **Deploy to production**
5. **Test in production**

---

## 🐞 Troubleshooting

### If OAuth still doesn't work:

1. **Check Shopify Partner Dashboard:**
   - Verify redirect URLs are updated (no `.html`)
   - Verify Client ID matches your `.env` file

2. **Check Browser Console:**
   - Look for `[Callback]` logs
   - Check for any errors about missing env variables

3. **Check Environment Variables:**
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SHOPIFY_CLIENT_ID
   echo $VITE_SHOPIFY_REDIRECT_URI
   ```
   - All should have values (not empty)

4. **Clear Browser Cache & LocalStorage:**
   - Old OAuth sessions might be cached
   - Clear and try again

5. **Verify Route Works:**
   - Navigate to `http://localhost:5173/shopify-callback`
   - Should see the React component (not a 404)

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Clicking "Connect Shopify" opens popup
2. ✅ Popup redirects to `https://yourstore.myshopify.com/admin/oauth/authorize`
3. ✅ After approval, redirected to `https://members.revoa.app/shopify-callback?code=...`
4. ✅ Popup shows "Installation Complete!" message
5. ✅ Popup auto-closes
6. ✅ Main window shows "Connected" status
7. ✅ Dashboard loads with real analytics data

---

**Status:** ✅ Ready to test (after updating Shopify Partner Dashboard)
