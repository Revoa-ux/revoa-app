import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConnectPlatformCardProps {
  platform: 'facebook' | 'tiktok' | 'google';
  platformLabel: string;
}

export default function ConnectPlatformCard({ platform, platformLabel }: ConnectPlatformCardProps) {
  const navigate = useNavigate();

  const handleConnect = () => {
    navigate(`/settings?tab=integrations&platform=${platform}`);
  };

  return (
    <button
      onClick={handleConnect}
      className="h-[180px] rounded-xl border border-dashed border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50/70 dark:hover:bg-[#3a3a3a]/70 transition-all duration-200 flex flex-col items-center justify-center group"
    >
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3a3a3a] group-hover:bg-gray-200 dark:group-hover:bg-[#4a4a4a] flex items-center justify-center mb-3 transition-colors">
        <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" />
      </div>
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
        Connect {platformLabel}
      </span>
      <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Sync your ads to see metrics
      </span>
    </button>
  );
}
