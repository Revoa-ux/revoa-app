import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "file required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const filename = file.name;
    const fileExt = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    const allowedExts = ['.yml', '.yaml', '.csv', '.zip'];

    if (!allowedExts.includes(fileExt)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only YAML, CSV, and ZIP are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jobId = crypto.randomUUID();
    const { error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        id: jobId,
        filename,
        status: "pending",
        created_by: user.id
      });

    if (jobError) {
      console.error("Failed to create job:", jobError);
      return new Response(
        JSON.stringify({ error: "Failed to create import job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder().decode(fileBuffer);

    let products = [];

    if (fileExt === '.yml' || fileExt === '.yaml') {
      // TODO: Parse YAML (requires YAML parser)
      // For now, return placeholder
      products = [];
    } else if (fileExt === '.csv') {
      // TODO: Parse CSV
      products = [];
    } else if (fileExt === '.zip') {
      // TODO: Extract ZIP and parse manifest
      products = [];
    }

    await supabase
      .from("import_jobs")
      .update({
        status: "processing",
        summary: {
          total: products.length,
          successful: 0,
          failed: 0
        }
      })
      .eq("id", jobId);

    // TODO: Process products with pricing validation
    // For now, just mark as completed

    await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary: {
          total: products.length,
          successful: products.length,
          failed: 0
        }
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: jobId,
        summary: {
          total: products.length,
          successful: products.length,
          failed: 0
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
