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
  hashtags?: string[];
  max_products?: number;
}

const SAMPLE_PRODUCTS = [
  { name: 'Automatic Pet Feeder', category: 'Pet Supplies', supplier_price: 25, retail_price: 59.99 },
  { name: 'LED Strip Lights', category: 'Home & Garden', supplier_price: 12, retail_price: 34.99 },
  { name: 'Portable Blender', category: 'Kitchen Gadgets', supplier_price: 18, retail_price: 49.99 },
  { name: 'Resistance Bands Set', category: 'Fitness & Sports', supplier_price: 15, retail_price: 39.99 },
  { name: 'Facial Cleansing Brush', category: 'Beauty & Personal Care', supplier_price: 22, retail_price: 54.99 },
];

async function runDemoMode(supabase: any, userId: string, maxProducts: number, niche?: string) {
  const products = [];
  const numProducts = Math.min(maxProducts, SAMPLE_PRODUCTS.length);
  const shuffled = [...SAMPLE_PRODUCTS].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, numProducts);

  for (const product of selected) {
    const productData = {
      name: `[DEMO] ${product.name}`,
      description: `Demo product: ${product.name.toLowerCase()} with sample data for testing.`,
      category: niche || product.category,
      supplier_price: product.supplier_price,
      recommended_retail_price: product.retail_price,
      external_id: `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      source: 'demo',
      approval_status: 'pending',
      created_by: userId,
      metadata: {
        mode: 'demo',
        profit_margin: Math.round(((product.retail_price - product.supplier_price) / product.retail_price) * 100),
        created_at: new Date().toISOString(),
      },
    };

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert(productData)
      .select('id')
      .single();

    if (!error && newProduct) {
      products.push(newProduct);
      await supabase.from('product_creatives').insert({
        product_id: newProduct.id,
        type: 'reel',
        url: 'https://www.instagram.com/reel/example',
        platform: 'instagram',
        is_inspiration: true,
        headline: `Demo: ${product.name}`,
        ad_copy: `Sample ad copy for ${product.name.toLowerCase()}.`,
      });
    }
  }

  return products;
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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
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

    // Parse request body
    const body: DispatchRequest = await req.json().catch(() => ({}));
    const mode = body.mode || 'real';

    // Check super-admin status (Real Mode requires super-admin)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin, is_super_admin, email')
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

    // Real mode requires super-admin
    if (mode === 'real' && !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Super-admin access required for Real Mode. Use Demo Mode instead.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const maxProducts = body.max_products || 5;
    const niche = body.niche;

    // Create import job record
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        status: mode === 'demo' ? 'running' : 'queued',
        source: mode === 'demo' ? 'demo' : 'ai_agent',
        triggered_by: user.id,
        inputs: {
          mode,
          niche: niche || null,
          hashtags: body.hashtags || [],
          max_products: maxProducts,
        },
        total_products: maxProducts,
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

    console.log(`Created import job: ${job.id} (mode: ${mode})`);

    // DEMO MODE: Run instant sample insert
    if (mode === 'demo') {
      try {
        const importedProducts = await runDemoMode(supabase, user.id, maxProducts, niche);

        await supabase
          .from('import_jobs')
          .update({
            status: 'completed',
            successful_imports: importedProducts.length,
            failed_imports: 0,
            skipped_imports: 0,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        console.log(`Demo completed: ${importedProducts.length} products`);

        return new Response(
          JSON.stringify({
            success: true,
            job_id: job.id,
            mode: 'demo',
            message: `Demo completed! ${importedProducts.length} sample products added.`,
            products_imported: importedProducts.length,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (demoError) {
        console.error('Demo failed:', demoError);
        await supabase
          .from('import_jobs')
          .update({
            status: 'failed',
            error: demoError instanceof Error ? demoError.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        return new Response(
          JSON.stringify({
            error: 'Demo failed',
            details: demoError instanceof Error ? demoError.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // REAL MODE: Dispatch GitHub Actions
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER');
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO');

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          error: 'GitHub configuration missing. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({
          error: 'GitHub configuration missing',
          details: 'Please configure GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Dispatching GitHub Actions for job ${job.id}`);

    const workflowFile = 'import-products.yml';
    const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`;

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
          niche: niche || 'all',
          max_products: String(maxProducts),
        },
      }),
    });

    if (!dispatchResponse.ok) {
      const errorText = await dispatchResponse.text();
      console.error('GitHub dispatch failed:', dispatchResponse.status, errorText);

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

    await supabase
      .from('import_jobs')
      .update({ status: 'running' })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        mode: 'real',
        message: 'AI agent workflow started. Check job status below.',
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