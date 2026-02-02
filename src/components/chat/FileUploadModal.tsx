import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, AlertTriangle } from 'lucide-react';
import { toast } from '../../lib/toast';
import Modal from '../Modal';

interface FileUploadModalProps {
  onClose: () => void;
  onUpload: (file: File, messageText?: string) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  onClose,
  onUpload
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messageText, setMessageText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setError(null);
    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const handleSend = async () => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      onUpload(selectedFile, messageText.trim() || undefined);
    } catch (error) {
      console.error('Error processing file:', error);
      setError(error instanceof Error ? error.message : 'Failed to process file');
      toast.error('Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

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
      title={selectedFile ? 'Send File' : 'Upload File'}
    >
      <div className="space-y-4">
        {!selectedFile ? (
          <>
            <div
              {...getRootProps()}
              className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/10'
                  : 'border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag & drop a file here, or click to select'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Supported files: Excel (.xls, .xlsx), PDF, Images, Word documents
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Excel Files</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">XLS, XLSX up to 10MB</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-red-500 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Other Files</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC, DOCX, Images up to 25MB</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-[#333333]">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-contain bg-gray-50 dark:bg-dark"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Add a message (optional)
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Add a caption or message..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setMessageText('');
                }}
                className="btn btn-secondary flex-1"
                disabled={isProcessing}
              >
                Change File
              </button>
              <button
                onClick={handleSend}
                disabled={isProcessing}
                className="btn btn-danger flex-1"
              >
                {isProcessing ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        )}

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
      </div>
    </Modal>
  );
};
