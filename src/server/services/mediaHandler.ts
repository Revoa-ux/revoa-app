import { Message } from 'whatsapp-web.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '../db/client';

const supabase = createSupabaseClient();

export const processMedia = async (message: Message) => {
  try {
    if (!message.hasMedia) {
      throw new Error('Message does not contain media');
    }

    const media = await message.downloadMedia();
    
    if (!media) {
      throw new Error('Failed to download media');
    }

    const fileName = message.id._serialized;
    const fileExtension = getFileExtension(media.mimetype);
    const fullFileName = `${fileName}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(`whatsapp/${fullFileName}`, Buffer.from(media.data, 'base64'), {
        contentType: media.mimetype,
        cacheControl: '3600'
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(`whatsapp/${fullFileName}`);

    return {
      url: publicUrl,
      type: getMediaType(media.mimetype),
      fileName: fullFileName,
      fileSize: Buffer.from(media.data, 'base64').length,
      mimetype: media.mimetype
    };
  } catch (error) {
    console.error('Error processing media:', error);
    throw error;
  }
};

const getFileExtension = (mimetype: string): string => {
  const types: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  };

  return types[mimetype] || 'bin';
};

const getMediaType = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'voice';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
};