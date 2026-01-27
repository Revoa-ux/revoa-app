import React, { useState } from 'react';
import { Copy, Check, ExternalLink, AlertCircle, Info } from 'lucide-react';
import { toast } from '../../lib/toast';
import { useTheme } from '@/contexts/ThemeContext';

interface PixelInstallationProps {
  userId: string;
}

export const PixelInstallation: React.FC<PixelInstallationProps> = ({ userId }) => {
  const [copied, setCopied] = useState(false);
  const { effectiveTheme } = useTheme();

  const pixelCode = `<!-- Revoa Tracking Pixel -->
<script src="https://revoa.app/pixel.js" data-store-id="${userId}"></script>
<!-- End Revoa Pixel -->`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixelCode);
      setCopied(true);
      toast.success('Pixel code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="space-y-6">
      <div className="info-banner info-banner-blue p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              Boost Attribution Accuracy by 40%+
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              The Revoa tracking pixel captures first-party data to overcome iOS 14+ tracking limitations.
              Install it once to unlock accurate conversion tracking, better ROAS reporting, and improved ad performance.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Installation Code
        </h3>

        <div className="relative">
          <div className="bg-dark dark:bg-gray-950 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre className="text-gray-100">
              <code>{pixelCode}</code>
            </pre>
          </div>

          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-10 h-10 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center">
            <img
              src={effectiveTheme === 'dark'
                ? 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_white.svg'
                : 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_black.svg'
              }
              alt="Shopify"
              className="w-6 h-6 object-contain"
            />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white">Shopify Installation</h4>
        </div>

        <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start">
            <span className="font-semibold text-gray-900 dark:text-white mr-2">1.</span>
            <span>Go to your Shopify Admin</span>
          </li>
          <li className="flex items-start">
            <span className="font-semibold text-gray-900 dark:text-white mr-2">2.</span>
            <span>Click "Online Store" → "Themes"</span>
          </li>
          <li className="flex items-start">
            <span className="font-semibold text-gray-900 dark:text-white mr-2">3.</span>
            <span>Click "Actions" → "Edit code"</span>
          </li>
          <li className="flex items-start">
            <span className="font-semibold text-gray-900 dark:text-white mr-2">4.</span>
            <span>Find <code className="bg-gray-100 dark:bg-[#2a2a2a] px-1 rounded">theme.liquid</code> file</span>
          </li>
          <li className="flex items-start">
            <span className="font-semibold text-gray-900 dark:text-white mr-2">5.</span>
            <span>Paste code before <code className="bg-gray-100 dark:bg-[#2a2a2a] px-1 rounded">&lt;/head&gt;</code></span>
          </li>
          <li className="flex items-start">
            <span className="font-semibold text-gray-900 dark:text-white mr-2">6.</span>
            <span>Click "Save"</span>
          </li>
        </ol>

        <a
          href="https://help.shopify.com/en/manual/online-store/themes/theme-structure/extend/edit-theme-code"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-4 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
        >
          <span>View Shopify Guide</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="info-banner info-banner-yellow p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              Important Notes
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
              <li>Install the pixel on ALL pages of your store for complete tracking</li>
              <li>It may take 24-48 hours for data to start appearing in reports</li>
              <li>The pixel works alongside Facebook Pixel, Google Analytics, and other tracking tools</li>
              <li>Test your installation by visiting your store and checking browser console logs</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200 dark:border-[#333333]">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Your Store ID: <code className="bg-gray-100 dark:bg-[#2a2a2a] px-2 py-1 rounded font-mono text-xs sm:text-sm break-all">{userId}</code>
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap w-full sm:w-auto"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy Install Code</span>
        </button>
      </div>
    </div>
  );
};
