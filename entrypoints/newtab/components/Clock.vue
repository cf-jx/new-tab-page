<script lang="ts" setup>
import { useNow, useTimeoutFn } from '@vueuse/core'

import dayjs from 'dayjs/esm'
import { useTranslation } from 'i18next-vue'

import { isChinese } from '@/shared/lang'
import { useSettingsStore } from '@/shared/settings'

import { useGeolocation, useIntervalFn } from '@vueuse/core'

const { t, i18next } = useTranslation('newtab')
const settings = useSettingsStore()
const time = ref()

const currentLang = ref(i18next.language)

i18next.on('languageChanged', (lng) => {
  useTimeoutFn(() => {
    currentLang.value = lng
  }, 100)
})

function customMeridiem(hours: number) {
  if (hours < 2) return t('time.lateNight')
  if (hours < 7) return t('time.dawn')
  if (hours < 11) return t('time.morning')
  if (hours < 14) return t('time.noon')
  if (hours < 17) return t('time.afternoon')
  if (hours < 19) return t('time.dusk')
  if (hours < 23) return t('time.evening')
  return t('time.lateNight')
}

const timeNow = useNow({ interval: 1000 })
const dateNow = useNow({ interval: 60 * 1000 })

const formattedTime = computed(() => {
  void currentLang.value // 作为响应式依赖，确保语言切换时重新计算
  const now = dayjs(timeNow.value)
  return {
    hour: now.format('HH'),
    hourMeridiem: now.format('h'),
    minute: now.format('mm'),
    meridiem: now.format('A'),
    lunar: now.format('LhLK')
  }
})

// --- Weather Logic ---
const { coords } = useGeolocation({
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
})
const weather = ref<{ temp: number; code: number } | null>(null)
const weatherLoading = ref(false)
const weatherRetryCount = ref(0)
const maxRetries = 3

const weatherIcons: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌧️', 53: '🌧️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌧️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
}

// 获取有效的经纬度（优先使用手动设置）
function getEffectiveCoords(): { latitude: number; longitude: number } | null {
  const weatherSettings = settings.time.weather
  
  // 如果使用手动位置且已设置有效坐标
  if (weatherSettings.useManualLocation) {
    if (weatherSettings.manualLatitude && weatherSettings.manualLongitude) {
      return {
        latitude: weatherSettings.manualLatitude,
        longitude: weatherSettings.manualLongitude
      }
    }
    // 手动模式但未设置坐标，返回 null
    return null
  }
  
  // 使用自动定位
  if (coords.value.latitude && coords.value.longitude) {
    return {
      latitude: coords.value.latitude,
      longitude: coords.value.longitude
    }
  }
  
  return null
}

