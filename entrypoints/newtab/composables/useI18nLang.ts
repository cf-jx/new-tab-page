import { ref, onUnmounted } from 'vue'
import i18next from 'i18next'

/**
 * 响应式获取 i18next 当前语言
 * 语言变更时自动更新 ref 值
 */
export function useI18nLang() {
  const lang = ref(i18next.language)

  const handler = (lng: string) => {
    lang.value = lng
  }

  i18next.on('languageChanged', handler)

  onUnmounted(() => {
    i18next.off('languageChanged', handler)
  })

  return lang
}
