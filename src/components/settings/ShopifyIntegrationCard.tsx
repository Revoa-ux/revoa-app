import React, { useState, useEffect } from 'react';
import { ChevronRight, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getUninstalledShopifyStores, removeUninstalledStore, type ShopifyInstallation } from '@/lib/shopify/status';
import { useConnectionStore } from '@/lib/connectionStore';

interface ShopifyIntegrationCardProps {
  isConnected: boolean;
  storeName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading: boolean;
}

export const ShopifyIntegrationCard: React.FC<ShopifyIntegrationCardProps> = ({
  isConnected,
  storeName,
  onConnect,
  onDisconnect,
  isLoading,
}) => {
  const { user } = useAuth();
  const [uninstalledStores, setUninstalledStores] = useState<ShopifyInstallation[]>([]);
  const [removingStore, setRemovingStore] = useState<string | null>(null);
  const [showUninstalled, setShowUninstalled] = useState(false);

  useEffect(() => {
    loadUninstalledStores();
  }, [user?.id]);

  const loadUninstalledStores = async () => {
    if (!user?.id) return;

    try {
      const stores = await getUninstalledShopifyStores(user.id);
      setUninstalledStores(stores);
    } catch (error) {
      console.error('Error loading uninstalled stores:', error);
    }
  };

  const handleRemoveStore = async (installationId: string, storeUrl: string) => {
    if (!user?.id) return;

    if (!confirm(`Remove ${storeUrl} from your account? This cannot be undone.`)) {
      return;
    }

    try {
      setRemovingStore(installationId);
      const result = await removeUninstalledStore(user.id, installationId);

      if (result.success) {
        toast.success('Store record removed successfully');
        await loadUninstalledStores();
      } else {
        toast.error(result.error || 'Failed to remove store record');
      }
    } catch (error) {
      console.error('Error removing store:', error);
      toast.error('Failed to remove store record');
    } finally {
      setRemovingStore(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Shopify%20logo%20black.png"
              alt="Shopify"
              className="w-6 h-6 object-contain grayscale dark:grayscale-0 dark:invert dark:brightness-0 dark:contrast-200"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Shopify Store</h3>
            {isConnected && storeName ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{storeName}</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Not connected</p>
            )}
          </div>
        </div>
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          disabled={isLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isConnected
              ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
              : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {isLoading ? 'Loading...' : isConnected ? 'Disconnect' : (
            <>
              Connect
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {uninstalledStores.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowUninstalled(!showUninstalled)}
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{uninstalledStores.length} uninstalled store{uninstalledStores.length > 1 ? 's' : ''}</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showUninstalled ? 'rotate-90' : ''}`} />
          </button>

          {showUninstalled && (
            <div className="mt-3 space-y-2">
              {uninstalledStores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {store.store_url}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Uninstalled on {formatDate(store.uninstalled_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveStore(store.id, store.store_url)}
                    disabled={removingStore === store.id}
                    className="ml-3 p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove from account"
                  >
                    {removingStore === store.id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                These stores were uninstalled from Shopify. You can remove them from your account or reconnect by installing the app again from your Shopify admin.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
