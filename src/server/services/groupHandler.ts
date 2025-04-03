import { Client, GroupChat } from 'whatsapp-web.js';
import { SupabaseClient } from '@supabase/supabase-js';

export const createWhatsAppGroup = async (
  whatsapp: Client,
  name: string,
  participants: string[]
) => {
  try {
    const group = await whatsapp.createGroup(name, participants);
    return group;
  } catch (error) {
    console.error('Error creating WhatsApp group:', error);
    throw error;
  }
};

export const addParticipantsToGroup = async (
  whatsapp: Client,
  groupId: string,
  participants: string[]
) => {
  try {
    const chat = await whatsapp.getChatById(groupId) as GroupChat;
    await chat.addParticipants(participants);
  } catch (error) {
    console.error('Error adding participants to group:', error);
    throw error;
  }
};

export const removeParticipantFromGroup = async (
  whatsapp: Client,
  groupId: string,
  participantId: string
) => {
  try {
    const chat = await whatsapp.getChatById(groupId) as GroupChat;
    await chat.removeParticipants([participantId]);
  } catch (error) {
    console.error('Error removing participant from group:', error);
    throw error;
  }
};

export const updateGroupSubject = async (
  whatsapp: Client,
  groupId: string,
  subject: string
) => {
  try {
    const chat = await whatsapp.getChatById(groupId) as GroupChat;
    await chat.setSubject(subject);
  } catch (error) {
    console.error('Error updating group subject:', error);
    throw error;
  }
};

export const leaveGroup = async (
  whatsapp: Client,
  groupId: string
) => {
  try {
    const chat = await whatsapp.getChatById(groupId) as GroupChat;
    await chat.leave();
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};