import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Eye, ExternalLink, FileText, Image as ImageIcon, Film, Volume2, VolumeX } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import Modal from '@/components/Modal'; // eslint-disable-line @typescript-eslint/no-unused-vars

interface CreativePreviewModalProps {
  creative: {
    id: string;
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
    headline: string;
    description: string;
    adCopy?: string;
    ctaText?: string;
    platform?: 'facebook' | 'tiktok';
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
        className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-xl"
        style={{ 
          maxHeight: 'calc(100vh - 2rem)',
          animation: 'dropdown-in 0.2s ease-out'
        }}
      >
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{creative.headline}</h3>
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
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem - 73px)' }}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img 
                  src={pageProfile.imageUrl} 
                  alt={pageProfile.name}
                  className="w-full h-full object-cover"
                />
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

            <div className="aspect-[4/5] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative mb-4">
              {creative.type === 'video' ? (
                <>
                  <video
                    ref={videoRef}
                    src={creative.url}
                    poster={creative.thumbnail}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                  />
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                </>
              ) : (
                <img
                  src={creative.url}
                  alt={creative.headline}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {creative.ctaText && (
              <div className="mb-6">
                <button className="w-full px-4 py-3 bg-[#1877F2] text-white text-sm font-semibold rounded-lg hover:bg-[#1877F2]/90 transition-colors">
                  {creative.ctaText}
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Headline</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{creative.headline}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{creative.description}</p>
              </div>
            </div>

            <div className="mt-4">
              <a
                href={creative.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                View original ad <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};