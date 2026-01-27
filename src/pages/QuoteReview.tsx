import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, AlertCircle, Loader2, ArrowLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from '../lib/toast';
import {
  getCogsUpdateById,
  acceptCogsUpdate,
  rejectCogsUpdate,
  CogsUpdate,
} from '@/lib/cogsUpdateService';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface ProductInfo {
  id: string;
  name: string;
  description?: string;
}

interface VariantInfo {
  id: string;
  name: string;
  sku: string;
}

export default function QuoteReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [update, setUpdate] = useState<CogsUpdate | null>(null);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [variant, setVariant] = useState<VariantInfo | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUpdateDetails();
    }
  }, [id]);

  const fetchUpdateDetails = async () => {
    try {
      setLoading(true);

      if (!id) {
        throw new Error('No update ID provided');
      }

      const updateData = await getCogsUpdateById(id);

      if (!updateData) {
        throw new Error('Update not found');
      }

      setUpdate(updateData);

      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, description')
        .eq('id', updateData.product_id)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch variant details if applicable
      if (updateData.variant_id) {
        const { data: variantData, error: variantError } = await supabase
          .from('product_variants')
          .select('id, name, sku')
          .eq('id', updateData.variant_id)
          .single();

        if (variantError) throw variantError;
        setVariant(variantData);
      }
    } catch (error: any) {
      console.error('Error fetching update details:', error);
      toast.error(error.message || 'Failed to load quote details');
      navigate('/notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!id) return;

    setSubmitting(true);

    try {
      await acceptCogsUpdate(id, responseNotes || undefined);
      toast.success('Cost update accepted successfully');
      navigate('/notifications');
    } catch (error: any) {
      console.error('Error accepting update:', error);
      toast.error(error.message || 'Failed to accept update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;

    if (!responseNotes.trim()) {
      toast.error('Please provide a reason for rejecting');
      return;
    }

    setSubmitting(true);

    try {
      await rejectCogsUpdate(id, responseNotes);
      toast.success('Cost update rejected');
      navigate('/notifications');
    } catch (error: any) {
      console.error('Error rejecting update:', error);
      toast.error(error.message || 'Failed to reject update');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!update || !product) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Quote not found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          This quote may have been removed or you don't have access to it.
        </p>
        <button
          onClick={() => navigate('/notifications')}
          className="btn btn-primary"
        >
          Back to Notifications
        </button>
      </div>
    );
  }

  const costDifference = update.new_cogs - update.old_cogs;
  const percentageChange = update.old_cogs > 0 ? (costDifference / update.old_cogs) * 100 : 0;
  const isIncrease = costDifference > 0;

  const isExpired = update.expires_at && new Date(update.expires_at) < new Date();
  const isActionable = update.status === 'pending_acceptance' && !isExpired;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/notifications')}
        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Notifications</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Product Cost Update Review
        </h1>
        <div className="flex items-center space-x-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isActionable ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {update.status === 'accepted' ? 'Accepted' : update.status === 'rejected' ? 'Rejected' : isExpired ? 'Expired' : 'Awaiting your decision'}
          </p>
        </div>
      </div>

      {/* Status Alert */}
      {!isActionable && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {update.status === 'accepted' ? 'This update has been accepted' : update.status === 'rejected' ? 'This update has been rejected' : 'This update has expired'}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {update.status === 'accepted' ? 'The new cost has been applied to your products.' : update.status === 'rejected' ? 'Your current costs remain unchanged.' : 'This quote is no longer valid. Please contact your supplier for a new quote.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product Info */}
      <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Product Name</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">{product.name}</p>
          </div>

          {variant && (
            <>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Variant</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{variant.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">SKU</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{variant.sku}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Comparison</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Current Cost */}
          <div className="bg-gray-50 dark:bg-dark rounded-lg p-4 border border-gray-200 dark:border-[#3a3a3a]">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Current Cost</p>
            <div className="flex items-baseline space-x-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {update.old_cogs.toFixed(2)}
              </p>
            </div>
          </div>

          {/* New Cost */}
          <div className={`rounded-lg p-4 border ${
            isIncrease
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">New Cost</p>
            <div className="flex items-baseline space-x-2">
              <DollarSign className={`w-5 h-5 ${isIncrease ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
              <p className={`text-2xl font-bold ${isIncrease ? 'text-orange-900 dark:text-orange-100' : 'text-green-900 dark:text-green-100'}`}>
                {update.new_cogs.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Change Indicator */}
        <div className={`mt-4 p-4 rounded-lg ${
          isIncrease
            ? 'bg-orange-100 dark:bg-orange-900/30'
            : 'bg-green-100 dark:bg-green-900/30'
        }`}>
          <div className="flex items-center justify-center space-x-3">
            {isIncrease ? (
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
            <p className={`text-lg font-semibold ${
              isIncrease
                ? 'text-orange-900 dark:text-orange-100'
                : 'text-green-900 dark:text-green-100'
            }`}>
              {isIncrease ? '+' : ''}{costDifference.toFixed(2)} USD ({isIncrease ? '+' : ''}{percentageChange.toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Reason for Change */}
      {update.reason_for_change && (
        <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Reason for Change
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{update.reason_for_change}</p>
        </div>
      )}

      {/* Response Section */}
      {isActionable && (
        <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Response</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional for acceptance, Required for rejection)
            </label>
            <textarea
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              placeholder="Add any notes or comments about this cost update..."
              rows={4}
              disabled={submitting}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white border-gray-300 dark:border-[#4a4a4a] focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700 resize-none"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Important:</strong> Accepting this update will apply the new cost to all pending and future invoices for this product.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="btn btn-danger flex items-center gap-2"
            >
              {submitting ? <Loader2 className="btn-icon w-4 h-4 animate-spin" /> : <X className="btn-icon w-4 h-4" />}
              <span>Reject</span>
            </button>
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="btn btn-primary flex items-center gap-2"
            >
              {submitting ? <Loader2 className="btn-icon w-4 h-4 animate-spin" /> : <Check className="btn-icon w-4 h-4" />}
              <span>Accept Update</span>
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white dark:bg-dark rounded-lg border border-gray-200 dark:border-[#3a3a3a] p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Created</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
            </span>
          </div>

          {update.expires_at && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Expires</span>
              <span className={`font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {isExpired ? 'Expired' : formatDistanceToNow(new Date(update.expires_at), { addSuffix: true })}
              </span>
            </div>
          )}

          {update.accepted_at && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Accepted</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatDistanceToNow(new Date(update.accepted_at), { addSuffix: true })}
              </span>
            </div>
          )}

          {update.rejected_at && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Rejected</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {formatDistanceToNow(new Date(update.rejected_at), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
