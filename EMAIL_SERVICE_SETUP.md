# Email Service Setup for Admin Invitations

The admin invitation system requires an email service to send invitation emails. Currently, the system is integrated with **Resend** (https://resend.com), a modern email API service.

## Current Status

⚠️ **Email service is not configured yet.** The invitation system will create invitations in the database, but emails will not be sent until you configure the email service.

## Quick Setup with Resend

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Revoa Production")
5. Copy the API key (it starts with `re_`)

### Step 3: Configure Domain (Optional but Recommended)

For production use, you should verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `revoa.ai`)
4. Add the DNS records provided by Resend to your domain's DNS settings
5. Wait for verification (usually takes a few minutes)

Without a verified domain, emails will be sent from a Resend sandbox domain and may be limited.

### Step 4: Add API Key to Supabase

You need to add the Resend API key as a secret in your Supabase project:

#### Option A: Using Supabase CLI (Recommended)

```bash
# If you haven't installed Supabase CLI yet:
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set the secret
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

#### Option B: Using Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Click **Add New Secret**
5. Name: `RESEND_API_KEY`
6. Value: Your Resend API key (starts with `re_`)
7. Click **Save**

### Step 5: Configure Site URL (Important!)

Make sure your `SITE_URL` environment variable is set correctly:

```bash
supabase secrets set SITE_URL=https://your-actual-domain.com
```

This URL is used to generate the invitation links in the emails.

### Step 6: Update Email "From" Address

Edit the Edge Function to use your verified domain:

In `supabase/functions/send-admin-invitation/index.ts`, line 82:

```typescript
from: 'Revoa <noreply@revoa.ai>',  // Change to your verified domain
```

Replace `revoa.ai` with your verified domain.

### Step 7: Deploy the Edge Function

After making changes, redeploy the Edge Function:

```bash
supabase functions deploy send-admin-invitation
```

## Testing the Setup

1. Try sending an invitation from the admin panel
2. Check the browser console for any error messages
3. If email doesn't arrive:
   - Check Resend dashboard for delivery logs
   - Check spam folder
   - Verify API key is correct
   - Verify domain is verified (if using custom domain)

## Development/Testing Without Email

For development or testing without setting up email, you can:

1. Set `ENV=development` in your Supabase secrets
2. The invitation link will be returned in the API response and logged to console
3. Copy the invitation link from the browser console and share it manually

## Alternative Email Services

If you prefer to use a different email service instead of Resend, you can modify the `send-admin-invitation` Edge Function to use:

- **SendGrid**: https://sendgrid.com
- **Mailgun**: https://www.mailgun.com
- **AWS SES**: https://aws.amazon.com/ses/
- **Postmark**: https://postmarkapp.com

The email sending code is in `supabase/functions/send-admin-invitation/index.ts` (lines 73-87).

## Troubleshooting

### Emails Not Being Sent

1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly
2. **Check Logs**: View Supabase Edge Function logs for errors
3. **Check Resend Dashboard**: Look for failed delivery attempts
4. **Verify Domain**: If using custom domain, ensure DNS records are correct

### Emails Going to Spam

1. Verify your domain in Resend
2. Add SPF, DKIM, and DMARC records to your DNS
3. Use a professional "from" address (e.g., `noreply@yourdomain.com`)

### Rate Limits

- Resend free tier: 100 emails/day
- For higher volume, upgrade to a paid plan

## Current Configuration Status

To check if email is configured, look for this warning in the Edge Function logs:

```
RESEND_API_KEY not configured - email not sent
```

If you see this, the email service needs to be set up following the steps above.

## Need Help?

- Resend Documentation: https://resend.com/docs
- Supabase Secrets: https://supabase.com/docs/guides/functions/secrets
- Contact support if you need assistance with setup
