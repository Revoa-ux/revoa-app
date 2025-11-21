import React, { useState } from 'react';
import { Code, Copy, Check, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface PixelInstallationProps {
  userId: string;
}

export const PixelInstallation: React.FC<PixelInstallationProps> = ({ userId }) => {
  const [copied, setCopied] = useState(false);

  const pixelCode = `<!-- Revoa Tracking Pixel -->
<script src="https://revoa.app/pixel.js" data-store-id="${userId}"></script>
<!-- End Revoa Pixel -->`;

  const shopifyInstructions = `1. Go to your Shopify Admin
2. Click "Online Store" > "Themes"
3. Click "Actions" > "Edit code"
4. Find theme.liquid file
5. Paste the code before </head>
6. Click "Save"`;

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
      <div className="flex items-start space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
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

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Installation Code
        </h3>

        <div className="relative">
          <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 font-mono text-sm overflow-x-auto">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.018 1.505c-1.582 0-3.12.626-4.243 1.74-1.114 1.106-1.74 2.644-1.74 4.227 0 1.574.626 3.112 1.74 4.226 1.123 1.115 2.661 1.74 4.243 1.74 1.574 0 3.12-.625 4.235-1.74 1.123-1.114 1.749-2.652 1.749-4.226 0-1.583-.626-3.121-1.749-4.227-1.115-1.114-2.661-1.74-4.235-1.74zm9.39 7.595c-.115-.654-.312-1.29-.583-1.899l2.123-2.124c.247-.247.247-.65 0-.898l-1.8-1.8c-.247-.247-.65-.247-.898 0l-2.124 2.124c-.608-.272-1.245-.468-1.898-.583v-3.02c0-.35-.283-.634-.634-.634h-2.546c-.35 0-.634.284-.634.634v3.02c-.653.115-1.29.31-1.898.583l-2.124-2.124c-.247-.247-.65-.247-.898 0l-1.8 1.8c-.247.248-.247.651 0 .898l2.124 2.124c-.272.609-.468 1.245-.583 1.899h-3.02c-.35 0-.634.283-.634.634v2.546c0 .35.284.634.634.634h3.02c.115.653.311 1.29.583 1.898l-2.124 2.124c-.247.247-.247.65 0 .898l1.8 1.8c.248.247.651.247.898 0l2.124-2.124c.609.272 1.245.468 1.898.583v3.02c0 .35.284.634.634.634h2.546c.35 0 .634-.284.634-.634v-3.02c.653-.115 1.29-.311 1.898-.583l2.124 2.124c.247.247.65.247.898 0l1.8-1.8c.247-.248.247-.651 0-.898l-2.123-2.124c.271-.608.468-1.245.583-1.898h3.02c.35 0 .634-.284.634-.634v-2.546c0-.351-.284-.634-.634-.634h-3.02z"/>
              </svg>
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
              <span>Find <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">theme.liquid</code> file</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold text-gray-900 dark:text-white mr-2">5.</span>
              <span>Paste code before <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;/head&gt;</code></span>
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
            className="inline-flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-4"
          >
            <span>View Shopify Guide</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Other Platforms</h4>
          </div>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">WooCommerce</p>
              <p>Add to <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">header.php</code> before <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;/head&gt;</code></p>
            </div>

            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">Custom Site</p>
              <p>Add to your HTML template before the closing <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;/head&gt;</code> tag</p>
            </div>

            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">Google Tag Manager</p>
              <p>Create a Custom HTML tag with the pixel code and set trigger to "All Pages"</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
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

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Your Store ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">{userId}</code>
        </div>
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Install Code</span>
        </button>
      </div>
    </div>
  );
};
