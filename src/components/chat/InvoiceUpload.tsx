import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { FileText, X, Eye } from 'lucide-react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { toast } from 'sonner';

interface InvoiceUploadProps {
  onUpload: (file: File) => void;
  onPreview: (file: File) => void;
  onCancel: () => void;
  file: File | null;
}

export const InvoiceUpload: React.FC<InvoiceUploadProps> = ({
  onUpload,
  onPreview,
  onCancel,
  file
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    onUpload(file);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false
  });

  if (file) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPreview(file)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
        isDragActive
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input {...getInputProps()} />
      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-600">
        {isDragActive
          ? 'Drop the invoice here'
          : 'Drag & drop invoice PDF here, or click to select'}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Only PDF files are supported
      </p>
    </div>
  );
};