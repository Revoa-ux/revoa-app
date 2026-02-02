import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Video, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface FlowAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

interface AttachmentPreviewProps {
  attachment: FlowAttachment;
  onDelete: (attachment: FlowAttachment) => void;
  disabled: boolean;
}

function AttachmentPreview({ attachment, onDelete, disabled }: AttachmentPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const getSignedUrl = async () => {
      const { data, error } = await supabase.storage
        .from('flow-attachments')
        .createSignedUrl(attachment.file_url, 3600);

      if (data) {
        setImageUrl(data.signedUrl);
      } else {
        console.error('Failed to get signed URL:', error);
      }
    };

    getSignedUrl();
  }, [attachment.file_url]);

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden group bg-gray-50 dark:bg-dark border border-gray-100 dark:border-[#3a3a3a] hover:border-gray-200 dark:hover:border-[#4a4a4a] hover:shadow-lg transition-all duration-200">
      {/* Preview */}
      {attachment.file_type.startsWith('image/') && (
        <>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={attachment.file_name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                console.error('Image failed to load:', imageUrl, attachment);
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}
          <div className="w-full h-full flex flex-col items-center justify-center p-2 hidden">
            <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-1" />
            <span className="text-xs text-gray-400 dark:text-gray-500 text-center truncate w-full px-2">
              {attachment.file_name}
            </span>
          </div>
        </>
      )}
      {attachment.file_type.startsWith('video/') && imageUrl && (
        <video
          src={imageUrl}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      )}
      {!attachment.file_type.startsWith('image/') && !attachment.file_type.startsWith('video/') && (
        <div className="w-full h-full flex items-center justify-center">
          <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
        </div>
      )}

      {/* Overlay on Hover - Lighter overlay with only delete button */}
      {!disabled && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => onDelete(attachment)}
              className="p-2.5 bg-white/95 hover:bg-white rounded-lg transition-all duration-150 hover:scale-105 shadow-lg"
              title="Remove"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
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


  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Grid with Upload Button and Attachments */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 min-h-[120px]">
        {/* Upload Button */}
        {attachments.length < maxFiles && (
          <div
            {...getRootProps()}
            className={`
              relative aspect-square rounded-xl cursor-pointer
              transition-all duration-200 overflow-hidden
              bg-gray-50 dark:bg-dark
              border-2 border-dashed border-gray-200 dark:border-[#3a3a3a]
              hover:border-gray-300 dark:hover:border-[#4a4a4a] hover:bg-gray-100 dark:hover:bg-[#3a3a3a]/50
              ${isDragActive ? 'scale-105 border-gray-400 dark:border-gray-500' : ''}
              ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin mb-1.5" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Uploading...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3a3a3a] flex items-center justify-center mb-2">
                    <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                    {isDragActive ? 'Drop here' : 'Add'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Uploaded Files */}
        {attachments.map((attachment) => (
          <AttachmentPreview
            key={attachment.id}
            attachment={attachment}
            onDelete={handleDelete}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Helper Text - positioned closer to upload area */}
      <p className="text-xs text-gray-500 dark:text-gray-500 -mt-1">
        Up to {maxFiles} files • 50MB each
      </p>
    </div>
  );
}
