import { defineStore } from 'pinia'

export const useBgSwitchStore = defineStore('bgSwitching', () => {
  const isSwitching = ref(false)

  const start = () => {
    isSwitching.value = true
  }

  const end = () => {
    isSwitching.value = false
  }

  return { isSwitching, start, end }
})
