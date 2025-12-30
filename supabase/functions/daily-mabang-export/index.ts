import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Order {
  id: string;
  order_number: string;
  shopify_order_id: string;
  user_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  merchant_name?: string;
  line_items: Array<{
    sku: string;
    title: string;
    variant_title: string;
    quantity: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if enabled (could add settings table later)
    const minOrderCount = 1; // Minimum orders to trigger export

    // Get unfulfilled orders ready for export
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select(`
        *,
        shopify_order_line_items(sku, title, variant_title, quantity)
      `)
      .eq('fulfillment_status', 'UNFULFILLED')
      .eq('exported_to_3pl', false)
      .in('financial_status', ['PAID', 'AUTHORIZED'])
      .is('cancelled_at', null);

    if (ordersError) throw ordersError;

    if (!orders || orders.length < minOrderCount) {
      console.log(`Only ${orders?.length || 0} orders ready for export (minimum: ${minOrderCount})`);
      return new Response(
        JSON.stringify({
          exported: false,
          reason: 'Not enough orders',
          count: orders?.length || 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get merchant names
    const userIds = [...new Set(orders.map(o => o.user_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, business_name')
      .in('id', userIds);

    const profileMap = new Map(
      profiles?.map(p => [
        p.id,
        p.business_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
      ])
    );

    const ordersWithData: Order[] = orders.map(order => ({
      ...order,
      merchant_name: profileMap.get(order.user_id) || 'Unknown',
      line_items: order.shopify_order_line_items || []
    }));

    // Build CSV data (could enhance to Excel if needed)
    const csvRows: string[] = [];
    
    // Header row
    csvRows.push([
      'Order Number',
      'Transaction Number',
      'SKU',
      'Product Name',
      'Variant',
      'Quantity',
      'Buyer Name',
      'Buyer Account',
      'Phone 1',
      'Address 1',
      'Address 2',
      'City',
      'Province/State',
      'Postal Code',
      'Country',
      'Merchant'
    ].map(h => `"${h}"`).join(','));

    // Data rows
    for (const order of ordersWithData) {
      if (order.line_items && order.line_items.length > 0) {
        for (const item of order.line_items) {
          csvRows.push([
            order.order_number,
            order.shopify_order_id,
            item.sku || '',
            item.title,
            item.variant_title || '',
            item.quantity.toString(),
            `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
            order.customer_email || '',
            order.customer_phone || '',
            order.shipping_address_line1 || '',
            order.shipping_address_line2 || '',
            order.shipping_city || '',
            order.shipping_state || '',
            order.shipping_zip || '',
            convertCountryCode(order.shipping_country || ''),
            order.merchant_name || ''
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        }
      }
    }

    const csvContent = csvRows.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 10);
    const filename = `mabang_daily_export_${timestamp}.csv`;

    // Store in Supabase Storage (optional)
    // const { error: uploadError } = await supabase.storage
    //   .from('mabang-exports')
    //   .upload(filename, csvContent, { contentType: 'text/csv' });

    // Get system admin for the export record
    const { data: systemAdmin } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('is_super_admin', true)
      .limit(1)
      .maybeSingle();

    // Create export batch record
    const { error: batchError } = await supabase
      .from('mabang_export_batches')
      .insert({
        admin_id: systemAdmin?.id || userIds[0], // Use system admin or first merchant
        export_filename: filename,
        order_ids: ordersWithData.map(o => o.id),
        order_count: ordersWithData.length,
        merchant_ids: userIds,
        notes: `Automated daily export: ${ordersWithData.length} orders from ${userIds.length} merchants`,
      });

    if (batchError) throw batchError;

    // Mark orders as exported
    const { error: updateError } = await supabase
      .from('shopify_orders')
      .update({
        exported_to_3pl: true,
        exported_at: new Date().toISOString(),
        exported_by_admin_id: systemAdmin?.id || null,
      })
      .in('id', ordersWithData.map(o => o.id));

    if (updateError) throw updateError;

    // Send notification to admins (could add email notification here)
    console.log(`Daily export complete: ${ordersWithData.length} orders exported`);

    return new Response(
      JSON.stringify({
        exported: true,
        filename,
        orderCount: ordersWithData.length,
        merchantCount: userIds.length,
        message: `Successfully exported ${ordersWithData.length} orders`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in daily-mabang-export:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function convertCountryCode(country: string): string {
  const countryMap: Record<string, string> = {
    'United States': 'US',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Switzerland': 'CH',
    'Austria': 'AT',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Poland': 'PL',
    'Czech Republic': 'CZ',
    'Ireland': 'IE',
    'Portugal': 'PT',
    'Greece': 'GR',
    'Japan': 'JP',
    'South Korea': 'KR',
    'Singapore': 'SG',
    'Malaysia': 'MY',
    'Thailand': 'TH',
    'Philippines': 'PH',
    'Indonesia': 'ID',
    'Vietnam': 'VN',
    'India': 'IN',
    'China': 'CN',
    'Hong Kong': 'HK',
    'Taiwan': 'TW',
    'New Zealand': 'NZ',
    'Mexico': 'MX',
    'Brazil': 'BR',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Peru': 'PE',
    'South Africa': 'ZA',
    'United Arab Emirates': 'AE',
    'Saudi Arabia': 'SA',
    'Israel': 'IL',
    'Turkey': 'TR',
    'Russia': 'RU'
  };

  return countryMap[country] || country.substring(0, 2).toUpperCase();
}