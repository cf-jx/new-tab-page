import type { SettingsInterfaceVer8, SettingsInterfaceVer9 } from '../types'

export function migrateFromVer8To9(oldSettings: SettingsInterfaceVer8): SettingsInterfaceVer9 {
  return {
    ...oldSettings,
    time: {
      ...oldSettings.time,
      weather: {
        enabled: true,
        useManualLocation: false,
        manualLatitude: 0,
        manualLongitude: 0,
        cityName: ''
      }
    },
    version: 9
  }
}
