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

  return (
    <div className="space-y-4">
      {/* Grid with Upload Button and Attachments */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Upload Button */}
        {attachments.length < maxFiles && (
          <div
            {...getRootProps()}
            className={`
              relative aspect-square rounded-xl cursor-pointer
              transition-all duration-200 overflow-hidden
              bg-white dark:bg-gray-800
              border-2 border-dashed
              ${isDragActive
                ? 'border-rose-400 dark:border-rose-500 scale-105 shadow-lg shadow-rose-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-600 hover:scale-[1.02] hover:shadow-lg'
              }
              ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-rose-500 dark:text-rose-400 animate-spin mb-1.5" />
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    Uploading...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mb-1.5">
                    <Upload className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                    {isDragActive ? 'Drop here' : 'Add'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Uploaded Files */}
        {attachments.map((attachment) => {
          const { data: { publicUrl } } = supabase.storage
            .from('flow-attachments')
            .getPublicUrl(attachment.file_url);

          return (
            <div
              key={attachment.id}
              className="relative aspect-square rounded-xl overflow-hidden group bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-200"
            >
              {/* Preview */}
              {attachment.file_type.startsWith('image/') ? (
                <img
                  src={publicUrl}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : attachment.file_type.startsWith('video/') ? (
                <video
                  src={publicUrl}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
              )}

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 bg-white/95 hover:bg-white rounded-lg transition-all duration-150 hover:scale-105 shadow-md"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => handleCopyUrl(attachment)}
                      className="p-2 bg-white/95 hover:bg-white rounded-lg transition-all duration-150 hover:scale-105 shadow-md"
                      title="Copy URL"
                    >
                      {copiedId === attachment.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-700" />
                      )}
                    </button>
                    {!disabled && (
                      <button
                        onClick={() => handleDelete(attachment)}
                        className="p-2 bg-rose-500 hover:bg-rose-600 rounded-lg transition-all duration-150 hover:scale-105 shadow-md"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* File name badge at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2">
                <p className="text-xs text-white truncate font-medium">
                  {attachment.file_name}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helper Text */}
      {attachments.length === 0 && (
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload up to {maxFiles} files • 50MB each
          </p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {attachments.length} of {maxFiles}
          </p>
        </div>
      )}
    </div>
  );
}
