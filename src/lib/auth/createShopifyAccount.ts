import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface CreateShopifyAccountResult {
  userId: string;
  email: string;
  sessionToken: string;
  isNewAccount: boolean;
}

/**
 * Creates or retrieves a Shopify user account
 * Used during App Store installation flow
 */
export async function createShopifyAccount(
  email: string,
  shopDomain: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<CreateShopifyAccountResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if account already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Check if this shop is already connected to this user
      const { data: installation } = await supabase
        .from('shopify_installations')
        .select('id, status')
        .eq('user_id', existingUser.id)
        .eq('store_url', shopDomain)
        .maybeSingle();

      if (installation) {
        // Reinstallation - generate session token
        const { data: linkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });

        if (!linkData.properties?.action_link) {
          throw new Error('Failed to generate session token');
        }

        // Extract token from magic link
        const url = new URL(linkData.properties.action_link);
        const token = url.searchParams.get('token');

        if (!token) {
          throw new Error('Failed to extract token from magic link');
        }

        return {
          userId: existingUser.id,
          email: email,
          sessionToken: token,
          isNewAccount: false,
        };
      }

      // User exists but different shop - this is not allowed
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Create new account
    const randomPassword = crypto.randomBytes(32).toString('hex');

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        signup_source: 'shopify_app_store',
        password_set: false,
      },
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      throw new Error('Failed to create user account');
    }

    // The user_profiles record is created automatically by the handle_new_user() database trigger
    // Wait a moment for the trigger to complete, then verify the profile was created
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: profile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, user_id')
      .eq('user_id', newUser.user.id)
      .maybeSingle();

    if (profileCheckError || !profile) {
      console.error('Warning: User profile was not created by trigger:', {
        userId: newUser.user.id,
        email: email,
        error: profileCheckError,
      });
      // Log this for monitoring, but don't throw - the auth user exists and can be fixed later
    } else if (profile.id !== profile.user_id) {
      console.error('Critical: Profile ID mismatch detected:', {
        profileId: profile.id,
        userId: profile.user_id,
        expectedMatch: true,
      });
    }

    // Generate session token for auto-sign-in
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (!linkData.properties?.action_link) {
      throw new Error('Failed to generate session token');
    }

    // Extract token from magic link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Failed to extract token from magic link');
    }

    return {
      userId: newUser.user.id,
      email: email,
      sessionToken: token,
      isNewAccount: true,
    };

  } catch (error) {
    console.error('Error in createShopifyAccount:', error);
    throw error;
  }
}
