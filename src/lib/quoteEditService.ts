import { supabase } from './supabase';
import { toast } from './toast';

interface QuoteVariant {
  quantity: number;
  sku: string;
  costPerItem: number;
  shippingCosts: {
    [countryCode: string]: number;
    _default: number;
  };
}

interface EditQuoteParams {
  quoteId: string;
  newVariants: QuoteVariant[];
  editReason: string;
  adminId: string;
}

export async function editQuote({
  quoteId,
  newVariants,
  editReason,
  adminId
}: EditQuoteParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch the current quote
    const { data: quote, error: fetchError } = await supabase
      .from('product_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      throw new Error('Failed to fetch quote');
    }

    const previousVariants = quote.variants;

    // Store original variants if not already set (first edit)
    const originalVariants = quote.original_variants || previousVariants;

    // Update the quote
    const { error: updateError } = await supabase
      .from('product_quotes')
      .update({
        variants: newVariants,
        status: 'pending_reacceptance',
        last_edited_at: new Date().toISOString(),
        last_edited_by: adminId,
        edit_reason: editReason,
        original_variants: originalVariants
      })
      .eq('id', quoteId);

    if (updateError) {
      throw updateError;
    }

    // Create revision record
    const { error: revisionError } = await supabase
      .from('quote_revisions')
      .insert({
        quote_id: quoteId,
        previous_variants: previousVariants,
        new_variants: newVariants,
        edited_by: adminId,
        edit_reason: editReason
      });

    if (revisionError) {
      console.error('Failed to create revision record:', revisionError);
      // Continue anyway - the quote update succeeded
    }

    // Send notification to user
    await notifyUserOfQuoteEdit(
      quote.user_id,
      quoteId,
      quote.product_name,
      adminId
    );

    return { success: true };
  } catch (error) {
    console.error('Error editing quote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit quote'
    };
  }
}

export async function notifyUserOfQuoteEdit(
  userId: string,
  quoteId: string,
  quoteName: string,
  adminId: string
): Promise<void> {
  try {
    // Get admin name
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('name, first_name, last_name')
      .eq('user_id', adminId)
      .single();

    const adminName = adminProfile?.name ||
      (adminProfile?.first_name && adminProfile?.last_name
        ? `${adminProfile.first_name} ${adminProfile.last_name}`
        : 'Admin');

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'quote_updated',
        action_type: 'quote_review',
        title: 'Quote Updated - Review Required',
        message: `${adminName} has updated the pricing for "${quoteName}". Please review and accept the changes.`,
        read: false,
        action_required: true,
        link_to: `/quotes?review=${quoteId}`,
        reference_id: quoteId
      });

    if (error) {
      console.error('Failed to create notification:', error);
    }
  } catch (error) {
    console.error('Error sending quote edit notification:', error);
  }
}

export async function acceptQuoteChanges(
  quoteId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get quote to find assigned admin
    const { data: quote, error: fetchError } = await supabase
      .from('product_quotes')
      .select('assigned_admin_id, product_name, user_id')
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !quote) {
      throw new Error('Quote not found');
    }

    // Update quote status to accepted
    const { error: updateError } = await supabase
      .from('product_quotes')
      .update({
        status: 'accepted'
      })
      .eq('id', quoteId);

    if (updateError) {
      throw updateError;
    }

    // Notify admin
    if (quote.assigned_admin_id) {
      await notifyAdminOfQuoteResponse(
        quote.assigned_admin_id,
        quoteId,
        quote.product_name,
        true,
        userId
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error accepting quote changes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept changes'
    };
  }
}

export async function rejectQuoteChanges(
  quoteId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get quote to find assigned admin and restore original variants
    const { data: quote, error: fetchError } = await supabase
      .from('product_quotes')
      .select('assigned_admin_id, product_name, user_id, original_variants')
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !quote) {
      throw new Error('Quote not found');
    }

    // Restore original variants and update status
    const { error: updateError } = await supabase
      .from('product_quotes')
      .update({
        status: 'accepted',
        variants: quote.original_variants || quote.variants,
        last_edited_at: null,
        last_edited_by: null,
        edit_reason: null
      })
      .eq('id', quoteId);

    if (updateError) {
      throw updateError;
    }

    // Notify admin
    if (quote.assigned_admin_id) {
      await notifyAdminOfQuoteResponse(
        quote.assigned_admin_id,
        quoteId,
        quote.product_name,
        false,
        userId
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error rejecting quote changes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject changes'
    };
  }
}

export async function notifyAdminOfQuoteResponse(
  adminId: string,
  quoteId: string,
  quoteName: string,
  accepted: boolean,
  userId: string
): Promise<void> {
  try {
    // Get user name
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('name, first_name, last_name, company')
      .eq('user_id', userId)
      .single();

    const userName = userProfile?.company ||
      userProfile?.name ||
      (userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : 'User');

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: adminId,
        type: accepted ? 'quote_accepted' : 'quote_rejected',
        action_type: 'general',
        title: accepted ? 'Quote Changes Accepted' : 'Quote Changes Rejected',
        message: `${userName} has ${accepted ? 'accepted' : 'rejected'} your edits to "${quoteName}".`,
        read: false,
        action_required: false,
        link_to: `/admin/users?view=${userId}`,
        reference_id: quoteId
      });

    if (error) {
      console.error('Failed to create admin notification:', error);
    }
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

export async function getQuoteRevisions(quoteId: string) {
  const { data, error } = await supabase
    .from('quote_revisions')
    .select(`
      *,
      editor:edited_by (
        name,
        first_name,
        last_name
      )
    `)
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quote revisions:', error);
    return [];
  }

  return data || [];
}
