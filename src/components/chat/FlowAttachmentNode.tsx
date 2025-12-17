import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Download, Image as ImageIcon, Video, FileText, Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface FlowAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

interface FlowAttachmentNodeProps {
  sessionId: string;
  minFiles?: number;
  maxFiles?: number;
  onAttachmentsChange?: (attachments: FlowAttachment[]) => void;
  disabled?: boolean;
}

export function FlowAttachmentNode({
  sessionId,
  minFiles = 1,
  maxFiles = 10,
  onAttachmentsChange,
  disabled = false,
}: FlowAttachmentNodeProps) {
  const [attachments, setAttachments] = useState<FlowAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load existing attachments
  React.useEffect(() => {
    loadAttachments();
  }, [sessionId]);

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('flow_attachments')
        .select('*')
        .eq('session_id', sessionId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setAttachments(data);
        onAttachmentsChange?.(data);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    // Check if we would exceed max files
    if (attachments.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload each file
      const uploadPromises = acceptedFiles.map(async (file) => {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('flow-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('flow-attachments')
          .getPublicUrl(fileName);

        // Save to database
        const { data: attachment, error: dbError } = await supabase
          .from('flow_attachments')
          .insert({
            session_id: sessionId,
            file_url: fileName,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (dbError) throw dbError;
        return attachment;
      });

      const newAttachments = await Promise.all(uploadPromises);
      const updated = [...attachments, ...newAttachments];
      setAttachments(updated);
      onAttachmentsChange?.(updated);
      toast.success(`${newAttachments.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  }, [attachments, sessionId, maxFiles, disabled, onAttachmentsChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    disabled: disabled || uploading,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleDelete = async (attachment: FlowAttachment) => {
    if (disabled) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('flow-attachments')
        .remove([attachment.file_url]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('flow_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      const updated = attachments.filter(a => a.id !== attachment.id);
      setAttachments(updated);
      onAttachmentsChange?.(updated);
      toast.success('File removed');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleDownload = async (attachment: FlowAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('flow-attachments')
        .download(attachment.file_url);

      if (error) throw error;

      // Create download link
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

  const handleCopyUrl = async (attachment: FlowAttachment) => {
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('flow-attachments')
        .getPublicUrl(attachment.file_url);

      await navigator.clipboard.writeText(publicUrl);
      setCopiedId(attachment.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('URL copied to clipboard');
    } catch (error) {
      console.error('Error copying URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const meetsMinimum = attachments.length >= minFiles;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {attachments.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 dark:hover:border-blue-500'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {isDragActive ? 'Drop files here...' : 'Drag and drop files here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Images (JPG, PNG, GIF, WebP) and Videos (MP4, MOV, AVI, WebM) up to 50MB
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {attachments.length} of {maxFiles} files uploaded
              </p>
            </>
          )}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Uploaded Files ({attachments.length}/{maxFiles})
            </h4>
            {!meetsMinimum && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Minimum {minFiles} file(s) required
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                    {getFileIcon(attachment.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>

                  <button
                    onClick={() => handleCopyUrl(attachment)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Copy URL"
                  >
                    {copiedId === attachment.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy URL
                      </>
                    )}
                  </button>

                  {!disabled && (
                    <button
                      onClick={() => handleDelete(attachment)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ml-auto"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Message */}
      {!meetsMinimum && attachments.length > 0 && (
        <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          Please upload at least {minFiles} file(s) to continue.
        </div>
      )}
    </div>
  );
}
