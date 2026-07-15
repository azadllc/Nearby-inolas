# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details and create
4. Copy your **Project URL** and **Anon Key** from settings

## 2. Set Environment Variables

Create `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Create Database Tables

### Chat Messages Table

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  avatar_color TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

## 4. Enable Realtime

1. Go to **Supabase Dashboard** → **Realtime** → **Replication**
2. Enable replication for `chat_messages` table
3. Go to **Realtime** → **Products** → Enable `Broadcast`

## 5. Enable Storage (For File Uploads)

1. Go to **Storage** → **New Bucket**
2. Create bucket named: `chat_attachments`
3. Set visibility to **Public**

### Storage Policy

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow users to upload files" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat_attachments');

-- Allow public read access
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat_attachments');
```

## 6. Row Level Security (RLS) - Optional

Enable RLS for production:

```sql
-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own messages
CREATE POLICY "Users can see their messages" ON chat_messages
  FOR SELECT
  USING (
    sender_id = auth.uid()::text OR receiver_id = auth.uid()::text
  );

-- Allow users to insert their own messages
CREATE POLICY "Users can insert their messages" ON chat_messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid()::text);
```

## 7. Install Dependencies

```bash
npm install @supabase/supabase-js
```

## 8. Usage in Your App

```tsx
import { ChatScreen } from '@/components/chat-screen'

export default function ChatPage() {
  return (
    <ChatScreen
      currentUserId="user-123"
      currentUserName="Your Name"
      currentUserAvatarColor="279"
      recipientId="user-456"
      recipientName="Chat Partner"
      recipientAvatarColor="320"
      onlineStatus="offline"
    />
  )
}
```

## Features Implemented

✅ **Real-time Message Sync** - Using Supabase Broadcast Channels  
✅ **Message Status Tracking** - Sent, Delivered, Read  
✅ **File Uploads** - Images, Videos, Documents, APK files  
✅ **Chat History** - Load previous messages on mount  
✅ **Offline Support** - Messages persist locally until sent  
✅ **Auto-scroll** - New messages auto-scroll to view  

## Troubleshooting

### Messages not appearing in real-time?
- Check if Realtime is enabled for `chat_messages` table
- Verify Broadcast channel is enabled
- Check browser console for errors

### File uploads failing?
- Ensure `chat_attachments` bucket is created and public
- Check storage policies are correct
- Verify file size is within limits (50MB default)

### Database queries slow?
- Check indexes are created
- Monitor database performance in Supabase dashboard
- Consider pagination for large chat histories

## Security Notes

- Never expose `NEXT_PUBLIC_SUPABASE_ANON_KEY` in production without proper RLS
- Always implement Row Level Security for user data protection
- Validate file types and sizes on both client and server
- Implement rate limiting on message sending
