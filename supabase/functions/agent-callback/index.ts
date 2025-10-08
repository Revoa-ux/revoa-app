import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CallbackRequest {
  job_id: string;
  status: 'completed' | 'failed';
  summary?: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors?: Array<{ product: string; error: string }>;
  github_run_id?: string;
  github_run_url?: string;
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify authorization (GitHub Actions uses service role key)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    // Verify it's a valid service role key
    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Invalid service role key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: CallbackRequest = await req.json();

    if (!body.job_id || !body.status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: job_id and status' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Callback received for job ${body.job_id} with status ${body.status}`);

    // Use service role key to update the job
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update the import job
    const updateData: any = {
      status: body.status,
      completed_at: new Date().toISOString(),
    };

    if (body.summary) {
      updateData.total_products = body.summary.total;
      updateData.successful_imports = body.summary.successful;
      updateData.failed_imports = body.summary.failed;
      updateData.skipped_imports = body.summary.skipped;
    }

    if (body.errors && body.errors.length > 0) {
      updateData.error = JSON.stringify(body.errors);
    }

    if (body.github_run_id) {
      updateData.github_run_id = body.github_run_id;
    }

    if (body.github_run_url) {
      updateData.github_run_url = body.github_run_url;
    }

    const { error: updateError } = await supabase
      .from('import_jobs')
      .update(updateData)
      .eq('id', body.job_id);

    if (updateError) {
      console.error('Failed to update import job:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update job', details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Successfully updated job ${body.job_id} to ${body.status}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job status updated successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Agent callback error:', error);
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