async function fetchWeather() {
  // 检查天气是否启用
  if (!settings.time.weather.enabled) {
    weather.value = null
    return
  }
  
  const effectiveCoords = getEffectiveCoords()
  
  if (!effectiveCoords) {
    // 如果没有地理位置，尝试重试
    if (weatherRetryCount.value < maxRetries) {
      weatherRetryCount.value++
      setTimeout(fetchWeather, 5000)
    }
    return
  }
  
  weatherLoading.value = true
  weatherRetryCount.value = 0
  
  // 检查坐标有效性
  if (
    !Number.isFinite(effectiveCoords.latitude) || 
    !Number.isFinite(effectiveCoords.longitude)
  ) {
    console.warn('[Weather Debug] Invalid coordinates:', effectiveCoords)
    weatherLoading.value = false
    return
  }

  try {
    const isManual = settings.time.weather.useManualLocation
    console.log('[Weather Debug] Fetching weather for:', {
      lat: effectiveCoords.latitude,
      lon: effectiveCoords.longitude,
      source: isManual ? 'manual' : 'auto',
      city: isManual ? settings.time.weather.cityName : 'N/A'
    })

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${effectiveCoords.latitude}&longitude=${effectiveCoords.longitude}&current=temperature_2m,weather_code&timezone=${encodeURIComponent(timezone)}`
    )
    const data = await res.json()
    if (data.current) {
      weather.value = {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code
      }
    }
  } catch (e) {
    console.error('Weather fetch failed', e)
    if (weatherRetryCount.value < maxRetries) {
      weatherRetryCount.value++
      setTimeout(fetchWeather, 10000)
    }
  } finally {
    weatherLoading.value = false
  }
}

// 监听地理位置变化（仅在非手动模式下）
watch(() => coords.value, (newCoords) => {
  if (settings.time.weather.enabled && !settings.time.weather.useManualLocation && newCoords.latitude && newCoords.longitude) {
    weatherRetryCount.value = 0 // 重置重试计数
    fetchWeather()
  }
}, { immediate: true })

// 监听手动位置设置变化
watch(
  () => [
    settings.time.weather.enabled,
    settings.time.weather.useManualLocation,
    settings.time.weather.manualLatitude,
    settings.time.weather.manualLongitude
  ],
  () => {
    weatherRetryCount.value = 0 // 重置重试计数
    fetchWeather()
  }
)

// 定时刷新天气
useIntervalFn(fetchWeather, 10 * 60 * 1000)

// 组件挂载时立即获取天气
onMounted(() => {
  weatherRetryCount.value = 0
  fetchWeather()
})

// --- Pomodoro Logic ---
const isPomodoroMode = ref(false)
const isTimerRunning = ref(false)
const timerDuration = 25 * 60
const timeLeft = ref(timerDuration)

const { pause, resume } = useIntervalFn(() => {
  if (timeLeft.value > 0) {
    timeLeft.value--
  } else {
    // Timer finished
    pause()
    isTimerRunning.value = false
    // Play sound or notification here if needed
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    audio.play().catch(() => {})
  }
}, 1000, { immediate: false })

const formattedTimer = computed(() => {
  const m = Math.floor(timeLeft.value / 60).toString().padStart(2, '0')
  const s = (timeLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

function togglePomodoroMode() {
  if (!isPomodoroMode.value) {
    isPomodoroMode.value = true
    // Don't auto-start, let user click to start
  } else {
    // Only exit if timer is not running? Or double click to exit?
    // Implementation: Click time to enter. Double click timer to exit.
  }
}

function handleTimerClick() {
  if (isTimerRunning.value) {
    pause()
    isTimerRunning.value = false
  } else {
    resume()
    isTimerRunning.value = true
  }
}

function handleTimerDblClick() {
  pause()
  isTimerRunning.value = false
  isPomodoroMode.value = false
  timeLeft.value = timerDuration // Reset
}

const formattedDate = computed(() => {
  void currentLang.value // 作为响应式依赖，确保语言切换时重新计算
  const now = dayjs(dateNow.value)
  
  // 使用原生Date对象避免dayjs农历插件的问题
  const nativeDate = dateNow.value instanceof Date ? dateNow.value : new Date()
  const year = nativeDate.getFullYear()
  const month = nativeDate.getMonth() + 1  // JavaScript月份从0开始
  const day = nativeDate.getDate()
  
  // 调试日志
  console.log('[Clock Debug] Date:', {
    raw: dateNow.value,
    nativeDate,
    year,
    month,
    day,
    formatted: `${year}年${month}月${day}日`
  })
  
  const dateStr = isChinese ? `${year}年${month}月${day}日` : now.format('LL')
  
  return {
    meridiemZH: customMeridiem(now.hour()),
    weekday: now.format('dddd'),
    date: dateStr,
    lunar: now.format('LMLD')
  }
})
</script>

<template>
  <div
    ref="time"
    class="clock noselect"
    :class="[
      settings.time.enableShadow ? 'clock--shadow' : undefined,
      settings.time.invertColor.light ? ['clock--invert', 'clock--light'] : undefined,
      settings.time.invertColor.night ? ['clock--invert', 'clock--night'] : undefined
    ]"
  >
    <div
      class="clock__time-container"
      :class="[settings.time.small ? 'clock__time-container-small' : undefined]"
    >
      <!-- Pomodoro Mode -->
      <div 
        v-if="isPomodoroMode" 
        class="clock__time clock__pomodoro"
        @click="handleTimerClick"
        @dblclick.stop="handleTimerDblClick"
        title="单击开始/暂停，双击退出"
      >
        <span>{{ formattedTimer }}</span>
        <span v-if="!isTimerRunning" class="pomodoro-hint">⏸</span>
      </div>

      <!-- Normal Clock Mode -->
      <div v-else class="clock__time-wrapper" @click="togglePomodoroMode" title="点击进入专注模式">
        <span v-if="settings.time.showMeridiem && isChinese" class="clock__meridiem">
          {{ formattedDate.meridiemZH }}
        </span>
        <span class="clock__time">
          <span class="clock__hour">
            {{ settings.time.isMeridiem ? formattedTime.hourMeridiem : formattedTime.hour }}
          </span>
          <span
            class="clock__colon"
            :class="{ 'clock__colon--blinking': settings.time.blinkingColon }"
            >:</span
          >
          <span class="clock__minute">{{ formattedTime.minute }}</span>
        </span>
        <span
          v-if="settings.time.showMeridiem && !isChinese"
          class="clock__meridiem"
          style="margin-left: 5px"
        >
          {{ formattedTime.meridiem }}
        </span>
      </div>
    </div>
    <div v-if="settings.time.showDate" class="clock__date">
      <span>
        {{ formattedDate.date }}
        {{ formattedDate.weekday }}
      </span>
      <span v-if="settings.time.showLunar && isChinese">{{ ` ${formattedDate.lunar}` }}</span>
      
      <!-- Weather Info -->
      <span v-if="weather" class="clock__weather">
        · {{ weatherIcons[weather.code] || '🌡️' }} {{ weather.temp }}°C
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.clock__pomodoro {
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease;
  
  &:active {
    transform: scale(0.95);
  }
}

.pomodoro-hint {
  font-size: 0.4em;
  opacity: 0.5;
  margin-left: 10px;
  vertical-align: middle;
}

.clock__time-wrapper {
  cursor: pointer;
  display: inline-flex;
  align-items: baseline;
  
  &:hover {
    opacity: 0.9;
  }
}

.clock__weather {
  margin-left: 8px;
  opacity: 0.9;
}
</style>
