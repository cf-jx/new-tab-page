<script lang="ts" setup>
import { SettingsRound } from '@vicons/material'
import { useSettingsStore } from '@/shared/settings'

const emit = defineEmits<{
  (e: 'open-settings'): void
}>()

const settings = useSettingsStore()
</script>

<template>
  <div
    class="settings-icon noselect"
    :class="{
      'settings-icon--tran': !settings.perf.disableSettingsBtnTransparent,
      'settings-icon--blur': !(
        settings.perf.disableSettingsBtnBlur || settings.perf.disableSettingsBtnTransparent
      )
    }"
    @click="emit('open-settings')"
    @contextmenu.prevent.stop
  >
    <el-icon><settings-round /></el-icon>
  </div>
</template>

<style lang="scss" scoped>
.settings-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &--tran {
    background-color: transparent;
  }
}
</style>
