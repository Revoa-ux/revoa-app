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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join Revoa as ${article} ${roleDisplay}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f1419;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f1419; padding: 60px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
                <!-- Header with Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #E85B81 0%, #E87D55 100%); border-radius: 20px 20px 0 0; padding: 50px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      You're Invited!
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.95); margin: 12px 0 0 0; font-size: 18px; font-weight: 500;">
                      Join Revoa as ${article} ${roleDisplay}
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="background-color: #1a1f2e; padding: 50px 40px; border-radius: 0 0 20px 20px;">
                    <p style="color: #e5e7eb; font-size: 17px; line-height: 1.7; margin: 0 0 24px 0; text-align: center;">
                      You've been invited to join the Revoa team! Click below to accept your invitation and get started.
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0;">
                      <tr>
                        <td align="center">
                          <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #E85B81 0%, #E87D55 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 600; font-size: 17px; box-shadow: 0 4px 12px rgba(232, 91, 129, 0.3); transition: all 0.3s ease;">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info Box -->
                    <div style="background: rgba(232, 91, 129, 0.08); border-left: 3px solid #E85B81; border-radius: 8px; padding: 20px; margin: 40px 0;">
                      <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin: 0;">
                        <strong style="color: #E85B81;">Note:</strong> This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
                      </p>
                    </div>

                    <!-- Footer Link -->
                    <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; text-align: center; padding-top: 30px; border-top: 1px solid #2d3748;">
                      Button not working? Copy and paste this link:<br>
                      <a href="${invitationLink}" style="color: #E87D55; word-break: break-all; text-decoration: underline;">${invitationLink}</a>
                    </p>
                  </td>
                </tr>

                <!-- Branding Footer -->
                <tr>
                  <td style="padding: 30px 20px; text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                      Revoa
                    </p>
                    <p style="color: #4b5563; font-size: 12px; margin: 0;">
                      Intelligent Analytics & Attribution Platform
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
