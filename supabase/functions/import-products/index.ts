import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProductImage {
  url: string;
  type: 'main' | 'variant' | 'lifestyle' | 'detail';
  display_order?: number;
  alt_text?: string;
}

interface ProductMedia {
  url: string;
  thumbnail_url?: string;
  type: 'gif' | 'video' | 'image';
  description?: string;
  duration_seconds?: number;
}

interface ProductCreative {
  type: 'reel' | 'ad' | 'static' | 'carousel';
  url: string;
  thumbnail_url?: string;
  platform?: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'universal';
  headline?: string;
  description?: string;
  ad_copy?: string;
  cta_text?: string;
  is_inspiration?: boolean;
  performance_score?: number;
}

interface ProductVariant {
  name: string;
  sku: string;
  item_cost: number;
  shipping_cost: number;
  recommended_price: number;
  images?: string[];
}

interface ProductInput {
  name: string;
  description?: string;
  category: string;
  supplier_price?: number;
  recommended_retail_price?: number;
  external_id?: string;
  metadata?: Record<string, unknown>;
  images?: ProductImage[];
  media?: ProductMedia[];
  creatives?: ProductCreative[];
  variants?: ProductVariant[];
}

interface BulkImportRequest {
  products: ProductInput[];
  source: 'ai_agent' | 'manual' | 'csv' | 'api';
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Get Supabase client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is admin
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin, admin_role')
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

    if (req.method === 'POST') {
      const body: BulkImportRequest = await req.json();
      const { products, source = 'api' } = body;

      if (!Array.isArray(products) || products.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Products array is required and must not be empty' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const results = {
        total: products.length,
        successful: 0,
        failed: 0,
        errors: [] as { product: string; error: string }[],
        product_ids: [] as string[],
      };

      // Create import log
      const { data: importLog } = await supabase
        .from('product_import_logs')
        .insert({
          source,
          total_products: products.length,
          imported_by: user.id,
        })
        .select('id')
        .single();

      // Process each product
      for (const productInput of products) {
        try {
          // Check for duplicate by external_id
          if (productInput.external_id) {
            const { data: existing } = await supabase
              .from('products')
              .select('id')
              .eq('external_id', productInput.external_id)
              .maybeSingle();

            if (existing) {
              results.failed++;
              results.errors.push({
                product: productInput.name,
                error: `Duplicate external_id: ${productInput.external_id}`,
              });
              continue;
            }
          }

          // Insert product
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: productInput.name,
              description: productInput.description,
              category: productInput.category,
              supplier_price: productInput.supplier_price,
              recommended_retail_price: productInput.recommended_retail_price,
              external_id: productInput.external_id,
              source,
              approval_status: 'pending',
              created_by: user.id,
              metadata: productInput.metadata || {},
            })
            .select('id')
            .single();

          if (productError || !product) {
            results.failed++;
            results.errors.push({
              product: productInput.name,
              error: productError?.message || 'Failed to create product',
            });
            continue;
          }

          const productId = product.id;
          results.product_ids.push(productId);

          // Insert images
          if (productInput.images && productInput.images.length > 0) {
            const imageInserts = productInput.images.map((img, idx) => ({
              product_id: productId,
              url: img.url,
              type: img.type,
              display_order: img.display_order ?? idx,
              alt_text: img.alt_text,
            }));

            await supabase.from('product_images').insert(imageInserts);
          }

          // Insert media
          if (productInput.media && productInput.media.length > 0) {
            const mediaInserts = productInput.media.map((media) => ({
              product_id: productId,
              url: media.url,
              thumbnail_url: media.thumbnail_url,
              type: media.type,
              description: media.description,
              duration_seconds: media.duration_seconds,
            }));

            await supabase.from('product_media').insert(mediaInserts);
          }

          // Insert creatives
          if (productInput.creatives && productInput.creatives.length > 0) {
            const creativeInserts = productInput.creatives.map((creative) => ({
              product_id: productId,
              type: creative.type,
              url: creative.url,
              thumbnail_url: creative.thumbnail_url,
              platform: creative.platform,
              headline: creative.headline,
              description: creative.description,
              ad_copy: creative.ad_copy,
              cta_text: creative.cta_text,
              is_inspiration: creative.is_inspiration ?? true,
              performance_score: creative.performance_score,
            }));

            await supabase.from('product_creatives').insert(creativeInserts);
          }

          // Insert variants
          if (productInput.variants && productInput.variants.length > 0) {
            const variantInserts = productInput.variants.map((variant) => ({
              product_id: productId,
              name: variant.name,
              sku: variant.sku,
              item_cost: variant.item_cost,
              shipping_cost: variant.shipping_cost,
              recommended_price: variant.recommended_price,
              images: variant.images || [],
            }));

            await supabase.from('product_variants').insert(variantInserts);
          }

          results.successful++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            product: productInput.name,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Update import log
      if (importLog) {
        await supabase
          .from('product_import_logs')
          .update({
            successful_imports: results.successful,
            failed_imports: results.failed,
            error_details: results.errors,
          })
          .eq('id', importLog.id);
      }

      return new Response(
        JSON.stringify(results),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});