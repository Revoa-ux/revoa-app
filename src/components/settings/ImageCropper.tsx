import React, { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUrl,
  onCrop,
  onCancel,
  aspectRatio = 1 // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleCrop = () => {
    setIsLoading(true);
    try {
      // Since we removed react-cropper, we'll just pass back the original image
      onCrop(imageUrl);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onCancel} />

      {/* Modal */}
      <div className="modal-container">
        <div 
          className="modal-content max-w-md"
          role="dialog"
          aria-modal="true"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-medium text-gray-900">Adjust Image</h3>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Preview */}
          <div className="relative w-full" style={{ height: '300px' }}>
            <img 
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCrop}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Apply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;