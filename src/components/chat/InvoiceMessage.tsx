import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Message } from '@/types/chat';

interface InvoiceMessageProps {
  message: Message;
  onDownload: () => void;
}

export const InvoiceMessage: React.FC<InvoiceMessageProps> = ({
  message,
  onDownload
}) => {
  const { fileName, fileSize } = message.metadata || {};

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer" onClick={onDownload}>
      <div className="flex items-center space-x-3">
        <FileText className="w-5 h-5 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{fileName}</p>
          <p className="text-xs text-gray-500">
            {fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB` : 'Excel file'}
          </p>
        </div>
        <Download className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
};