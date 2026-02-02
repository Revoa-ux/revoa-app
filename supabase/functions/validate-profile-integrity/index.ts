import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProfileIntegrityIssue {
  userId: string;
  email: string;
  profileId: string;
  issue: string;
  severity: 'critical' | 'warning';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check authentication for non-super-admin users
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all user profiles and check for integrity issues
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, email');

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const issues: ProfileIntegrityIssue[] = [];

    // Check each profile for ID mismatch
    for (const profile of profiles || []) {
      if (profile.id !== profile.user_id) {
        issues.push({
          userId: profile.user_id,
          email: profile.email || 'unknown',
          profileId: profile.id,
          issue: `Profile ID (${profile.id}) does not match user_id (${profile.user_id})`,
          severity: 'critical',
        });
      }
    }

    // Check for auth users without profiles
    const { data: authUsersData } = await supabase.auth.admin.listUsers();
    const authUsers = authUsersData?.users || [];

    for (const authUser of authUsers) {
      const hasProfile = profiles?.some(p => p.user_id === authUser.id);
      if (!hasProfile) {
        issues.push({
          userId: authUser.id,
          email: authUser.email || 'unknown',
          profileId: 'none',
          issue: 'Auth user exists but no user_profile record found',
          severity: 'warning',
        });
      }
    }

    const summary = {
      totalProfiles: profiles?.length || 0,
      totalAuthUsers: authUsers.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      healthy: issues.length === 0,
    };

    return new Response(
      JSON.stringify({
        summary,
        issues,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in validate-profile-integrity:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
