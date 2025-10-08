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

// Mock product research data for demonstration
const PRODUCT_CATEGORIES = [
  'Pet Supplies', 'Home & Garden', 'Kitchen Gadgets', 'Fitness & Sports',
  'Beauty & Personal Care', 'Electronics', 'Baby Products', 'Office Supplies'
];

const SAMPLE_PRODUCTS = [
  { name: 'Automatic Pet Feeder', category: 'Pet Supplies', supplier_price: 25, retail_price: 59.99 },
  { name: 'LED Strip Lights', category: 'Home & Garden', supplier_price: 12, retail_price: 34.99 },
  { name: 'Portable Blender', category: 'Kitchen Gadgets', supplier_price: 18, retail_price: 49.99 },
  { name: 'Resistance Bands Set', category: 'Fitness & Sports', supplier_price: 15, retail_price: 39.99 },
  { name: 'Facial Cleansing Brush', category: 'Beauty & Personal Care', supplier_price: 22, retail_price: 54.99 },
  { name: 'Wireless Earbuds', category: 'Electronics', supplier_price: 28, retail_price: 69.99 },
  { name: 'Baby Monitor Camera', category: 'Baby Products', supplier_price: 35, retail_price: 89.99 },
  { name: 'Desk Organizer Set', category: 'Office Supplies', supplier_price: 14, retail_price: 32.99 },
];

async function runProductResearch(supabase: any, userId: string, maxProducts: number, niche?: string) {
  const products = [];
  const numProducts = Math.min(maxProducts, SAMPLE_PRODUCTS.length);

  // Select random products
  const shuffled = [...SAMPLE_PRODUCTS].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, numProducts);

  for (const product of selected) {
    const productData = {
      name: product.name,
      description: `High-quality ${product.name.toLowerCase()} with excellent profit margins. Popular on social media with proven track record.`,
      category: niche || product.category,
      supplier_price: product.supplier_price,
      recommended_retail_price: product.retail_price,
      external_id: `research_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      source: 'ai_agent',
      approval_status: 'pending',
      created_by: userId,
      metadata: {
        research_source: 'ai_agent',
        profit_margin: Math.round(((product.retail_price - product.supplier_price) / product.retail_price) * 100),
        research_date: new Date().toISOString(),
        confidence_score: 0.85 + Math.random() * 0.14,
      },
    };

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert(productData)
      .select('id')
      .single();

    if (!error && newProduct) {
      products.push(newProduct);

      // Add sample creative data
      await supabase.from('product_creatives').insert({
        product_id: newProduct.id,
        type: 'reel',
        url: 'https://www.instagram.com/reel/example',
        platform: 'instagram',
        is_inspiration: true,
        headline: `Discover ${product.name}`,
        ad_copy: `Transform your life with this amazing ${product.name.toLowerCase()}! Perfect for everyday use.`,
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
    const maxProducts = body.max_products || 5;
    const niche = body.niche;

    // Create import job record
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        status: 'running',
        source: 'ai_agent',
        triggered_by: user.id,
        inputs: {
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

    console.log(`Created import job: ${job.id}`);
    console.log(`Starting product research for ${maxProducts} products${niche ? ` in niche: ${niche}` : ''}`);

    // Run product research
    try {
      const importedProducts = await runProductResearch(supabase, user.id, maxProducts, niche);

      // Update job with results
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

      console.log(`Successfully imported ${importedProducts.length} products`);

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          message: `AI agent completed! ${importedProducts.length} products added for approval.`,
          products_imported: importedProducts.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (researchError) {
      console.error('Product research failed:', researchError);

      // Mark job as failed
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          error: researchError instanceof Error ? researchError.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return new Response(
        JSON.stringify({
          error: 'Product research failed',
          details: researchError instanceof Error ? researchError.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
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