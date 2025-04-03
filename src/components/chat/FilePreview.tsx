import React, { useState } from 'react';
import { X, Download, Eye, ExternalLink, FileText, Image as ImageIcon, Film } from 'lucide-react';
import { formatFileSize } from '@/lib/chat/fileUpload';

interface FilePreviewProps {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  url,
  fileName,
  fileSize,
  fileType,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');
  const isPDF = fileType === 'application/pdf';

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load file preview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-gray-400" />
            ) : isVideo ? (
              <Film className="w-5 h-5 text-gray-400" />
            ) : (
              <FileText className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-900 truncate max-w-md">{fileName}</h3>
              <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={url}
              download={fileName}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <Eye className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">{error}</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                Open in new tab
              </a>
            </div>
          )}

          {isImage && (
            <img
              src={url}
              alt={fileName}
              className="max-w-full h-auto mx-auto"
              onLoad={handleLoad}
              onError={handleError}
            />
          )}

          {isVideo && (
            <video
              src={url}
              controls
              className="max-w-full h-auto mx-auto"
              onLoadedData={handleLoad}
              onError={handleError}
            />
          )}

          {isPDF && (
            <iframe
              src={`${url}#view=FitH`}
              className="w-full h-full min-h-[500px]"
              onLoad={handleLoad}
              onError={handleError}
            />
          )}

          {!isImage && !isVideo && !isPDF && (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">Preview not available</p>
              <div className="flex space-x-4">
                <a
                  href={url}
                  download={fileName}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};