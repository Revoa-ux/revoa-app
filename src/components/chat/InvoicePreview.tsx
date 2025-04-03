import React from 'react';
import { X, Download, Send } from 'lucide-react';

interface InvoicePreviewProps {
  file: File;
  onClose: () => void;
  onSend: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  file,
  onClose,
  onSend
}) => {
  const fileUrl = URL.createObjectURL(file);

  React.useEffect(() => {
    return () => {
      URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">Invoice Preview</h3>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={fileUrl}
              download={file.name}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
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
          <iframe
            src={`${fileUrl}#view=FitH`}
            className="w-full h-full min-h-[500px]"
            title="Invoice Preview"
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onSend}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};