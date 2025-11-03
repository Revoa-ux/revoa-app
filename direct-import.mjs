import fetch from 'node-fetch';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const anonMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
const serviceMatch = env.match(/VITE_SUPABASE_SERVICE_KEY=(.+)/);

const SUPABASE_URL = urlMatch[1].trim();
const ANON_KEY = anonMatch[1].trim();
const SERVICE_ROLE_KEY = serviceMatch[1].trim();

console.log("============================================================");
console.log("AI Agent - Product Import Tool (Direct Mode)");
console.log("============================================================");

const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

const products = [
  {
    external_id: `ig:DLpBJg-s-_i:solar-step-lights:${today}`,
    name: "Peel-and-Stick Solar Step Lights (Warm White)",
    category: "Lighting",
    supplier_price: 9.80,
    recommended_retail_price: 29.40,
    description: "Boost curb appeal in minutes with weather-resistant solar step lights. Peel-and-stick or screw-mount, auto-on at dusk, no wiring.",
    creatives: [{
      type: "reel",
      url: "https://www.instagram.com/reel/DLpBJg-s-_i/",
      platform: "instagram",
      is_inspiration: true
    }],
    metadata: {
      price_rule_pass: true,
      notes: "Pilot import; assets to follow."
    }
  },
  {
    external_id: `ig:DLxeJLpuUHd:under-door-draft-stopper:${today}`,
    name: "Under-Door Draft Stopper (Noise & Draft Seal)",
    category: "Home",
    supplier_price: 6.50,
    recommended_retail_price: 19.50,
    description: "Seal gaps to block drafts, dust, and noise. Cut-to-fit, easy install—comfort and energy savings year-round.",
    creatives: [{
      type: "reel",
      url: "https://www.instagram.com/reel/DLxeJLpuUHd/",
      platform: "instagram",
      is_inspiration: true
    }],
    metadata: {
      price_rule_pass: true,
      notes: "Compact/light for dropshipping."
    }
  },
  {
    external_id: `ig:DMngbHWPjJP:resistance-bands-pro-set:${today}`,
    name: "Pro Resistance Bands Set (Door Anchor + Handles)",
    category: "Fitness",
    supplier_price: 11.00,
    recommended_retail_price: 33.00,
    description: "Full-body workouts anywhere. Stacked resistance, cushioned handles, and door anchor for hundreds of exercises.",
    creatives: [{
      type: "reel",
      url: "https://www.instagram.com/reel/DMngbHWPjJP/",
      platform: "instagram",
      is_inspiration: true
    }],
    metadata: {
      price_rule_pass: true,
      notes: "Ships small; great margin potential."
    }
  }
];

console.log(`\nImporting ${products.length} products using service role...`);

try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/import-products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'ai_agent',
      products: products,
      user_id: 'd11d305f-80d9-4b75-9370-0215beb0d7c6'  // tyler@revoa.app's ID
    })
  });

  const text = await response.text();
  console.log('\nRaw response:', text);
  
  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    console.log('\nFailed to parse JSON response');
    process.exit(1);
  }

  console.log("\n✅ Import completed!");
  console.log(`   Total: ${result.total || 0}`);
  console.log(`   Successful: ${result.successful || 0}`);
  console.log(`   Failed: ${result.failed || 0}`);

  if (result.errors && result.errors.length > 0) {
    console.log("\n⚠️  Errors:");
    result.errors.forEach(error => {
      console.log(`   - ${error.product}: ${error.error}`);
    });
  }

  if (result.product_ids && result.product_ids.length > 0) {
    console.log("\n📋 Product IDs created:");
    result.product_ids.forEach(pid => console.log(`   - ${pid}`));
  }

  if (result.successful > 0) {
    console.log("\n🎉 Success! Products pending approval at:");
    console.log("   https://members.revoa.app/admin/products");
  }
} catch (error) {
  console.error("\n❌ Import failed:", error.message);
  process.exit(1);
}

console.log("\n============================================================");
