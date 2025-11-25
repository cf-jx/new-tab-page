<script lang="ts" setup>
import { ref } from 'vue'
import { useSettingsStore, BgType, saveSettings } from '@/shared/settings'

const settings = useSettingsStore()

const showLeftArrow = ref(false)
const showRightArrow = ref(false)

// Define the cycle order
const bgTypeOrder = [BgType.Bing, BgType.Local, BgType.Online, BgType.None]

function getCurrentIndex(): number {
  return bgTypeOrder.indexOf(settings.background.bgType)
}

function switchToPrevious() {
  const currentIndex = getCurrentIndex()
  const newIndex = currentIndex === 0 ? bgTypeOrder.length - 1 : currentIndex - 1
  const newBgType = bgTypeOrder[newIndex]
  if (newBgType !== undefined) {
    settings.background.bgType = newBgType
    saveSettings(settings)
  }
}

function switchToNext() {
  const currentIndex = getCurrentIndex()
  const newIndex = (currentIndex + 1) % bgTypeOrder.length
  const newBgType = bgTypeOrder[newIndex]
  if (newBgType !== undefined) {
    settings.background.bgType = newBgType
    saveSettings(settings)
  }
}
</script>

<template>
  <div class="wallpaper-switcher">
    <!-- Left Edge Zone -->
    <div 
      class="edge-zone edge-zone--left"
      @mouseenter="showLeftArrow = true"
      @mouseleave="showLeftArrow = false"
    >
      <transition name="arrow-fade">
        <div 
          v-if="showLeftArrow"
          class="arrow-button arrow-button--left"
          @click="switchToPrevious"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </transition>
    </div>

    <!-- Right Edge Zone -->
    <div 
      class="edge-zone edge-zone--right"
      @mouseenter="showRightArrow = true"
      @mouseleave="showRightArrow = false"
    >
      <transition name="arrow-fade">
        <div 
          v-if="showRightArrow"
          class="arrow-button arrow-button--right"
          @click="switchToNext"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </transition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wallpaper-switcher {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.edge-zone {
  position: absolute;
  width: 80px;
  top: 25%;
  height: 50%;
  pointer-events: auto;
  display: flex;
  align-items: center;
  
  &--left {
    left: 0;
    justify-content: flex-start;
    padding-left: 20px;
  }
  
  &--right {
    right: 0;
    justify-content: flex-end;
    padding-right: 20px;
  }
}

.arrow-button {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  
  // Glassmorphism
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    opacity: 0.9;
  }
}

// Arrow fade animation
.arrow-fade-enter-active,
.arrow-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.arrow-fade-enter-from {
  opacity: 0;
  
  .arrow-button--left & {
    transform: translateX(-10px);
  }
  
  .arrow-button--right & {
    transform: translateX(10px);
  }
}

.arrow-fade-leave-to {
  opacity: 0;
  
  .arrow-button--left & {
    transform: translateX(-10px);
  }
  
  .arrow-button--right & {
    transform: translateX(10px);
  }
}
</style>
