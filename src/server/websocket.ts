import { Server } from 'socket.io';
import { Client } from 'whatsapp-web.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { handleMessageStatus } from './services/messageHandler';

export const setupWebSocket = (
  io: Server,
  whatsapp: Client,
  supabase: SupabaseClient
) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join chat room
    socket.on('chat:join', (chatId: string) => {
      socket.join(chatId);
      console.log(`Client ${socket.id} joined chat ${chatId}`);
    });

    // Leave chat room
    socket.on('chat:leave', (chatId: string) => {
      socket.leave(chatId);
      console.log(`Client ${socket.id} left chat ${chatId}`);
    });

    // Handle message status updates
    socket.on('message:status', async (data: {
      messageId: string;
      status: 'sent' | 'delivered' | 'read';
    }) => {
      try {
        await handleMessageStatus(data.messageId, data.status, supabase);
        socket.to(data.messageId).emit('message:status_updated', data);
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (chatId: string) => {
      socket.to(chatId).emit('typing:start', { chatId });
    });

    socket.on('typing:stop', (chatId: string) => {
      socket.to(chatId).emit('typing:stop', { chatId });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};