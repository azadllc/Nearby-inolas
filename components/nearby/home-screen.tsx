'use client'

import { useEffect, useState } from 'react'
import { Loader, Wifi } from 'lucide-react'
import { DeviceCard } from './device-card'
import { DiscoverButton } from './discover-button'
import { EmptyState } from './empty-state'
import { ConnectionSheet } from './connection-sheet'
import { fetchNearbyDevices, subscribeToDevices, type Device } from './data'

interface HomeScreenProps {
  currentUserId: string
  currentUserName: string
  currentUserAvatarColor?: string
  onDeviceSelect: (device: Device) => void
  onOpenConnection?: (device: Device) => void
}

export function HomeScreen({
  currentUserId,
  currentUserName,
  currentUserAvatarColor = '279',
  onDeviceSelect,
  onOpenConnection,
}: HomeScreenProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showConnectionSheet, setShowConnectionSheet] = useState(false)

  // Load initial nearby devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const fetchedDevices = await fetchNearbyDevices()
        setDevices(fetchedDevices)
      } catch (err) {
        console.error('Error loading devices:', err)
        setError('Failed to load nearby devices')
      } finally {
        setIsLoading(false)
      }
    }

    loadDevices()
  }, [])

  // Subscribe to real-time device updates
  useEffect(() => {
    const unsubscribe = subscribeToDevices((updatedDevice) => {
      setDevices((prev) => {
        const index = prev.findIndex((d) => d.id === updatedDevice.id)
        if (index > -1) {
          // Update existing device
          const newDevices = [...prev]
          newDevices[index] = updatedDevice
          return newDevices
        } else {
          // Add new device if it's online
          if (updatedDevice.is_online) {
            return [updatedDevice, ...prev]
          }
          return prev
        }
      })
    })

    return () => unsubscribe()
  }, [])

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device)
    setShowConnectionSheet(true)
    onDeviceSelect(device)
  }

  const handleConnect = () => {
    if (selectedDevice && onOpenConnection) {
      onOpenConnection(selectedDevice)
    }
    setShowConnectionSheet(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wifi className="size-5 text-success" />
          <h1 className="text-2xl font-bold text-foreground">Nearby Devices</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {devices.length === 0 && !isLoading
            ? 'No devices nearby'
            : `${devices.length} device${devices.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card/50 py-12">
          <Loader className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Scanning for nearby devices...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-red-50 dark:bg-red-950/20 py-12">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => {
              setIsLoading(true)
              fetchNearbyDevices().then((data) => {
                setDevices(data)
                setIsLoading(false)
              })
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : devices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onSelect={() => handleDeviceSelect(device)}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <DiscoverButton
          onClick={() => {
            setIsLoading(true)
            fetchNearbyDevices().then((data) => {
              setDevices(data)
              setIsLoading(false)
            })
          }}
          disabled={isLoading}
        />
        <button
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 active:scale-95 disabled:opacity-50"
          disabled={isLoading}
        >
          Settings
        </button>
      </div>

      {/* Connection Sheet */}
      {selectedDevice && (
        <ConnectionSheet
          isOpen={showConnectionSheet}
          device={selectedDevice}
          onOpenChange={setShowConnectionSheet}
          onConnect={handleConnect}
          currentUserName={currentUserName}
          currentUserAvatarColor={currentUserAvatarColor}
        />
      )}
    </div>
  )
}
