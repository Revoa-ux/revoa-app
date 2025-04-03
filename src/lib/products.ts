import { supabase } from './supabase';
import { Product, ProductVariant, ApprovalHistoryEntry } from '@/types/products';
import { toast } from 'sonner';

export const createProduct = async (
  product: Omit<Product, 'id' | 'createdAt' | 'approvalStatus' | 'createdBy'>
): Promise<Product> => {
  try {
    // First create the product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert({
        name: product.name,
        description: product.description,
        category: product.category,
        metadata: product.metadata
      })
      .select()
      .single();

    if (productError) throw productError;

    // Then create the variants
    const variants = await Promise.all(
      product.variants.map(variant =>
        supabase
          .from('product_variants')
          .insert({
            product_id: productData.id,
            name: variant.name,
            sku: variant.sku,
            item_cost: variant.itemCost,
            shipping_cost: variant.shippingCost,
            recommended_price: variant.recommendedPrice,
            images: variant.images
          })
          .select()
      )
    );

    if (variants.some(v => v.error)) {
      throw new Error('Failed to create product variants');
    }

    return {
      ...productData,
      variants: variants.map(v => v.data![0]) as ProductVariant[]
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const getProducts = async (filters?: {
  category?: string;
  approvalStatus?: Product['approvalStatus'];
  createdBy?: string;
}): Promise<Product[]> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        variants:product_variants(*)
      `);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.approvalStatus) {
      query = query.eq('approval_status', filters.approvalStatus);
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const approveProduct = async (
  productId: string,
  approved: boolean,
  comments?: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        approval_status: approved ? 'approved' : 'rejected',
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) throw error;

    // Notify the product creator
    const { data: product } = await supabase
      .from('products')
      .select('created_by, name')
      .eq('id', productId)
      .single();

    if (product) {
      await supabase
        .from('notifications')
        .insert({
          user_id: product.created_by,
          type: 'product_approval_result',
          title: `Product ${approved ? 'Approved' : 'Rejected'}`,
          message: `Your product "${product.name}" has been ${approved ? 'approved' : 'rejected'}${comments ? `: ${comments}` : ''}`,
          metadata: {
            product_id: productId,
            product_name: product.name,
            approved
          }
        });
    }

    toast.success(`Product ${approved ? 'approved' : 'rejected'} successfully`);
  } catch (error) {
    console.error('Error updating product approval:', error);
    throw error;
  }
};

export const getApprovalHistory = async (
  productId: string
): Promise<ApprovalHistoryEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('product_approval_history')
      .select(`
        *,
        reviewer:reviewed_by(email)
      `)
      .eq('product_id', productId)
      .order('reviewed_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching approval history:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('approval_status', 'approved');

    if (error) throw error;

    // Get unique categories
    return Array.from(new Set(data.map(p => p.category)));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};