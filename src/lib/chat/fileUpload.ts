import { supabase } from '../supabase';
import { toast } from 'sonner';

// Maximum file sizes in bytes
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024 // 50MB
};

// Allowed file types
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  video: ['video/mp4', 'video/webm']
};

interface UploadResult {
  url: string;
  type: 'image' | 'document' | 'video';
  fileName: string;
  fileSize: number;
}

export const uploadFile = async (file: File): Promise<UploadResult> => {
  try {
    // Validate file type
    const fileType = Object.entries(ALLOWED_TYPES).find(([_, types]) => 
      types.includes(file.type)
    )?.[0] as 'image' | 'document' | 'video';

    if (!fileType) {
      throw new Error('Unsupported file type');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZES[fileType]) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZES[fileType] / (1024 * 1024)}MB limit`);
    }

    // Generate safe filename
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `chat/${fileType}s/${safeFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      type: fileType,
      fileName: file.name,
      fileSize: file.size
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

export const validateFile = (file: File): string | null => {
  // Check if file type is supported
  const isValidType = Object.values(ALLOWED_TYPES)
    .flat()
    .includes(file.type);

  if (!isValidType) {
    return 'Unsupported file type';
  }

  // Check file size
  const fileType = Object.entries(ALLOWED_TYPES).find(([_, types]) => 
    types.includes(file.type)
  )?.[0] as keyof typeof MAX_FILE_SIZES;

  if (fileType && file.size > MAX_FILE_SIZES[fileType]) {
    return `File size exceeds ${MAX_FILE_SIZES[fileType] / (1024 * 1024)}MB limit`;
  }

  return null;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};