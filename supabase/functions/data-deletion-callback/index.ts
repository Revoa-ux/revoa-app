import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DataDeletionRequest {
  user_id?: string;
  signed_request?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const body: DataDeletionRequest = await req.json();

      const userId = body.user_id;

      if (!userId) {
        return new Response(
          JSON.stringify({
            error: "user_id is required",
            message: "Please provide a user_id to delete data for"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const confirmationCode = `${Date.now()}-${userId}`;

      const { error: logError } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: userId,
          confirmation_code: confirmationCode,
          requested_at: new Date().toISOString(),
          status: 'pending'
        });

      if (logError) {
        console.error('Error logging deletion request:', logError);
      }

      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('Error deleting user data:', deleteError);

        return new Response(
          JSON.stringify({
            error: "Failed to delete user data",
            confirmation_code: confirmationCode,
            url: `${supabaseUrl}/data-deletion?status_id=${confirmationCode}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          url: `${supabaseUrl}/data-deletion?status_id=${confirmationCode}`,
          confirmation_code: confirmationCode,
          message: "Data deletion request processed successfully"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const statusId = url.searchParams.get('status_id');

      if (!statusId) {
        return new Response(
          JSON.stringify({
            error: "status_id is required",
            message: "Please provide a confirmation code to check deletion status"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data, error } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('confirmation_code', statusId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({
            error: "Deletion request not found",
            message: "The provided confirmation code is invalid"
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          status: data.status,
          requested_at: data.requested_at,
          completed_at: data.completed_at,
          message: data.status === 'completed'
            ? 'Your data has been successfully deleted'
            : 'Your data deletion request is being processed'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error in data-deletion-callback:', error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
