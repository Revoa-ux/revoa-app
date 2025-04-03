import { Client, Message, GroupChat } from 'whatsapp-web.js';
import { Server } from 'socket.io';
import { SupabaseClient } from '@supabase/supabase-js';
import { handleIncomingMessage } from './messageHandler';
import { createWhatsAppGroup } from './groupHandler';

export const initializeWhatsApp = async (
  whatsapp: Client,
  io: Server,
  supabase: SupabaseClient
) => {
  whatsapp.on('qr', (qr) => {
    io.emit('whatsapp:qr', qr);
  });

  whatsapp.on('ready', () => {
    console.log('WhatsApp client is ready');
    io.emit('whatsapp:ready');
  });

  whatsapp.on('message', async (message: Message) => {
    try {
      await handleIncomingMessage(message, whatsapp, io, supabase);
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  });

  whatsapp.on('group_join', async (notification) => {
    try {
      const chat = await notification.getChat() as GroupChat;
      io.emit('whatsapp:group_join', {
        groupId: chat.id._serialized,
        name: chat.name
      });
    } catch (error) {
      console.error('Error handling group join:', error);
    }
  });

  whatsapp.on('disconnected', (reason) => {
    console.log('WhatsApp client was disconnected:', reason);
    io.emit('whatsapp:disconnected', reason);
  });

  try {
    await whatsapp.initialize();
  } catch (error) {
    console.error('Failed to initialize WhatsApp client:', error);
  }
};

export const sendWhatsAppMessage = async (
  whatsapp: Client,
  groupId: string,
  content: string,
  type: 'text' | 'image' | 'document' | 'voice' = 'text',
  mediaUrl?: string
) => {
  try {
    const chat = await whatsapp.getChatById(groupId);
    
    if (!chat) {
      throw new Error('Chat not found');
    }

    let message;
    switch (type) {
      case 'text':
        message = await chat.sendMessage(content);
        break;
      case 'image':
        if (!mediaUrl) throw new Error('Media URL is required for image messages');
        message = await chat.sendMessage(mediaUrl);
        break;
      case 'document':
        if (!mediaUrl) throw new Error('Media URL is required for document messages');
        message = await chat.sendMessage(mediaUrl);
        break;
      case 'voice':
        if (!mediaUrl) throw new Error('Media URL is required for voice messages');
        message = await chat.sendMessage(mediaUrl);
        break;
      default:
        throw new Error('Unsupported message type');
    }

    return message;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};

export const createNewWhatsAppGroup = async (
  whatsapp: Client,
  name: string,
  participants: string[]
) => {
  try {
    return await createWhatsAppGroup(whatsapp, name, participants);
  } catch (error) {
    console.error('Error creating WhatsApp group:', error);
    throw error;
  }
};