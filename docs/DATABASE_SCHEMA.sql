-- ============================================
-- SUPABASE DATABASE SCHEMA FOR NEARBY INOLAS
-- ============================================
-- Run these queries in Supabase SQL Editor
-- ============================================

-- 1. CREATE USERS TABLE (Device/User Profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  avatar_color TEXT DEFAULT '279',
  device_name TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  latitude FLOAT,
  longitude FLOAT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================

-- 2. CREATE MESSAGES TABLE (Chat Messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'apk')),
  attachment_url TEXT,
  attachment_name TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  avatar_color TEXT,
  is_encrypted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (sender_id) REFERENCES users(user_id),
  FOREIGN KEY (receiver_id) REFERENCES users(user_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- ============================================

-- 3. CREATE DEVICES TABLE (Nearby Devices)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  device_model TEXT,
  os_version TEXT,
  app_version TEXT,
  latitude FLOAT,
  longitude FLOAT,
  distance_km FLOAT,
  signal_strength INT CHECK (signal_strength >= -120 AND signal_strength <= 0),
  is_nearby BOOLEAN DEFAULT FALSE,
  last_ping_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_is_nearby ON devices(is_nearby);
CREATE INDEX IF NOT EXISTS idx_devices_last_ping_at ON devices(last_ping_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_distance_km ON devices(distance_km);

-- ============================================

-- 4. CREATE CHAT ROOMS TABLE (Conversation Groups)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT UNIQUE NOT NULL,
  participant_1_id TEXT NOT NULL,
  participant_2_id TEXT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (participant_1_id) REFERENCES users(user_id),
  FOREIGN KEY (participant_2_id) REFERENCES users(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_id ON chat_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participant_1 ON chat_rooms(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participant_2 ON chat_rooms(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

-- ============================================

-- 5. CREATE MESSAGE STATUS LOG (For tracking message status changes)
CREATE TABLE IF NOT EXISTS message_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_status_logs_message_id ON message_status_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_logs_changed_at ON message_status_logs(changed_at DESC);

-- ============================================

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT
  USING (user_id = current_user);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE
  USING (user_id = current_user);

-- Users can insert their own profile
CREATE POLICY "Users can insert their profile" ON users
  FOR INSERT
  WITH CHECK (user_id = current_user);

-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT
  USING (
    sender_id = current_user OR receiver_id = current_user
  );

-- Users can insert messages they send
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT
  WITH CHECK (sender_id = current_user);

-- Users can update message status
CREATE POLICY "Users can update message status" ON messages
  FOR UPDATE
  USING (receiver_id = current_user OR sender_id = current_user)
  WITH CHECK (true);

-- ============================================
-- DEVICES TABLE POLICIES
-- ============================================

-- Users can view their own devices
CREATE POLICY "Users can view their devices" ON devices
  FOR SELECT
  USING (user_id = current_user);

-- Users can insert their devices
CREATE POLICY "Users can insert devices" ON devices
  FOR INSERT
  WITH CHECK (user_id = current_user);

-- Users can update their devices
CREATE POLICY "Users can update their devices" ON devices
  FOR UPDATE
  USING (user_id = current_user);

-- ============================================
-- CHAT ROOMS TABLE POLICIES
-- ============================================

-- Users can view chat rooms they're part of
CREATE POLICY "Users can view their chat rooms" ON chat_rooms
  FOR SELECT
  USING (
    participant_1_id = current_user OR participant_2_id = current_user
  );

-- Users can insert chat rooms
CREATE POLICY "Users can insert chat rooms" ON chat_rooms
  FOR INSERT
  WITH CHECK (
    participant_1_id = current_user OR participant_2_id = current_user
  );

-- Users can update chat rooms they're part of
CREATE POLICY "Users can update their chat rooms" ON chat_rooms
  FOR UPDATE
  USING (
    participant_1_id = current_user OR participant_2_id = current_user
  );

-- ============================================
-- MESSAGE STATUS LOGS TABLE POLICIES
-- ============================================

-- Users can view logs for their messages
CREATE POLICY "Users can view message status logs" ON message_status_logs
  FOR SELECT
  USING (true);

-- ============================================
-- ENABLE REALTIME (Broadcast Channels)
-- ============================================

-- Enable realtime for messages table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Enable realtime for users table (for online status)
ALTER TABLE users REPLICA IDENTITY FULL;

-- Enable realtime for devices table (for nearby updates)
ALTER TABLE devices REPLICA IDENTITY FULL;

-- ============================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- ============================================

-- Create storage bucket for chat attachments
-- Note: This should be done via Supabase Dashboard
-- OR via SQL with the following (if not already created):

-- INSERT INTO storage.buckets (id, name, owner, public)
-- VALUES ('chat_attachments', 'chat_attachments', auth.uid(), true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FUNCTIONS FOR AUTOMATION
-- ============================================

-- Function to update message status and log changes
CREATE OR REPLACE FUNCTION update_message_status(
  message_id UUID,
  new_status TEXT,
  changed_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Log the status change
  INSERT INTO message_status_logs (message_id, new_status, changed_by)
  VALUES (message_id, new_status, COALESCE(changed_by, current_user));
  
  -- Update message status
  UPDATE messages
  SET status = new_status, updated_at = NOW()
  WHERE id = message_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user online status
CREATE OR REPLACE FUNCTION update_user_online_status(
  user_id_param TEXT,
  is_online BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET is_online = is_online, last_seen_at = NOW(), updated_at = NOW()
  WHERE user_id = user_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old devices (ping older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_devices()
RETURNS TABLE (deleted_count INTEGER) AS $$
DECLARE
  count INTEGER;
BEGIN
  DELETE FROM devices
  WHERE last_ping_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Trigger to update chat_rooms last_message when message is inserted
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET last_message = NEW.message,
      last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE room_id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_room_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_room_last_message();

-- Trigger to update user's updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_updated_at();

-- Trigger to update message's updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_updated_at();

-- Trigger to update device's updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_device_updated_at();

-- ============================================
-- SAMPLE DATA (OPTIONAL - Remove for production)
-- ============================================

-- Insert sample users
INSERT INTO users (user_id, username, email, avatar_color, device_name, device_type, latitude, longitude, is_online)
VALUES 
  ('user-001', 'Aarav Mehta', 'aarav@example.com', '279', 'iPhone 14', 'mobile', 28.6139, 77.2090, TRUE),
  ('user-002', 'Priya Singh', 'priya@example.com', '320', 'Samsung S23', 'mobile', 28.6140, 77.2091, TRUE),
  ('user-003', 'Rohan Patel', 'rohan@example.com', '200', 'iPad Pro', 'tablet', 28.6141, 77.2092, FALSE)
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample chat room
INSERT INTO chat_rooms (room_id, participant_1_id, participant_2_id, is_active)
VALUES ('user-001_user-002', 'user-001', 'user-002', TRUE)
ON CONFLICT (room_id) DO NOTHING;

-- Insert sample messages
INSERT INTO messages (room_id, sender_id, sender_name, receiver_id, message, status, avatar_color)
VALUES 
  ('user-001_user-002', 'user-001', 'Aarav Mehta', 'user-002', 'Hey! How are you?', 'read', '279'),
  ('user-001_user-002', 'user-002', 'Priya Singh', 'user-001', 'I am doing great! 😊', 'read', '320'),
  ('user-001_user-002', 'user-001', 'Aarav Mehta', 'user-002', 'Want to chat offline?', 'delivered', '279')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (Run these to check)
-- ============================================

-- Check users
-- SELECT * FROM users;

-- Check messages
-- SELECT * FROM messages;

-- Check devices
-- SELECT * FROM devices;

-- Check chat rooms
-- SELECT * FROM chat_rooms;

-- ============================================
-- IMPORTANT: After running this SQL:
-- 1. Go to Supabase Dashboard → Realtime
-- 2. Enable "Broadcast" for the tables
-- 3. Go to Storage → Create "chat_attachments" bucket
-- 4. Make the bucket PUBLIC
-- ============================================
