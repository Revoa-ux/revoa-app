import React, { useState, useEffect, useCallback } from 'react';
import { 
  Facebook, 
  Search, 
  CheckCircle, 
  Loader2, 
  AlertTriangle, 
  X, 
  ChevronDown, 
  Check,
  BarChart3,
  ArrowRight
} from 'lucide-react';

interface AdPlatformIntegrationProps {
  onPlatformsConnected: (platforms: string[]) => void;
}

const AdPlatformIntegration: React.FC<AdPlatformIntegrationProps> = ({ onPlatformsConnected }) => {
  const [platforms, setPlatforms] = useState([
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook className="w-5 h-5" />,
      color: 'bg-[#1877F2]',
      status: 'idle'
    },
    {
      id: 'google',
      name: 'Google Ads',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>,
      color: 'bg-white',
      status: 'idle'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>,
      color: 'bg-black',
      status: 'idle'
    }
  ]);

  // Memoize the function that updates connected platforms
  const updateConnectedPlatforms = useCallback(() => {
    const connectedPlatforms = platforms
      .filter(p => p.status === 'connected')
      .map(p => p.id);
    
    onPlatformsConnected(connectedPlatforms);
  }, [platforms, onPlatformsConnected]);
  
  // Update parent component when platforms change
  useEffect(() => {
    updateConnectedPlatforms();
  }, [updateConnectedPlatforms]);
  
  const handleConnectPlatform = (platformId: string) => {
    setPlatforms(prev => 
      prev.map(p => 
        p.id === platformId 
          ? { ...p, status: 'connecting' } 
          : p
      )
    );
    
    const width = 800;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      'about:blank',
      `${platformId}-oauth`,
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    setTimeout(() => {
      setPlatforms(prev => 
        prev.map(p => 
          p.id === platformId 
            ? { ...p, status: 'connected' }
            : p
        )
      );
    }, 2000);
  };
  
  const handleDisconnectPlatform = (platformId: string) => {
    setPlatforms(prev => 
      prev.map(p => 
        p.id === platformId 
          ? { ...p, status: 'idle' } 
          : p
      )
    );
  };

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 mb-4">
            <img 
              src="https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//REVOA%20Sync%20Ads.png"
              alt="Revoa Ad Platform Sync"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900 mb-3">Connect Your Ad Platforms</h2>
          <p className="mt-1 text-gray-600 max-w-md mx-auto">
            Connect your advertising accounts to import your campaigns, ad sets, and performance data.
          </p>
        </div>
        
        <div className="space-y-3 mt-6">
          {platforms.map((platform) => (
            <div 
              key={platform.id} 
              className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                platform.status === 'connected' 
                  ? 'border-gray-900 bg-gray-50/50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg ${platform.color} text-white flex items-center justify-center`}>
                    {platform.icon}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">{platform.name}</h3>
                    <p className="text-xs text-gray-500">
                      {platform.status === 'idle' && 'Not connected'}
                      {platform.status === 'connecting' && 'Connecting...'}
                      {platform.status === 'connected' && 'Connected'}
                      {platform.status === 'error' && 'Connection error'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {platform.status === 'idle' && (
                    <button
                      onClick={() => handleConnectPlatform(platform.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Connect
                    </button>
                  )}
                  
                  {platform.status === 'connecting' && (
                    <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                  )}
                  
                  {platform.status === 'connected' && (
                    <button
                      onClick={() => handleDisconnectPlatform(platform.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  {platform.status === 'error' && (
                    <button
                      onClick={() => handleConnectPlatform(platform.id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900">Connected Platforms</h3>
              <p className="mt-1 text-sm text-gray-600">
                You can add more platforms later from your account settings.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {platforms.filter(p => p.status === 'connected').length} of {platforms.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdPlatformIntegration;