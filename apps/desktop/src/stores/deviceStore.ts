import { create } from 'zustand';
import type { DeviceInfo, CapabilityProfile } from '@/types';

interface DeviceState {
  devices: DeviceInfo[];
  selectedSerial: string | null;
  capabilities: CapabilityProfile | null;
  isConnecting: boolean;
  connectionError: string | null;

  setDevices: (devices: DeviceInfo[]) => void;
  selectDevice: (serial: string | null) => void;
  setCapabilities: (profile: CapabilityProfile) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  addOrUpdateDevice: (device: DeviceInfo) => void;
  removeDevice: (serial: string) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  selectedSerial: null,
  capabilities: null,
  isConnecting: false,
  connectionError: null,

  setDevices: (devices) => set({ devices }),

  selectDevice: (serial) =>
    set({ selectedSerial: serial, capabilities: null, connectionError: null }),

  setCapabilities: (profile) => set({ capabilities: profile }),

  setConnecting: (connecting) => set({ isConnecting: connecting }),

  setConnectionError: (error) => set({ connectionError: error }),

  addOrUpdateDevice: (device) =>
    set((state) => {
      const existing = state.devices.findIndex((d) => d.serial === device.serial);
      if (existing >= 0) {
        const updated = [...state.devices];
        updated[existing] = device;
        return { devices: updated };
      }
      return { devices: [...state.devices, device] };
    }),

  removeDevice: (serial) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.serial !== serial),
      selectedSerial:
        state.selectedSerial === serial ? null : state.selectedSerial,
    })),
}));

export const selectedDeviceSelector = (state: DeviceState): DeviceInfo | null =>
  state.devices.find((d) => d.serial === state.selectedSerial) ?? null;
