import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const { pendingConfirmationId, userId } = await req.json();

    if (!pendingConfirmationId && !userId) {
      // Batch process: find all pending confirmations older than 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: pendingConfirmations, error: fetchError } = await supabaseClient
        .from('pending_payment_confirmations')
        .select(`
          id,
          user_id,
          invoice_id,
          amount,
          wise_pay_link,
          reminder_count,
          created_at,
          invoices (
            invoice_number
          )
        `)
        .eq('status', 'pending')
        .is('reminder_sent_at', null)
        .lt('created_at', thirtyMinutesAgo)
        .gt('expires_at', new Date().toISOString())
        .lt('reminder_count', 3);

      if (fetchError) {
        console.error('Error fetching pending confirmations:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch pending confirmations' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!pendingConfirmations || pendingConfirmations.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No pending confirmations requiring reminders', sent: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let sentCount = 0;
      const errors: string[] = [];

      for (const confirmation of pendingConfirmations) {
        try {
          // Get user email
          const { data: userProfile, error: profileError } = await supabaseClient
            .from('user_profiles')
            .select('email, first_name, display_name')
            .eq('user_id', confirmation.user_id)
            .maybeSingle();

          if (profileError || !userProfile?.email) {
            errors.push(`No email for user ${confirmation.user_id}`);
            continue;
          }

          const invoiceNumber = (confirmation.invoices as any)?.invoice_number || `INV-${confirmation.invoice_id.slice(0, 8)}`;
          const userName = userProfile.display_name || userProfile.first_name || 'there';

          // Send email
          const emailSent = await sendReminderEmail(
            userProfile.email,
            userName,
            invoiceNumber,
            confirmation.amount,
            confirmation.wise_pay_link
          );

          if (emailSent) {
            // Update confirmation record
            await supabaseClient
              .from('pending_payment_confirmations')
              .update({
                reminder_sent_at: new Date().toISOString(),
                reminder_count: (confirmation.reminder_count || 0) + 1
              })
              .eq('id', confirmation.id);

            sentCount++;
          }
        } catch (err) {
          console.error('Error processing confirmation:', confirmation.id, err);
          errors.push(`Failed for ${confirmation.id}: ${err}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          message: `Sent ${sentCount} payment reminders`,
          sent: sentCount,
          errors: errors.length > 0 ? errors : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single reminder for specific confirmation or user
    let confirmation;
    
    if (pendingConfirmationId) {
      const { data, error } = await supabaseClient
        .from('pending_payment_confirmations')
        .select(`
          id,
          user_id,
          invoice_id,
          amount,
          wise_pay_link,
          reminder_count,
          invoices (
            invoice_number
          )
        `)
        .eq('id', pendingConfirmationId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Pending confirmation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      confirmation = data;
    } else {
      const { data, error } = await supabaseClient
        .from('pending_payment_confirmations')
        .select(`
          id,
          user_id,
          invoice_id,
          amount,
          wise_pay_link,
          reminder_count,
          invoices (
            invoice_number
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'No pending confirmation found for user' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      confirmation = data;
    }

    // Get user email
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('email, first_name, display_name')
      .eq('user_id', confirmation.user_id)
      .maybeSingle();

    if (profileError || !userProfile?.email) {
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoiceNumber = (confirmation.invoices as any)?.invoice_number || `INV-${confirmation.invoice_id.slice(0, 8)}`;
    const userName = userProfile.display_name || userProfile.first_name || 'there';

    const emailSent = await sendReminderEmail(
      userProfile.email,
      userName,
      invoiceNumber,
      confirmation.amount,
      confirmation.wise_pay_link
    );

    if (emailSent) {
      await supabaseClient
        .from('pending_payment_confirmations')
        .update({
          reminder_sent_at: new Date().toISOString(),
          reminder_count: (confirmation.reminder_count || 0) + 1
        })
        .eq('id', confirmation.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Reminder sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-payment-reminder:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendReminderEmail(
  email: string,
  userName: string,
  invoiceNumber: string,
  amount: number,
  wisePayLink: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('EMAIL_FROM') || 'Revoa <noreply@notifications.revoa.app>';
  const siteUrl = Deno.env.get('SITE_URL') || 'https://members.revoa.app';

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  const logoUrl = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png';
  const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Payment</title>
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
                      Complete your payment
                    </h1>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                      Hi ${userName}, we noticed you started a payment but haven't confirmed it yet.
                    </p>
                  </td>
                </tr>

                <!-- Invoice Details -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <span style="font-size: 13px; color: #888888;">Invoice</span><br>
                                <span style="font-size: 15px; font-weight: 500; color: #111111;">${invoiceNumber}</span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <span style="font-size: 13px; color: #888888;">Amount Due</span><br>
                                <span style="font-size: 22px; font-weight: 600; color: #111111;">$${formattedAmount}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${siteUrl}/balance" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                      Complete Payment
                    </a>
                  </td>
                </tr>

                <!-- Note -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-size: 13px; color: #888888;">
                      If you've already completed the payment, please log in and confirm it to update your invoice status.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 0;" />
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

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `Complete your payment - ${invoiceNumber}`,
        html: emailHtml,
      }),
    });

    if (response.ok) {
      console.log('Payment reminder email sent successfully to:', email);
      return true;
    } else {
      const error = await response.json();
      console.error('Failed to send email:', error);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}