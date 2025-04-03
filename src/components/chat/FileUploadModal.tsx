import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, FileText, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../Modal';

interface FileUploadModalProps {
  onClose: () => void;
  onUpload: (file: File) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  onClose,
  onUpload
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setError(null);

    try {
      // Process file
      setIsProcessing(true);
      onUpload(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setError(error instanceof Error ? error.message : 'Failed to process file');
      toast.error('Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      // Excel files
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      // PDF files
      'application/pdf': ['.pdf'],
      // Images
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      // Documents
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upload File"
    >
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/10'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <div>
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Processing file...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag & drop a file here, or click to select'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Supported files: Excel (.xls, .xlsx), PDF, Images, Word documents
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-300">Upload Error</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Excel Files</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">XLS, XLSX up to 10MB</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-red-500 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Other Files</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC, DOCX, Images up to 25MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};