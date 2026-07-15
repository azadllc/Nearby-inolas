import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  sender_id: string
  sender_name: string
  receiver_id: string
  message: string
  created_at: string
  status: 'sent' | 'delivered' | 'read'
  avatar_color?: string
}

let chatChannel: RealtimeChannel | null = null

/**
 * Initialize real-time chat subscription using Broadcast Channels
 */
export function subscribeToChatMessages(
  userId: string,
  recipientId: string,
  onNewMessage: (message: ChatMessage) => void,
  onMessageStatusChange?: (messageId: string, status: 'delivered' | 'read') => void
) {
  // Unsubscribe from previous channel if exists
  if (chatChannel) {
    supabase.removeChannel(chatChannel)
  }

  const roomId = [userId, recipientId].sort().join('_')
  
  // Subscribe to Broadcast Channel
  chatChannel = supabase
    .channel(`chat:${roomId}`)
    .on(
      'broadcast',
      { event: 'new_message' },
      (payload) => {
        const message = payload.payload as ChatMessage
        onNewMessage(message)
      }
    )
    .on(
      'broadcast',
      { event: 'status_change' },
      (payload) => {
        const { messageId, status } = payload.payload
        onMessageStatusChange?.(messageId, status)
      }
    )
    .subscribe()

  return () => {
    if (chatChannel) {
      supabase.removeChannel(chatChannel)
      chatChannel = null
    }
  }
}

/**
 * Send message and broadcast to recipient
 */
export async function sendChatMessage(
  senderUserId: string,
  senderName: string,
  recipientId: string,
  message: string,
  senderAvatarColor?: string
) {
  try {
    // Insert message in database
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderUserId,
        sender_name: senderName,
        receiver_id: recipientId,
        message: message,
        status: 'sent',
        avatar_color: senderAvatarColor,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    const roomId = [senderUserId, recipientId].sort().join('_')

    // Broadcast message to recipient in real-time
    await supabase
      .channel(`chat:${roomId}`)
      .send({
        type: 'broadcast',
        event: 'new_message',
        payload: data as ChatMessage,
      })

    return { success: true, messageId: data.id }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Load chat history
 */
export async function loadChatHistory(
  userId: string,
  recipientId: string,
  limit = 50
) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data as ChatMessage[]
  } catch (error) {
    console.error('Error loading chat history:', error)
    return []
  }
}

/**
 * Mark message as delivered
 */
export async function markMessageAsDelivered(messageId: string) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ status: 'delivered' })
      .eq('id', messageId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking message as delivered:', error)
    return false
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update({ status: 'read' })
      .eq('id', messageId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking message as read:', error)
    return false
  }
}

/**
 * Upload attachment (images, videos, documents, APK files)
 */
export async function uploadAttachment(
  userId: string,
  file: File,
  fileType: 'image' | 'video' | 'document' | 'apk'
) {
  try {
    const timestamp = Date.now()
    const fileName = `${userId}/${fileType}/${timestamp}_${file.name}`

    const { data, error } = await supabase.storage
      .from('chat_attachments')
      .upload(fileName, file)

    if (error) throw error

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('chat_attachments')
      .getPublicUrl(data.path)

    return {
      success: true,
      url: publicData.publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('Error uploading attachment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send message with attachment
 */
export async function sendMessageWithAttachment(
  senderUserId: string,
  senderName: string,
  recipientId: string,
  file: File,
  fileType: 'image' | 'video' | 'document' | 'apk',
  caption?: string,
  senderAvatarColor?: string
) {
  try {
    // Upload file first
    const uploadResult = await uploadAttachment(senderUserId, file, fileType)
    if (!uploadResult.success) throw new Error(uploadResult.error)

    // Send message with attachment URL
    const messageText = caption || `[${fileType.toUpperCase()} - ${file.name}]`
    
    return await sendChatMessage(
      senderUserId,
      senderName,
      recipientId,
      messageText,
      senderAvatarColor
    )
  } catch (error) {
    console.error('Error sending message with attachment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
