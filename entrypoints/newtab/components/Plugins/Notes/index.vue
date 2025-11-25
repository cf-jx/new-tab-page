<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { useTranslation } from 'i18next-vue'

const { t } = useTranslation('settings')
const noteContent = useStorage('newtab-notes', '')
</script>

<template>
  <div class="notes-container">
    <!-- Hot area for triggering hover -->
    <div class="notes-trigger"></div>
    
    <div class="notes-widget glass-panel">
      <div class="notes-header">
        <h3>{{ t('plugins.notes') }}</h3>
      </div>
      <textarea 
        v-model="noteContent" 
        :placeholder="t('plugins.notesPlaceholder')"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notes-container {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 100;
  /* Ensure hover works */
  pointer-events: none; 
}

.notes-trigger {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 60px;
  height: 60px;
  pointer-events: auto;
  /* Transparent trigger area */
  background: transparent; 
}

.notes-widget {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 280px;
  height: 200px;
  display: flex;
  flex-direction: column;
  color: var(--el-text-color-primary);
  
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 4px 30px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  padding: 16px;
  
  /* Animation */
  transform: translate(120%, 20%); /* Hide off-screen */
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: auto;

  html.dark & {
    background: rgba(30, 30, 30, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
    color: #eee;
  }
}

/* Hover logic: Show when hovering trigger OR widget itself */
.notes-container:hover .notes-widget,
.notes-widget:focus-within {
  transform: translate(0, 0);
  opacity: 1;
}

.notes-header {
  margin-bottom: 8px;
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    opacity: 0.8;
  }
}

textarea {
  flex: 1;
  background: transparent;
  border: none;
  resize: none;
  color: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  font-family: inherit;
  
  &::placeholder {
    color: var(--el-text-color-secondary);
    opacity: 0.5;
  }
  
  // Custom scrollbar
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.2);
    border-radius: 2px;
  }
}
</style>
