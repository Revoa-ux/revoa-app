import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Summary {
  job_id: string;
  total: number;
  successful: number;
  failed: number;
  skipped?: Array<{ external_id: string; reason: string }>;
  github_run_url?: string;
  error_text?: string;
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
        JSON.stringify({ ok: false, error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const summary: Summary = await req.json();

    if (!summary?.job_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'job_id required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const errorText = summary.error_text ?? null;
    const status = errorText ? 'failed' : (summary.successful > 0 ? 'succeeded' : 'completed');

    const { error } = await supabase.from('import_jobs').update({
      status,
      finished_at: new Date().toISOString(),
      github_run_url: summary.github_run_url ?? null,
      error_text: errorText,
      total_products: summary.total ?? 0,
      successful_imports: summary.successful ?? 0,
      failed_imports: summary.failed ?? 0,
      skipped_imports: summary.skipped?.length ?? 0,
      summary
    }).eq('id', summary.job_id);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Agent callback error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});