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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const contentType = req.headers.get('content-type') || '';
    let userId: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      userId = body.user_id;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      const signedRequest = formData.get('signed_request') as string;

      if (signedRequest) {
        const [encodedSig, payload] = signedRequest.split('.');
        const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        userId = decodedPayload.user_id;
      }
    }

    if (!userId) {
      console.error('No user_id found in deauthorization request');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing user_id',
          confirmation_code: crypto.randomUUID()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('facebook_user_id', userId)
      .maybeSingle();

    if (profile) {
      const { error: tokenError } = await supabase
        .from('facebook_tokens')
        .delete()
        .eq('user_id', profile.id);

      if (tokenError) {
        console.error('Error deleting Facebook tokens:', tokenError);
      }

      const { error: accountError } = await supabase
        .from('ad_accounts')
        .update({ status: 'disconnected' })
        .eq('user_id', profile.id)
        .eq('platform', 'facebook');

      if (accountError) {
        console.error('Error updating ad account status:', accountError);
      }

      console.log(`Deauthorized Facebook user ${userId} (app user: ${profile.id})`);
    } else {
      console.log(`Facebook user ${userId} not found in our database`);
    }

    const confirmationCode = crypto.randomUUID();

    await supabase.from('data_deletion_requests').insert({
      platform: 'facebook',
      platform_user_id: userId,
      confirmation_code: confirmationCode,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: `https://members.revoa.app/data-deletion?code=${confirmationCode}`,
        confirmation_code: confirmationCode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Facebook deauthorization error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        confirmation_code: crypto.randomUUID()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});