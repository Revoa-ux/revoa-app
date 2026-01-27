import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Image as ImageIcon, Video, FileText, Loader2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { format } from 'date-fns';

interface FlowAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

interface FlowAttachmentListProps {
  sessionId: string;
  compact?: boolean;
}

export function FlowAttachmentList({ sessionId, compact = false }: FlowAttachmentListProps) {
  const [attachments, setAttachments] = useState<FlowAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [sessionId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('flow_attachments')
        .select('*')
        .eq('session_id', sessionId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: FlowAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('flow-attachments')
        .download(attachment.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDownloadAll = async () => {
    if (attachments.length === 0) return;

    setDownloadingAll(true);
    try {
      for (const attachment of attachments) {
        await handleDownload(attachment);
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast.success('All files downloaded');
    } catch (error) {
      console.error('Error downloading all files:', error);
      toast.error('Failed to download all files');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleCopyUrl = async (attachment: FlowAttachment) => {
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('flow-attachments')
        .getPublicUrl(attachment.file_url);

      await navigator.clipboard.writeText(publicUrl);
      setCopiedId(attachment.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('URL copied');
    } catch (error) {
      console.error('Error copying URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getThumbnailUrl = (attachment: FlowAttachment) => {
    if (attachment.file_type.startsWith('image/')) {
      const { data: { publicUrl } } = supabase.storage
        .from('flow-attachments')
        .getPublicUrl(attachment.file_url);
      return publicUrl;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No attachments</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
          </span>
          {attachments.length > 1 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
            >
              {downloadingAll ? 'Downloading...' : 'Download All'}
            </button>
          )}
        </div>
        <div className="space-y-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark rounded text-xs"
            >
              <div className="text-gray-400">{getFileIcon(attachment.file_type)}</div>
              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                {attachment.file_name}
              </span>
              <button
                onClick={() => handleDownload(attachment)}
                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Attachments ({attachments.length})
        </h3>
        {attachments.length > 1 && (
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Download All
              </>
            )}
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 gap-3">
        {attachments.map((attachment) => {
          const thumbnailUrl = getThumbnailUrl(attachment);
          const isImage = attachment.file_type.startsWith('image/');

          return (
            <div
              key={attachment.id}
              className="group relative border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden bg-white dark:bg-dark hover:shadow-md transition-shadow"
            >
              {/* Thumbnail or Icon */}
              <div className="aspect-video bg-gray-100 dark:bg-dark flex items-center justify-center relative">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={attachment.file_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(thumbnailUrl)}
                  />
                ) : (
                  <div className="text-gray-400 dark:text-gray-600">
                    {getFileIcon(attachment.file_type)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
                  {attachment.file_name}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>{format(new Date(attachment.uploaded_at), 'MMM d, h:mm a')}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    onClick={() => handleCopyUrl(attachment)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors"
                  >
                    {copiedId === attachment.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white dark:bg-dark rounded-full hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
