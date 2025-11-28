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
    const invitationLink = `${Deno.env.get('SITE_URL') || 'https://app.revoa.ai'}/admin/accept-invitation?token=${invitation_token}`;

    // In production, you would integrate with an email service (SendGrid, Resend, etc.)
    // For now, we'll log the invitation details
    console.log('Admin Invitation Details:', {
      email,
      role,
      invitationLink,
      sentBy: user.email,
    });

    // TODO: Integrate with actual email service
    // Example with Resend:
    // const resendApiKey = Deno.env.get('RESEND_API_KEY');
    // const emailResponse = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${resendApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'Revoa <noreply@revoa.ai>',
    //     to: email,
    //     subject: 'You\'ve been invited to join Revoa as an admin',
    //     html: generateInvitationEmail(role, invitationLink),
    //   }),
    // });

    // For development/testing, return the invitation link
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation created successfully',
        // In development, include the link for testing
        ...(Deno.env.get('ENV') === 'development' && { invitationLink }),
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
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #E85B81 0%, #E87D55 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Admin Invitation</h1>
          </div>
          
          <div style="background-color: white; border-radius: 0 0 16px 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              You've been invited to join Revoa as a <strong>${roleDisplay}</strong>.
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Click the button below to accept your invitation and set up your account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #E85B81 0%, #E87D55 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 20px 0 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${invitationLink}" style="color: #E85B81; word-break: break-all;">${invitationLink}</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
