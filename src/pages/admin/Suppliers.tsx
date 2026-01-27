import React, { useState, useEffect } from 'react';
import {
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  DollarSign,
  Mail,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { stripeConnectService, Supplier } from '@/lib/stripeConnect';
import Modal from '@/components/Modal';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await stripeConnectService.getAllSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const supplier = await stripeConnectService.createSupplier({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        commission_rate: parseFloat(formData.get('commission_rate') as string) || 3.0,
      });

      if (supplier) {
        setSuppliers([supplier, ...suppliers]);
        setShowCreateModal(false);
        toast.success('Supplier created successfully');
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Failed to create supplier');
    }
  };

  const handleOnboardSupplier = async (supplier: Supplier) => {
    try {
      const returnUrl = `${window.location.origin}/admin/suppliers?onboarding=success`;
      const refreshUrl = `${window.location.origin}/admin/suppliers?onboarding=refresh`;

      const { url } = await stripeConnectService.onboardSupplier(
        supplier.id,
        returnUrl,
        refreshUrl
      );

      window.location.href = url;
    } catch (error) {
      console.error('Error onboarding supplier:', error);
      toast.error('Failed to start onboarding process');
    }
  };

  const handleRefreshStatus = async (supplier: Supplier) => {
    if (!supplier.stripe_account_id) {
      toast.error('Supplier not connected to Stripe');
      return;
    }

    try {
      setRefreshingStatus(supplier.id);
      const status = await stripeConnectService.getAccountStatus(supplier.id);

      const updatedSupplier = await stripeConnectService.updateSupplier(supplier.id, {
        onboarding_completed: status.onboardingComplete,
        stripe_account_status: status.chargesEnabled ? 'active' : 'pending',
      });

      if (updatedSupplier) {
        setSuppliers(
          suppliers.map((s) => (s.id === supplier.id ? updatedSupplier : s))
        );
        toast.success('Status updated successfully');
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast.error('Failed to refresh status');
    } finally {
      setRefreshingStatus(null);
    }
  };

  const getStatusBadge = (supplier: Supplier) => {
    if (!supplier.stripe_account_id) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-[#3a3a3a] dark:text-gray-300">
          <Clock className="w-3 h-3 mr-1" />
          Not Connected
        </span>
      );
    }

    switch (supplier.stripe_account_status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'restricted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Restricted
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Disabled
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 dark:text-white mb-2">
            Suppliers
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 flex items-start sm:items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
            Manage supplier accounts and Stripe Connect integration
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="btn-icon" />
          Add Supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 dark:text-white mb-2">
            No suppliers yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Get started by adding your first supplier
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="btn-icon" />
            Add Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 dark:text-white mb-1">
                      {supplier.name}
                    </h3>
                    {getStatusBadge(supplier)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {supplier.stripe_account_id && (
                    <button
                      onClick={() => handleRefreshStatus(supplier)}
                      disabled={refreshingStatus === supplier.id}
                      className="btn btn-ghost p-2"
                      title="Refresh Status"
                    >
                      <RefreshCw
                        className={`btn-icon ${
                          refreshingStatus === supplier.id ? 'animate-spin' : ''
                        }`}
                      />
                    </button>
                  )}
                  {!supplier.onboarding_completed && (
                    <button
                      onClick={() => handleOnboardSupplier(supplier)}
                      className="btn btn-primary text-sm"
                    >
                      <ExternalLink className="btn-icon" />
                      {supplier.stripe_account_id
                        ? 'Complete Onboarding'
                        : 'Connect Stripe'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {supplier.email}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {supplier.commission_rate}% commission
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(supplier.created_at).toLocaleDateString()}
                  </span>
                </div>
                {supplier.stripe_account_id && (
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Stripe Connected
                    </span>
                  </div>
                )}
              </div>

              {supplier.stripe_account_id && !supplier.onboarding_completed && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    Stripe account created but onboarding is not complete. The supplier
                    needs to finish setting up their account before they can receive
                    payments.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add Supplier"
        >
          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Name
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark dark:bg-[#3a3a3a] text-gray-900 dark:text-gray-100 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter supplier business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark dark:bg-[#3a3a3a] text-gray-900 dark:text-gray-100 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="supplier@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Commission Rate (%)
              </label>
              <input
                type="number"
                name="commission_rate"
                step="0.01"
                min="0"
                max="100"
                defaultValue="2.00"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark dark:bg-[#3a3a3a] text-gray-900 dark:text-gray-100 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="2.00"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The percentage you'll earn from each transaction with this supplier
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
              >
                Create Supplier
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
