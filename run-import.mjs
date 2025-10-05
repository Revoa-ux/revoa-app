import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) { env[match[1]] = match[2]; }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = "tyler@revoa.app";
const ADMIN_PASSWORD = "RevoaAI17";

console.log("============================================================");
console.log("AI Agent - Product Import Tool");
console.log("============================================================");

async function main() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  console.log("Logging in...");
  const authResult = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authResult.error) {
    console.log("Login failed:", authResult.error.message);
    process.exit(1);
  }

  console.log("Login successful!");
  const token = authResult.data.session.access_token;

  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

  const products = [
    {
      external_id: "ig:DLpBJg-s-_i:solar-step-lights:" + today,
      name: "Peel-and-Stick Solar Step Lights (Warm White)",
      category: "Lighting",
      supplier_price: 9.80,
      recommended_retail_price: 29.40,
      description: "Boost curb appeal in minutes with weather-resistant solar step lights.",
      creatives: [{
        type: "reel",
        url: "https://www.instagram.com/reel/DLpBJg-s-_i/",
        platform: "instagram",
        is_inspiration: true
      }],
      metadata: {
        price_rule_pass: true,
        notes: "Pilot import"
      }
    },
    {
      external_id: "ig:DLxeJLpuUHd:under-door-draft-stopper:" + today,
      name: "Under-Door Draft Stopper (Noise & Draft Seal)",
      category: "Home",
      supplier_price: 6.50,
      recommended_retail_price: 19.50,
      description: "Seal gaps to block drafts, dust, and noise.",
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
      external_id: "ig:DMngbHWPjJP:resistance-bands-pro-set:" + today,
      name: "Pro Resistance Bands Set (Door Anchor + Handles)",
      category: "Fitness",
      supplier_price: 11.00,
      recommended_retail_price: 33.00,
      description: "Full-body workouts anywhere.",
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

  console.log("Importing", products.length, "products...");

  const response = await fetch(SUPABASE_URL + "/functions/v1/import-products", {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'ai_agent',
      products: products
    })
  });

  const result = await response.json();

  console.log("\nImport completed!");
  console.log("Total:", result.total || 0);
  console.log("Successful:", result.successful || 0);
  console.log("Failed:", result.failed || 0);

  if (result.errors && result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach(error => {
      console.log("-", error.product + ":", error.error);
    });
  }

  if (result.product_ids && result.product_ids.length > 0) {
    console.log("\nProduct IDs created:");
    result.product_ids.forEach(pid => console.log("-", pid));
  }

  if (result.successful > 0) {
    console.log("\nProducts pending approval at:");
    console.log("https://members.revoa.app/admin/products");
  }

  console.log("\n============================================================");
}

main();
