import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationRequest {
  userId: string;
  type: 'trial-ending-soon' | 'order-limit-warning' | 'order-limit-urgent' | 'subscription-upgraded' | 'subscription-cancelled';
  data?: {
    daysRemaining?: number;
    usagePercentage?: number;
    currentCount?: number;
    limit?: number;
    oldTier?: string;
    newTier?: string;
    shopDomain?: string;
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { userId, type, data = {} }: NotificationRequest = await req.json();

    // Get user email
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user?.user?.email) {
      throw new Error('User not found');
    }

    const email = user.user.email;
    const siteUrl = Deno.env.get('VITE_APP_URL') || 'https://members.revoa.app';

    // Generate email based on type
    let emailHtml: string;
    let subject: string;

    switch (type) {
      case 'trial-ending-soon':
        subject = `Your Revoa trial ends in ${data.daysRemaining || 7} days`;
        emailHtml = generateTrialEndingEmail(siteUrl, data.daysRemaining || 7);
        break;
      case 'order-limit-warning':
        subject = `You've reached ${data.usagePercentage || 80}% of your order limit`;
        emailHtml = generateOrderLimitWarningEmail(siteUrl, data);
        break;
      case 'order-limit-urgent':
        subject = `Urgent: You've reached ${data.usagePercentage || 95}% of your order limit`;
        emailHtml = generateOrderLimitUrgentEmail(siteUrl, data);
        break;
      case 'subscription-upgraded':
        subject = 'Your Revoa subscription has been upgraded';
        emailHtml = generateUpgradeConfirmationEmail(siteUrl, data);
        break;
      case 'subscription-cancelled':
        subject = 'Your Revoa subscription has been cancelled';
        emailHtml = generateCancellationEmail(siteUrl);
        break;
      default:
        throw new Error('Invalid notification type');
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Revoa <noreply@revoa.app>',
        to: [email],
        subject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending subscription notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateTrialEndingEmail(siteUrl: string, daysRemaining: number): string {
  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';
  const settingsUrl = `${siteUrl}/settings`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Trial is Ending Soon</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 48px 20px;">
          <tr>
            <td align="center">
              <table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <img src="${logoUrl}" alt="Revoa" width="48" height="48" style="display: block;" />
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111111; letter-spacing: -0.5px;">
                      Your trial ends in ${daysRemaining} days
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      Your 30-day free trial will end soon. To continue using Revoa without interruption, please review your subscription plan.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${settingsUrl}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Review Subscription
                    </a>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      After your trial ends, you'll need an active subscription to continue using Revoa.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 24px;">
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #999999;">
                      <a href="https://revoa.app" style="color: #999999; text-decoration: none;">revoa.app</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
                      Official Shopify App
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generateOrderLimitWarningEmail(siteUrl: string, data: any): string {
  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';
  const settingsUrl = `${siteUrl}/settings`;
  const percentage = data.usagePercentage || 80;
  const currentCount = data.currentCount || 0;
  const limit = data.limit || 0;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Approaching Order Limit</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 48px 20px;">
          <tr>
            <td align="center">
              <table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <img src="${logoUrl}" alt="Revoa" width="48" height="48" style="display: block;" />
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111111; letter-spacing: -0.5px;">
                      You're at ${percentage}% of your order limit
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      You've processed ${currentCount} of ${limit} orders this month. Consider upgrading to avoid service interruption.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${settingsUrl}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Upgrade Plan
                    </a>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      Upgrade now to ensure uninterrupted service and access to all features.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 24px;">
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #999999;">
                      <a href="https://revoa.app" style="color: #999999; text-decoration: none;">revoa.app</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
                      Official Shopify App
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generateOrderLimitUrgentEmail(siteUrl: string, data: any): string {
  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';
  const settingsUrl = `${siteUrl}/settings`;
  const percentage = data.usagePercentage || 95;
  const currentCount = data.currentCount || 0;
  const limit = data.limit || 0;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Urgent: Near Order Limit</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 48px 20px;">
          <tr>
            <td align="center">
              <table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <img src="${logoUrl}" alt="Revoa" width="48" height="48" style="display: block;" />
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111111; letter-spacing: -0.5px;">
                      Urgent: ${percentage}% of order limit reached
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      You've processed ${currentCount} of ${limit} orders. Upgrade immediately to avoid service disruption.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${settingsUrl}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Upgrade Now
                    </a>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      Once you reach your limit, some features may be temporarily restricted.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 24px;">
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #999999;">
                      <a href="https://revoa.app" style="color: #999999; text-decoration: none;">revoa.app</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
                      Official Shopify App
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generateUpgradeConfirmationEmail(siteUrl: string, data: any): string {
  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';
  const settingsUrl = `${siteUrl}/settings`;
  const newTier = data.newTier || 'your new plan';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Upgraded</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 48px 20px;">
          <tr>
            <td align="center">
              <table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <img src="${logoUrl}" alt="Revoa" width="48" height="48" style="display: block;" />
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111111; letter-spacing: -0.5px;">
                      Subscription upgraded
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      Your Revoa subscription has been successfully upgraded to ${newTier}. You now have access to all the features of your new plan.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${settingsUrl}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      View Subscription
                    </a>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      Your billing will be updated automatically on your next invoice.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 24px;">
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #999999;">
                      <a href="https://revoa.app" style="color: #999999; text-decoration: none;">revoa.app</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
                      Official Shopify App
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function generateCancellationEmail(siteUrl: string): string {
  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';
  const supportUrl = `${siteUrl}/chat`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Cancelled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 48px 20px;">
          <tr>
            <td align="center">
              <table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%;">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <img src="${logoUrl}" alt="Revoa" width="48" height="48" style="display: block;" />
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111111; letter-spacing: -0.5px;">
                      Subscription cancelled
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      Your Revoa subscription has been cancelled. You'll continue to have access until the end of your current billing period.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${supportUrl}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Contact Support
                    </a>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      We're sorry to see you go. If there's anything we can do to improve, please let us know.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom: 24px;">
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #999999;">
                      <a href="https://revoa.app" style="color: #999999; text-decoration: none;">revoa.app</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #bbbbbb;">
                      Official Shopify App
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
