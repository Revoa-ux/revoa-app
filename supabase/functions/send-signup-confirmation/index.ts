import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, email } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabaseClient
      .from('signup_confirmation_tokens')
      .delete()
      .eq('user_id', userId)
      .is('confirmed_at', null);

    const { error: tokenError } = await supabaseClient
      .from('signup_confirmation_tokens')
      .insert({
        user_id: userId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Error creating confirmation token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to create confirmation token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://members.revoa.app';
    const confirmationLink = `${siteUrl}/confirm-email?token=${token}`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('EMAIL_FROM') || 'Revoa <noreply@notifications.revoa.app>';
    let emailSent = false;
    let emailError: any = null;

    if (resendApiKey) {
      try {
        const emailPayload = {
          from: fromEmail,
          to: email,
          subject: 'Confirm your Revoa account',
          html: generateConfirmationEmail(confirmationLink),
        };

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();

        if (emailResponse.ok) {
          emailSent = true;
          console.log('Confirmation email sent successfully');
        } else {
          emailError = emailResult;
          console.error('Email sending failed:', emailResult);
        }
      } catch (error) {
        emailError = error;
        console.error('Exception sending email:', error);
      }
    } else {
      console.warn('RESEND_API_KEY not configured');
      emailError = 'Email service not configured';
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: emailSent 
          ? 'Confirmation email sent successfully' 
          : 'Account created but confirmation email could not be sent',
        confirmationLink: Deno.env.get('ENV') === 'development' ? confirmationLink : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-signup-confirmation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateConfirmationEmail(confirmationLink: string): string {
  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirm Your Revoa Account</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 48px 20px;">
          <tr>
            <td align="center">
              <table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%;">
                <!-- Logo -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <img src="${logoUrl}" alt="Revoa" width="48" height="48" style="display: block;" />
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111111; letter-spacing: -0.5px;">
                      Confirm your account
                    </h1>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      Thank you for signing up for Revoa. To confirm your account, please click the button below.
                    </p>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${confirmationLink}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Confirm Account
                    </a>
                  </td>
                </tr>

                <!-- Expiry Note -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
                  </td>
                </tr>

                <!-- Fallback Link -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #999999;">
                      Link not working? Copy and paste this URL:
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #666666; word-break: break-all;">
                      <a href="${confirmationLink}" style="color: #666666; text-decoration: underline;">${confirmationLink}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
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
