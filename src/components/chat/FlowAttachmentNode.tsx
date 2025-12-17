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

  const getPreviewUrl = (attachment: FlowAttachment) => {
    const { data: { publicUrl } } = supabase.storage
      .from('flow-attachments')
      .getPublicUrl(attachment.file_url);
    return publicUrl;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {attachments.length} / {maxFiles}
          </span>
          {minFiles > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              meetsMinimum
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            }`}>
              {meetsMinimum ? `${minFiles}+ required ✓` : `${minFiles} minimum`}
            </span>
          )}
        </div>
      </div>

      {/* Grid with Upload Button and Attachments */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {/* Upload Button */}
        {attachments.length < maxFiles && (
          <div
            {...getRootProps()}
            className={`
              relative aspect-square rounded-xl border-2 border-dashed cursor-pointer
              transition-all duration-200 overflow-hidden
              ${isDragActive
                ? 'border-gray-400 bg-gray-50 dark:bg-gray-800 scale-105'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
              ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {isDragActive ? 'Drop here' : 'Add files'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Uploaded Files */}
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            {/* Preview */}
            {attachment.file_type.startsWith('image/') ? (
              <img
                src={getPreviewUrl(attachment)}
                alt={attachment.file_name}
                className="w-full h-full object-cover"
              />
            ) : attachment.file_type.startsWith('video/') ? (
              <video
                src={getPreviewUrl(attachment)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-2">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => handleCopyUrl(attachment)}
                  className="p-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy URL"
                >
                  {copiedId === attachment.id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  )}
                </button>
                {!disabled && (
                  <button
                    onClick={() => handleDelete(attachment)}
                    className="p-2 bg-red-500/90 hover:bg-red-600 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* File Info Badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-xs text-white truncate">{attachment.file_name}</p>
              <p className="text-xs text-gray-300">{formatFileSize(attachment.file_size)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Helper Text */}
      {attachments.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Images and videos up to 50MB
        </p>
      )}
    </div>
  );
}
