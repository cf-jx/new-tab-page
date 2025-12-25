export interface WeatherData {
  temp: number
  code: number
}

export interface Coordinates {
  latitude: number
  longitude: number
}

/** 天气代码到 Emoji 图标的映射 */
export const weatherIcons: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌧️',
  53: '🌧️',
  55: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '❄️',
  73: '❄️',
  75: '❄️',
  80: '🌧️',
  81: '🌧️',
  82: '🌧️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️'
}

/**
 * 从 Open-Meteo API 获取当前天气
 * @param coords 经纬度坐标
 * @returns WeatherData 或 null（失败时）
 */
export async function fetchCurrentWeather(coords: Coordinates): Promise<WeatherData | null> {
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    console.warn('[Weather] Invalid coordinates:', coords)
    return null
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(timezone)}`
    )
    const data = await res.json()

    if (data.current) {
      return {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code
      }
    }
    return null
  } catch (e) {
    console.error('[Weather] Fetch failed:', e)
    return null
  }
}
