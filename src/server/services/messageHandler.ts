import { Message, Client } from 'whatsapp-web.js';
import { Server } from 'socket.io';
import { SupabaseClient } from '@supabase/supabase-js';
import { processMedia } from './mediaHandler';

export const handleIncomingMessage = async (
  message: Message,
  whatsapp: Client,
  io: Server,
  supabase: SupabaseClient
) => {
  try {
    const chat = await message.getChat();
    const { data: existingGroup, error: groupError } = await supabase
      .from('whatsapp_groups')
      .select('chat_id')
      .eq('whatsapp_group_id', chat.id._serialized)
      .single();

    if (groupError || !existingGroup) {
      console.error('Group not found in database:', chat.id._serialized);
      return;
    }

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;

    if (message.hasMedia) {
      const mediaData = await processMedia(message);
      mediaUrl = mediaData.url;
      mediaType = mediaData.type;
      fileName = mediaData.fileName;
      fileSize = mediaData.fileSize;
    }

    // Store message in database
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: existingGroup.chat_id,
        content: message.body,
        type: mediaType || 'text',
        platform: 'whatsapp',
        status: 'delivered',
        metadata: {
          whatsapp_message_id: message.id._serialized,
          sender: message.from,
          timestamp: message.timestamp
        }
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Store media file information if present
    if (mediaUrl) {
      const { error: mediaError } = await supabase
        .from('media_files')
        .insert({
          message_id: newMessage.id,
          file_type: mediaType,
          file_url: mediaUrl,
          file_name: fileName,
          file_size: fileSize,
          metadata: {
            whatsapp_media_id: message.id._serialized
          }
        });

      if (mediaError) {
        console.error('Error storing media file:', mediaError);
      }
    }

    // Emit message to connected clients
    io.to(existingGroup.chat_id).emit('message:new', {
      ...newMessage,
      media: mediaUrl ? {
        url: mediaUrl,
        type: mediaType,
        fileName,
        fileSize
      } : undefined
    });

    // Update message status
    message.react('✅');

  } catch (error) {
    console.error('Error handling incoming message:', error);
    throw error;
  }
};

export const handleMessageStatus = async (
  messageId: string,
  status: 'sent' | 'delivered' | 'read',
  supabase: SupabaseClient
) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ status })
      .eq('metadata->whatsapp_message_id', messageId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
};