import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DispatchRequest {
  niche?: string;
  hashtags?: string[];
  max_products?: number;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER');
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      throw new Error('Missing GitHub configuration. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: DispatchRequest = await req.json().catch(() => ({}));

    // Create import job record
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        status: 'queued',
        source: 'admin_trigger',
        triggered_by: user.id,
        inputs: {
          niche: body.niche || null,
          hashtags: body.hashtags || [],
          max_products: body.max_products || 10,
        },
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create import job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create import job', details: jobError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Created import job: ${job.id}`);

    // Dispatch GitHub Actions workflow
    const workflowFile = 'import-products.yml';
    const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`;

    console.log(`Dispatching workflow to: ${dispatchUrl}`);

    const dispatchResponse = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          job_id: job.id,
          niche: body.niche || '',
          max_products: String(body.max_products || 10),
        },
      }),
    });

    if (!dispatchResponse.ok) {
      const errorText = await dispatchResponse.text();
      console.error('GitHub dispatch failed:', dispatchResponse.status, errorText);

      // Mark job as failed
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          error: `GitHub dispatch failed: ${dispatchResponse.status} - ${errorText}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({
          error: 'Failed to dispatch GitHub workflow',
          details: `Status ${dispatchResponse.status}: ${errorText}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('GitHub workflow dispatched successfully');

    // Update job to running status
    await supabase
      .from('import_jobs')
      .update({ status: 'running' })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        message: 'AI agent workflow started. Check the job status below.',
        run_url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Agent dispatch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
