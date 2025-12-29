<script setup lang="ts">
import { ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import SearchIcon from '@vicons/material/es/SearchRound'
import { ElMessage } from 'element-plus'

import { isChinese } from '@/shared/lang'
import { useSettingsStore } from '@/shared/settings'

const { t } = useTranslation('settings')

const settings = useSettingsStore()

// 城市搜索相关
const citySearchQuery = ref('')
const isSearching = ref(false)
const searchError = ref('')

// 通过 Open-Meteo Geocoding API 搜索城市
async function searchCity() {
  if (!citySearchQuery.value.trim()) {
    searchError.value = t('clock.weather.pleaseEnterCity')
    return
  }
  
  isSearching.value = true
  searchError.value = ''
  
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citySearchQuery.value)}&count=1&language=zh`
    )
    const data = await res.json()
    
    if (data.results && data.results.length > 0) {
      const city = data.results[0]
      settings.time.weather.cityName = city.name + (city.admin1 ? `, ${city.admin1}` : '')
      settings.time.weather.manualLatitude = city.latitude
      settings.time.weather.manualLongitude = city.longitude
      citySearchQuery.value = ''
      ElMessage.success(t('clock.weather.cityFound', { city: settings.time.weather.cityName }))
    } else {
      searchError.value = t('clock.weather.cityNotFound')
    }
  } catch (e) {
    console.error('City search failed:', e)
    searchError.value = t('clock.weather.searchFailed')
  } finally {
    isSearching.value = false
  }
}
</script>

<template>
  <div class="settings__items-container">
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('newtab:common.enable') }}</div>
      <el-switch v-model="settings.time.enabled" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('clock.use12HourClock') }}</div>
      <el-switch v-model="settings.time.isMeridiem" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('clock.showAMPM') }}</div>
      <el-switch v-model="settings.time.showMeridiem" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('clock.showDate') }}</div>
      <el-switch v-model="settings.time.showDate" />
    </div>
    <div
      v-if="settings.time.showDate && isChinese"
      class="settings__item settings__item--horizontal"
    >
      <div class="settings__label">{{ t('clock.showLunar') }}</div>
      <el-switch v-model="settings.time.showLunar" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('clock.smallFont') }}</div>
      <el-switch v-model="settings.time.small" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('clock.enableShadow') }}</div>
      <el-switch v-model="settings.time.enableShadow" />
    </div>

    <!-- 天气设置区域 -->
    <div class="settings__divider"></div>
    <div class="settings__section-title">{{ t('clock.weather.title') }}</div>

    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('clock.weather.enable') }}</div>
      <el-switch v-model="settings.time.weather.enabled" />
    </div>

    <div v-if="settings.time.weather.enabled" class="settings__item settings__item--horizontal">
      <div class="settings__label-group">
        <div class="settings__label">{{ t('clock.weather.useManualLocation') }}</div>
        <div class="settings__sublabel">{{ t('clock.weather.useManualLocationTip') }}</div>
      </div>
      <el-switch v-model="settings.time.weather.useManualLocation" />
    </div>

    <template v-if="settings.time.weather.enabled && settings.time.weather.useManualLocation">
      <!-- 城市搜索 -->
      <div class="settings__item">
        <div class="settings__label">{{ t('clock.weather.searchCity') }}</div>
        <div class="city-search">
          <el-input
            v-model="citySearchQuery"
            :placeholder="t('clock.weather.searchCityPlaceholder')"
            @keyup.enter="searchCity"
          >
            <template #append>
              <el-button :icon="SearchIcon" :loading="isSearching" @click="searchCity">
                {{ t('clock.weather.search') }}
              </el-button>
            </template>
          </el-input>
          <div v-if="searchError" class="search-error">{{ searchError }}</div>
        </div>
      </div>

      <!-- 当前位置信息 -->
      <div v-if="settings.time.weather.cityName" class="settings__item">
        <div class="current-location">
          <div class="current-location__label">{{ t('clock.weather.currentLocation') }}</div>
          <div class="current-location__value">
            <span class="current-location__city">{{ settings.time.weather.cityName }}</span>
            <span class="current-location__coords">
              ({{ settings.time.weather.manualLatitude.toFixed(2) }}, {{ settings.time.weather.manualLongitude.toFixed(2) }})
            </span>
          </div>
        </div>
      </div>

      <!-- 手动输入经纬度 (折叠) -->
      <el-collapse class="advanced-collapse">
        <el-collapse-item :title="t('clock.weather.advancedSettings')">
          <div class="settings__item">
            <div class="settings__label">{{ t('clock.weather.cityName') }}</div>
            <el-input
              v-model="settings.time.weather.cityName"
              :placeholder="t('clock.weather.cityNamePlaceholder')"
              style="margin-top: 8px;"
            />
          </div>

          <div class="settings__item settings__item--row">
            <div class="settings__field">
              <div class="settings__label">{{ t('clock.weather.latitude') }}</div>
              <el-input-number
                v-model="settings.time.weather.manualLatitude"
                :precision="4"
                :step="0.1"
                :min="-90"
                :max="90"
                controls-position="right"
                style="width: 100%;"
              />
            </div>
            <div class="settings__field">
              <div class="settings__label">{{ t('clock.weather.longitude') }}</div>
              <el-input-number
                v-model="settings.time.weather.manualLongitude"
                :precision="4"
                :step="0.1"
                :min="-180"
                :max="180"
                controls-position="right"
                style="width: 100%;"
              />
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>
  </div>
</template>

<style scoped lang="scss">
.settings__divider {
  height: 1px;
  margin: 16px 0;
  background: var(--el-border-color-lighter);
}

.settings__section-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.settings__label-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings__sublabel {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.settings__item--row {
  display: flex;
  gap: 16px;
}

.settings__field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.city-search {
  margin-top: 8px;
}

.search-error {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.current-location {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  
  &__label {
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  
  &__value {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  
  &__city {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  &__coords {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.advanced-collapse {
  margin-top: 12px;
  
  :deep(.el-collapse-item__header) {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
  
  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }
}
</style>
