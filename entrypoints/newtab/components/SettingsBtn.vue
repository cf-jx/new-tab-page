<script lang="ts" setup>
import { HeartFilled } from '@vicons/antd'
import { HelpFilled, InfoRound, SearchRound, SettingsRound } from '@vicons/material'
import { useTranslation } from 'i18next-vue'

import { useSettingsStore } from '@/shared/settings'

import { getPerfClasses } from '@newtab/composables/perfClasses'

const emit = defineEmits<{
  (e: 'open-settings'): void
  (e: 'open-about'): void
  (e: 'open-search-engine-preference'): void
  (e: 'open-faq'): void
  (e: 'open-sponsor'): void
}>()

const { t } = useTranslation('newtab')
const settings = useSettingsStore()

</script>

<template>
  <el-dropdown
    style="display: block"
    :popper-class="
      getPerfClasses(
        {
          transparentOff: settings.perf.disableSettingsBtnTransparent,
          blurOff: settings.perf.disableSettingsBtnBlur
        },
        'settings-icon__popper'
      )
    "
    :show-arrow="false"
    placement="bottom-end"
    trigger="click"
    @contextmenu.prevent.stop
  >
    <div
      class="settings-icon"
      :class="{
        'settings-icon--tran': !settings.perf.disableSettingsBtnTransparent,
        'settings-icon--blur': !(
          settings.perf.disableSettingsBtnBlur || settings.perf.disableSettingsBtnTransparent
        )
      }"
    >
      <el-icon><settings-round /></el-icon>
    </div>
    <template #dropdown>
      <el-dropdown-menu class="noselect">
        <el-dropdown-item @click="emit('open-settings')">
          <el-icon :size="17"><settings-round /></el-icon>
          <span>{{ t('common.settings') }}</span>
        </el-dropdown-item>
        <el-dropdown-item @click="emit('open-search-engine-preference')">
          <el-icon :size="17"><search-round /></el-icon>
          <span>{{ t('menu.searchEnginePreference') }}</span>
        </el-dropdown-item>
        <el-dropdown-item @click="emit('open-faq')">
          <el-icon :size="17"><help-filled /></el-icon>
          <span>{{ t('menu.help') }}</span>
        </el-dropdown-item>
        <el-dropdown-item @click="emit('open-sponsor')">
          <el-icon :size="17"><heart-filled /></el-icon>
          <span>{{ t('menu.sponsor') }}</span>
        </el-dropdown-item>
        <el-dropdown-item divided @click="emit('open-about')">
          <el-icon :size="17"><info-round /></el-icon>
          <span>{{ t('menu.about') }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
