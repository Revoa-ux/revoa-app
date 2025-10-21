import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DispatchRequest {
  mode?: 'real' | 'demo';
  niche?: string;
  reel_urls?: string[];
  import_type?: 'autonomous' | 'hybrid';
  product_name?: string;
  amazon_url?: string;
  aliexpress_url?: string;
  sample_reel_url?: string;
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
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') || '';
    const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER') || '';
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO') || '';
    const WORKFLOW_FILE = 'import-products.yml';
    const WORKFLOW_REF = 'main';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
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
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin, admin_role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: DispatchRequest = await req.json().catch(() => ({}));
    const mode = body.mode || 'real';
    const niche = body.niche || 'all';
    let reel_urls = body.reel_urls || [];
    const import_type = body.import_type || 'autonomous';
    const product_name = body.product_name || null;
    const amazon_url = body.amazon_url || null;
    const aliexpress_url = body.aliexpress_url || null;
    const sample_reel_url = body.sample_reel_url || null;

    if (import_type === 'hybrid' && sample_reel_url && reel_urls.length === 0) {
      reel_urls = [sample_reel_url];
    }

    const { data: jobIns, error: jobErr } = await supabase
      .from('import_jobs')
      .insert({
        created_by: user.id,
        status: 'queued',
        mode,
        niche,
        reel_urls: reel_urls.length > 0 ? reel_urls : null,
        import_type,
        product_name,
        amazon_url,
        aliexpress_url,
        sample_reel_url,
        filename: import_type === 'hybrid' ? `hybrid_${product_name || 'product'}` : 'autonomous_discovery'
      })
      .select('id')
      .maybeSingle();

    if (jobErr || !jobIns) {
      return new Response(
        JSON.stringify({ ok: false, error: jobErr?.message || 'Failed to create job' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const job_id = jobIns.id as string;

    if (mode === 'demo') {
      await supabase.from('import_jobs').update({
        status: 'succeeded',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        summary: { note: 'Demo mode — no GH dispatch', total: 0, successful: 0, failed: 0 }
      }).eq('id', job_id);

      return new Response(
        JSON.stringify({ ok: true, job_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      const errorMsg = 'Missing GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO edge secrets';
      await supabase.from('import_jobs').update({
        status: 'failed',
        error_text: errorMsg
      }).eq('id', job_id);

      return new Response(
        JSON.stringify({
          ok: false,
          error: 'GitHub configuration missing. Set GITHUB_TOKEN (repo+workflow), GITHUB_OWNER, GITHUB_REPO in Supabase secrets.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

    const inputs = { job_id, niche };

    const ghRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: WORKFLOW_REF,
        inputs
      })
    });

    if (!ghRes.ok) {
      const ghErr = await ghRes.text();
      console.error('[agent-dispatch] GitHub dispatch failed:', ghErr);
      await supabase.from('import_jobs').update({
        status: 'failed',
        error_text: `GitHub API error: ${ghRes.status} - ${ghErr}`
      }).eq('id', job_id);

      return new Response(
        JSON.stringify({ ok: false, error: `GitHub workflow dispatch failed: ${ghErr}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    await supabase.from('import_jobs').update({
      status: 'running',
      started_at: new Date().toISOString()
    }).eq('id', job_id);

    return new Response(
      JSON.stringify({ ok: true, job_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[agent-dispatch] Top-level error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
