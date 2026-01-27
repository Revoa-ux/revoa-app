import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Volume2, VolumeX } from 'lucide-react';

interface CreativePreviewModalProps {
  creative: {
    id: string;
    type: 'image' | 'video';
    url: string;
    videoUrl?: string;
    videoId?: string;
    thumbnail?: string;
    headline: string;
    description: string;
    adCopy?: string;
    ctaText?: string;
    platform?: 'facebook' | 'tiktok';
    adAccountId?: string;
    pageProfile?: {
      name: string;
      imageUrl: string;
    };
  };
  onClose: () => void;
}

export const CreativePreviewModal: React.FC<CreativePreviewModalProps> = ({
  creative,
  onClose
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [adCopyOverflows, setAdCopyOverflows] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adCopyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (adCopyRef.current) {
      const element = adCopyRef.current;
      const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
      const height = element.clientHeight;
      const lines = Math.round(height / lineHeight);
      setAdCopyOverflows(lines > 2);
    }
  }, [creative.adCopy]);

  const pageProfile = creative.pageProfile || {
    name: "Your Brand",
    imageUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=200&fit=crop"
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white dark:bg-dark rounded-xl w-full max-w-lg shadow-xl"
        style={{
          maxHeight: 'calc(100vh - 2rem)',
          animation: 'dropdown-in 0.2s ease-out'
        }}
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-dark px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{creative.adName}</h3>
              {creative.platform && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  creative.platform === 'facebook'
                    ? 'bg-[#1877F2]/10 text-[#1877F2]'
                    : 'bg-black/10 text-black dark:text-white'
                }`}>
                  {creative.platform.charAt(0).toUpperCase() + creative.platform.slice(1)}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem - 73px)' }}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-[#3a3a3a] flex items-center justify-center">
                {pageProfile.imageUrl ? (
                  <img
                    src={pageProfile.imageUrl}
                    alt={pageProfile.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<div class="w-8 h-8 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-semibold text-sm">' + pageProfile.name.charAt(0).toUpperCase() + '</div>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {pageProfile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">{pageProfile.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sponsored</p>
              </div>
            </div>

            {creative.adCopy && (
              <div className="mb-4">
                <p
                  ref={adCopyRef}
                  className={`text-sm text-gray-900 dark:text-white whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}
                >
                  {creative.adCopy}
                </p>
                {adCopyOverflows && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    {isExpanded ? 'Show less' : '...See more'}
                  </button>
                )}
              </div>
            )}

            <div className="aspect-[4/5] bg-gray-100 dark:bg-[#3a3a3a] rounded-lg overflow-hidden relative mb-4">
              {creative.type === 'video' && creative.videoUrl ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    src={creative.videoUrl}
                    poster={creative.thumbnail}
                    className="w-full h-full object-cover"
                    controls
                    muted={isMuted}
                    playsInline
                    preload="metadata"
                  />
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              ) : (creative.url || creative.thumbnail) ? (
                <img
                  src={creative.url || creative.thumbnail}
                  alt={creative.adName || 'Ad creative'}
                  className="w-full h-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.log('Image failed to load:', creative.url || creative.thumbnail);
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6 text-center';
                      fallback.innerHTML = `
                        <svg class="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                          <polyline points="21 15 16 10 5 21" stroke-width="2"/>
                        </svg>
                        <p class="text-sm font-medium mb-1">Image Not Available</p>
                        <p class="text-xs">Facebook creative images are protected.<br/>Click below to view in Ads Manager.</p>
                      `;
                      target.parentElement.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-6 text-center">
                  <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <polyline points="21 15 16 10 5 21" strokeWidth="2"/>
                  </svg>
                  <p className="text-sm font-medium mb-1">No Preview Available</p>
                  <p className="text-xs">Click below to view full ad in Ads Manager</p>
                </div>
              )}
            </div>

            {creative.platform === 'facebook' && creative.id && creative.adAccountId && (
              <div className="mb-4">
                <a
                  href={`https://business.facebook.com/adsmanager/manage/ads?act=${creative.adAccountId.replace('act_', '')}&selected_ad_ids=${creative.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full px-4 py-3 bg-white dark:bg-[#3a3a3a] border-2 border-[#1877F2] text-[#1877F2] dark:text-[#1877F2] text-sm font-semibold rounded-lg hover:bg-[#1877F2]/5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Ad in Ads Manager
                </a>
              </div>
            )}

            {creative.ctaText && creative.ctaText !== 'Learn More' && (
              <div className="mb-6">
                <button className="w-full px-4 py-3 bg-[#1877F2] text-white text-sm font-semibold rounded-lg hover:bg-[#1877F2]/90 transition-colors">
                  {creative.ctaText}
                </button>
              </div>
            )}

            <div className="space-y-4">
              {creative.headline && creative.headline !== creative.adName && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Headline</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{creative.headline}</p>
                </div>
              )}

              {creative.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{creative.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
