'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Check,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  Package,
  Paperclip,
  Send,
  Smile,
  Video,
  WifiOff,
  Loader,
} from 'lucide-react'
import { ProfileAvatar } from './profile-avatar'
import { cn } from '@/lib/utils'
import {
  sendChatMessage,
  subscribeToChatMessages,
  loadChatHistory,
  markMessageAsDelivered,
  sendMessageWithAttachment,
  type ChatMessage,
} from '@/lib/chat-service'

const quickShare = [
  { label: 'Photos', icon: ImageIcon, accent: '279', type: 'image' as const },
  { label: 'Videos', icon: Video, accent: '320', type: 'video' as const },
  { label: 'Documents', icon: FileText, accent: '200', type: 'document' as const },
  { label: 'APK Files', icon: Package, accent: '150', type: 'apk' as const },
] as const

function MessageStatus({ status }: { status?: ChatMessage['status'] }) {
  if (!status) return null
  if (status === 'read') return <CheckCheck className="size-3.5 text-accent-foreground" />
  if (status === 'delivered') return <CheckCheck className="size-3.5 opacity-70" />
  return <Check className="size-3.5 opacity-70" />
}

function Bubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={cn('flex animate-inolas-rise', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed',
          isOwn
            ? 'rounded-br-lg bg-primary text-primary-foreground'
            : 'rounded-bl-lg bg-card text-card-foreground border border-border',
        )}
      >
        <p className="text-pretty">{message.message}</p>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isOwn && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  )
}

interface ChatScreenProps {
  currentUserId: string
  currentUserName: string
  currentUserAvatarColor?: string
  recipientId: string
  recipientName: string
  recipientAvatarColor?: string
  onlineStatus?: 'online' | 'offline'
}

export function ChatScreen({
  currentUserId,
  currentUserName,
  currentUserAvatarColor = '279',
  recipientId,
  recipientName,
  recipientAvatarColor = '279',
  onlineStatus = 'offline',
}: ChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load chat history
  useEffect(() => {
    setIsLoading(true)
    loadChatHistory(currentUserId, recipientId, 100).then((history) => {
      setMessages(history)
      setIsLoading(false)
      scrollToBottom()
    })
  }, [currentUserId, recipientId, scrollToBottom])

  // Subscribe to real-time messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(
      currentUserId,
      recipientId,
      (newMessage) => {
        setMessages((prev) => [...prev, newMessage])
        // Mark as delivered if it's not our message
        if (newMessage.receiver_id === currentUserId) {
          markMessageAsDelivered(newMessage.id)
        }
        scrollToBottom()
      }
    )

    return () => unsubscribe()
  }, [currentUserId, recipientId, scrollToBottom])

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return

    setIsSending(true)
    const result = await sendChatMessage(
      currentUserId,
      currentUserName,
      recipientId,
      inputValue.trim(),
      currentUserAvatarColor
    )

    if (result.success) {
      setInputValue('')
    } else {
      alert('Error sending message: ' + result.error)
    }
    setIsSending(false)
  }, [inputValue, currentUserId, currentUserName, recipientId, currentUserAvatarColor])

  // Handle file attachment
  const handleAttachmentClick = (fileType: 'image' | 'video' | 'document' | 'apk') => {
    const input = document.createElement('input')
    input.type = 'file'
    
    // Set accept types based on file type
    const acceptTypes: Record<string, string> = {
      image: 'image/*',
      video: 'video/*',
      document: '.pdf,.doc,.docx,.txt,.xlsx,.xls',
      apk: '.apk',
    }
    
    input.accept = acceptTypes[fileType]
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsSending(true)
      const result = await sendMessageWithAttachment(
        currentUserId,
        currentUserName,
        recipientId,
        file,
        fileType,
        undefined,
        currentUserAvatarColor
      )

      if (!result.success) {
        alert('Error uploading file: ' + result.error)
      }
      setIsSending(false)
    }
    input.click()
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isSending) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="space-y-5">
      {/* Chat header */}
      <div className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3">
        <ProfileAvatar name={recipientName} accent={recipientAvatarColor} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{recipientName}</p>
          <p className="flex items-center gap-1 text-xs text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Connected · {onlineStatus === 'online' ? 'Online' : 'Offline channel'}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <WifiOff className="size-3.5" />
          {onlineStatus === 'online' ? 'Connected' : 'No internet'}
        </span>
      </div>

      {/* Messages */}
      <div className="max-h-96 overflow-y-auto space-y-2.5 rounded-3xl border border-border bg-secondary/40 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="mx-auto w-fit text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          <>
            <p className="mx-auto w-fit rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
              Encrypted peer-to-peer · Today
            </p>
            {messages.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                isOwn={m.sender_id === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick share grid */}
      <section>
        <h2 className="mb-3 px-1 text-sm font-bold tracking-tight text-foreground">
          Quick Share
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {quickShare.map(({ label, icon: Icon, accent, type }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleAttachmentClick(type)}
              disabled={isSending}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 transition-all hover:border-primary/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                className="flex size-10 items-center justify-center rounded-xl text-white"
                style={{
                  background: `linear-gradient(135deg, oklch(0.62 0.2 ${accent}), oklch(0.5 0.24 ${Number(accent) + 30}))`,
                }}
              >
                {isSending ? (
                  <Loader className="size-5 animate-spin" />
                ) : (
                  <Icon className="size-5" />
                )}
              </span>
              <span className="text-[11px] font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Composer */}
      <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5">
        <button
          type="button"
          aria-label="Attach file"
          disabled={isSending}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Paperclip className="size-5" />
        </button>
        <input
          ref={fileInputRef}
          type="text"
          placeholder="Send an offline message…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="button"
          aria-label="Emoji"
          disabled={isSending}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Smile className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Send message"
          onClick={handleSendMessage}
          disabled={isSending || !inputValue.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>
    </div>
  )
}
