import React from 'react';
import { Store } from 'lucide-react';

interface StoreCardProps {
  storeName: string;
  storeUrl: string;
  onDisconnect?: () => void;
}

const StoreCard: React.FC<StoreCardProps> = ({
  storeName,
  storeUrl,
  onDisconnect
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Store className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{storeName}</h3>
            <p className="text-sm text-gray-500">{storeUrl}</p>
          </div>
        </div>
        {onDisconnect && (
          <button
            onClick={onDisconnect}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
};

export default StoreCard;