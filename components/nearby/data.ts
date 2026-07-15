'use client'

import { supabase } from '@/lib/supabase'

export interface Device {
  id: string
  name: string
  user_id: string
  device_type: string
  is_online: boolean
  avatar_color?: string
  last_seen?: string
  created_at?: string
}

export interface Contact {
  id: string
  user_id: string
  contact_user_id: string
  contact_name: string
  contact_avatar_color?: string
  last_message_at?: string
  last_message?: string
  unread_count?: number
}

/**
 * Fetch all nearby devices from Supabase
 */
export async function fetchNearbyDevices(): Promise<Device[]> {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('is_online', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Device[]
  } catch (error) {
    console.error('Error fetching nearby devices:', error)
    return []
  }
}

/**
 * Fetch specific device by ID
 */
export async function fetchDeviceById(deviceId: string): Promise<Device | null> {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (error) throw error
    return data as Device
  } catch (error) {
    console.error('Error fetching device:', error)
    return null
  }
}

/**
 * Fetch all contacts for current user
 */
export async function fetchContacts(userId: string): Promise<Contact[]> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return data as Contact[]
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return []
  }
}

/**
 * Subscribe to real-time device updates
 */
export function subscribeToDevices(
  onDeviceChange: (device: Device) => void
) {
  const subscription = supabase
    .channel('devices:all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devices',
      },
      (payload) => {
        const device = payload.new as Device
        onDeviceChange(device)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

/**
 * Subscribe to real-time contact updates
 */
export function subscribeToContacts(
  userId: string,
  onContactChange: (contact: Contact) => void
) {
  const subscription = supabase
    .channel(`contacts:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contacts',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const contact = payload.new as Contact
        onContactChange(contact)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

/**
 * Create or update a device
 */
export async function upsertDevice(device: Omit<Device, 'id' | 'created_at'> & { id?: string }) {
  try {
    const { data, error } = await supabase
      .from('devices')
      .upsert(device)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as Device }
  } catch (error) {
    console.error('Error upserting device:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Add a new contact
 */
export async function addContact(contact: Omit<Contact, 'id'>) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: data as Contact }
  } catch (error) {
    console.error('Error adding contact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update device online status
 */
export async function updateDeviceStatus(deviceId: string, isOnline: boolean) {
  try {
    const { error } = await supabase
      .from('devices')
      .update({ is_online: isOnline })
      .eq('id', deviceId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error updating device status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
