# Email Setup Checklist

## Issue: "Invitation created but email could not be sent"

This error occurs when the email service (Resend) cannot send the email. Here are the most common causes and solutions:

## ✅ Quick Fix Checklist

### 1. Verify Domain Configuration

In **Resend Dashboard** (https://resend.com/domains):

- [ ] Your domain is **verified** (green checkmark)
- [ ] DNS records are correctly added:
  - SPF record
  - DKIM records (usually 2)
  - DMARC record (optional but recommended)
- [ ] Domain status shows "Active" or "Verified"

**Note:** If you set up `notifications.revoa.app` in Resend, use that exact domain in your "from" address.

### 2. Update Supabase Secrets

Set the correct environment variables in Supabase:

```bash
# Your Resend API Key (starts with re_)
supabase secrets set RESEND_API_KEY=re_your_actual_key_here

# Your verified domain email (IMPORTANT: Match exactly what's in Resend)
supabase secrets set EMAIL_FROM="Revoa <noreply@notifications.revoa.app>"

# Your site URL for invitation links
supabase secrets set SITE_URL=https://members.revoa.app

# Optional: Set to development for testing
supabase secrets set ENV=development
```

### 3. Verify API Key Permissions

In **Resend Dashboard** → **API Keys**:

- [ ] API key has "Sending access" enabled
- [ ] API key is not expired
- [ ] Copy the key again if uncertain (you can't view it after creation)

### 4. Check "From" Email Address

The "from" email **must** match your verified domain in Resend:

- ✅ Correct: `noreply@notifications.revoa.app` (if `notifications.revoa.app` is verified)
- ❌ Wrong: `noreply@revoa.ai` (if `revoa.ai` is not verified)
- ❌ Wrong: `noreply@members.revoa.app` (if you only verified `notifications.revoa.app`)

### 5. Redeploy Edge Function

After updating secrets, redeploy the function:

```bash
supabase functions deploy send-admin-invitation
```

Or if using Supabase Dashboard:
1. Go to Edge Functions
2. Find `send-admin-invitation`
3. Click "Redeploy"

## 🔍 Debugging Steps

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **send-admin-invitation**
3. Click on **Logs** tab
4. Look for recent invocations

You'll see detailed logs like:
```
Attempting to send email with payload: {
  from: "Revoa <noreply@notifications.revoa.app>",
  to: "user@example.com",
  subject: "You've been invited..."
}

Resend API response: {
  status: 400,
  result: { message: "Domain not verified" }
}
```

### Check Browser Console

After sending an invitation:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for the grouped log: "📧 Email Sending Failed"
4. This will show the exact error from Resend

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Domain not verified" | Domain not verified in Resend | Complete DNS verification in Resend |
| "Invalid API key" | Wrong or expired key | Generate new API key in Resend |
| "Unauthorized" | API key missing or incorrect | Set RESEND_API_KEY secret |
| "Invalid from address" | From email doesn't match verified domain | Update EMAIL_FROM to match verified domain |
| "Rate limit exceeded" | Too many emails sent | Wait or upgrade Resend plan |

## 🧪 Testing Without Email (Development)

If you want to test invitations without sending actual emails:

1. Set development mode:
   ```bash
   supabase secrets set ENV=development
   ```

2. The invitation link will be returned in the response and logged to console

3. Copy the link from console and share it manually

## 📝 Current Setup Summary

Based on your description:

- **Resend Domain**: `notifications.revoa.app` ✅
- **Netlify Domain**: `members.revoa.app` (alias)
- **Issue**: From address likely doesn't match

### Required Changes

1. Set the EMAIL_FROM secret to use your verified domain:
   ```bash
   supabase secrets set EMAIL_FROM="Revoa <noreply@notifications.revoa.app>"
   ```

2. Redeploy the Edge Function

3. Try sending an invitation again

4. Check the browser console for detailed error info

## 📧 Alternative: Use members.revoa.app

If you want to use `members.revoa.app` for emails instead:

1. Go to Resend Dashboard
2. Add `members.revoa.app` as a new domain
3. Add the DNS records
4. Wait for verification
5. Update EMAIL_FROM:
   ```bash
   supabase secrets set EMAIL_FROM="Revoa <noreply@members.revoa.app>"
   ```

## 🆘 Still Not Working?

If emails still aren't sending after following these steps:

1. Share the error details from the browser console (📧 Email Sending Failed group)
2. Check Resend's status page: https://status.resend.com
3. Verify you're not on Resend's free tier limits (100 emails/day)
4. Contact Resend support with your domain and error details

## ✅ Success Indicators

You'll know it's working when:

1. Toast notification says: "Invitation sent to [email]" ✅
2. Browser console shows: "✅ Email sent successfully"
3. Recipient receives the email
4. Pending invitation appears in the admin dashboard

## 🔗 Helpful Links

- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
