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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is super admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('is_admin, admin_role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin || profile.admin_role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can send invitations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role, invitation_token } = await req.json();

    if (!email || !role || !invitation_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invitation link
    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.netlify.app') || 'https://app.revoa.ai';
    const invitationLink = `${siteUrl}/admin/accept-invitation?token=${invitation_token}`;

    console.log('Admin Invitation Details:', {
      email,
      role,
      invitationLink,
      sentBy: user.email,
    });

    // Try to send email using Resend if configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('EMAIL_FROM') || 'Revoa <noreply@notifications.revoa.app>';
    let emailSent = false;
    let emailError: any = null;
    let emailDetails: any = null;

    if (resendApiKey) {
      try {
        const emailPayload = {
          from: fromEmail,
          to: email,
          subject: `You've been invited to join Revoa as ${role === 'super_admin' ? 'a' : 'an'} ${role === 'super_admin' ? 'Super Admin' : 'Admin'}`,
          html: generateInvitationEmail(role, invitationLink),
        };

        console.log('Attempting to send email with payload:', {
          from: emailPayload.from,
          to: emailPayload.to,
          subject: emailPayload.subject,
        });

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();
        emailDetails = emailResult;

        console.log('Resend API response:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          result: emailResult,
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log('✅ Email sent successfully:', emailResult);
        } else {
          emailError = emailResult;
          console.error('❌ Email sending failed:', {
            status: emailResponse.status,
            error: emailResult,
          });
        }
      } catch (error) {
        emailError = error;
        console.error('❌ Exception sending email:', error);
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY not configured - email not sent');
      emailError = 'Email service not configured';
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent ? 'Invitation sent successfully' : 'Invitation created but email could not be sent',
        emailSent,
        invitationLink: Deno.env.get('ENV') === 'development' ? invitationLink : undefined,
        emailError: emailError
          ? (typeof emailError === 'string'
              ? emailError
              : emailError.message || JSON.stringify(emailError))
          : undefined,
        emailDetails: !emailSent ? emailDetails : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending admin invitation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateInvitationEmail(role: string, invitationLink: string): string {
  const roleDisplay = role === 'super_admin' ? 'Super Admin' : 'Admin';
  const article = role === 'super_admin' ? 'a' : 'an';
  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join Revoa as ${article} ${roleDisplay}</title>
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
                      You've been invited
                    </h1>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      You've been invited to join Revoa as ${article} ${roleDisplay}. Click the button below to accept your invitation and get started.
                    </p>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${invitationLink}" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>

                <!-- Expiry Note -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
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
                      <a href="${invitationLink}" style="color: #666666; text-decoration: underline;">${invitationLink}</a>
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
