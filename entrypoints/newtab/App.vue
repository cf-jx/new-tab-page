<script lang="ts" setup>
import { defineAsyncComponent, onBeforeMount, onMounted, provide, ref, watch } from 'vue'
import { promiseTimeout, useColorMode, useDark, usePreferredDark } from '@vueuse/core'

import type { Language } from 'element-plus/es/locale'
import { useTranslation } from 'i18next-vue'

import { OPEN_SEARCH_ENGINE_PREFERENCE } from '@/shared/keys'
import { getLang } from '@/shared/lang'
import { verifyImageUrl, verifyVideoUrl } from '@/shared/media'
import { BgType, reloadBackground, useSettingsStore } from '@/shared/settings'
import { setSyncEventCallback } from '@/shared/sync/syncDataStore'

import Background from '@newtab/components/Background.vue'
import Clock from '@newtab/components/Clock.vue'
import SearchBox from '@newtab/components/SearchBox/index.vue'
import SettingsBtn from '@newtab/components/SettingsBtn.vue'
import type SettingsPageComponent from '@newtab/components/SettingsPage/index.vue'
import type AboutCompComponent from '@newtab/components/About.vue'
import type SponsorComponent from '@newtab/components/Sponsor.vue'

import type SearchEnginesSwitcherComponent from '@newtab/components/SearchEnginesSwitcher/index.vue'
import BookmarkMenu from '@newtab/components/BookmarkMenu/index.vue'
import { getBingWallpaperURL } from '@newtab/scripts/api/bingWallpaper'
import { useBgSwitchStore } from '@newtab/scripts/store'

const { t, i18next } = useTranslation('sync')

const elementZhLocales = import.meta.glob<{ default: Language }>(
  '/node_modules/element-plus/es/locale/lang/zh*.mjs'
)

async function loadElementLocale(): Promise<Language> {
  const formattedLocale = getLang().toLowerCase()
  const loader =
    elementZhLocales[`/node_modules/element-plus/es/locale/lang/${formattedLocale}.mjs`]

  if (loader) {
    return (await loader()).default
  }

  return (await import('element-plus/es/locale/lang/zh-cn.mjs')).default
}

const elLocale = ref<Language>()

onBeforeMount(async () => {
  if (getLang().startsWith('zh')) {
    elLocale.value = await loadElementLocale()
  }
})

const onLngChanged = async (lng: string) => {
  if (lng?.startsWith('zh')) {
    elLocale.value = await loadElementLocale()
  } else {
    elLocale.value = undefined
  }
}
i18next.on('languageChanged', onLngChanged)

const SettingsPage = defineAsyncComponent(() => import('@newtab/components/SettingsPage/index.vue'))
const Faq = defineAsyncComponent(() => import('@newtab/components/Faq.vue'))
const AboutComp = defineAsyncComponent(() => import('@newtab/components/About.vue'))
const Sponsor = defineAsyncComponent(() => import('@newtab/components/Sponsor.vue'))
const SearchEnginesSwitcher = defineAsyncComponent(
  () => import('@newtab/components/SearchEnginesSwitcher/index.vue')
)
type SettingsPageInstance = InstanceType<typeof SettingsPageComponent>
type FaqInstance = InstanceType<typeof Faq>
type AboutCompInstance = InstanceType<typeof AboutCompComponent>
type SponsorInstance = InstanceType<typeof SponsorComponent>
type SearchEnginesSwitcherInstance = InstanceType<typeof SearchEnginesSwitcherComponent>

const SettingsPageRef = ref<SettingsPageInstance>()
const FaqRef = ref<FaqInstance>()
const AboutRef = ref<AboutCompInstance>()
const SponsorRef = ref<SponsorInstance>()
const SESwitcherRef = ref<SearchEnginesSwitcherInstance>()

const settings = useSettingsStore()
const isDark = useDark()
const switchStore = useBgSwitchStore()
const bgURL = ref('')
const settingsBtnVisible = ref(false)

function handleBookmarkPanelVisibility(visible: boolean) {
  settingsBtnVisible.value = visible
}

const bgTypeProviders: Record<BgType, { getURL: () => Promise<string>; verify?: () => Promise<boolean> }> = {
  [BgType.Bing]: {
    getURL: async () => await getBingWallpaperURL()
  },
  [BgType.Local]: {
    getURL: async () =>
      isDark.value
        ? settings.localDarkBackground.id
          ? settings.localDarkBackground.url
          : settings.localBackground.url
        : settings.localBackground.url,
    verify: async () => {
      const { localBackground, localDarkBackground } = useSettingsStore()

      if (!localBackground.url) {
        await reloadBackground(false)
        if (!localDarkBackground.id) return true
      }
      if (localDarkBackground.id && !localDarkBackground.url) {
        await reloadBackground(true)
        return true
      }

      const verifyLight = () => {
        if (localBackground.mediaType === 'image') {
          return verifyImageUrl(localBackground.url)
        }
        if (localBackground.mediaType === 'video') {
          return verifyVideoUrl(localBackground.url)
        }
        return Promise.resolve(true)
      }

      const verifyDark = () => {
        if (!localDarkBackground.id) return Promise.resolve(true)
        if (localDarkBackground.mediaType === 'image') {
          return verifyImageUrl(localDarkBackground.url)
        }
        if (localDarkBackground.mediaType === 'video') {
          return verifyVideoUrl(localDarkBackground.url)
        }
        return Promise.resolve(true)
      }

      const [isValid, isValidDark] = await Promise.all([verifyLight(), verifyDark()])

      if (!isValid) {
        await reloadBackground(false)
      }
      if (!isValidDark && localDarkBackground.id) {
        await reloadBackground(true)
      }

      return true
    }
  },
  [BgType.Online]: {
    getURL: () => Promise.resolve(settings.background.onlineUrl)
  },
  [BgType.None]: {
    getURL: () => Promise.resolve('')
  }
}

async function updateBackgroundURL(type: BgType) {
  const provider = bgTypeProviders[type]
  if (!provider) return

  switchStore.start()

  if (provider.verify) {
    await provider.verify()
  }
  const newUrl = await provider.getURL()

  await promiseTimeout(300)
  bgURL.value = ''
  bgURL.value = newUrl

  switchStore.end()
}

let stopLocalBgWatchRef: (() => void) | null = null
let stopOnlineBgWatch: (() => void) | null = null

const handleLocalBgChange = async () => {
  const shouldUseDark = isDark.value && settings.localDarkBackground?.id
  const currentUrl = shouldUseDark ? settings.localDarkBackground.url : settings.localBackground.url

  if (bgURL.value === currentUrl) return

  if (settings.localDarkBackground?.id) {
    await bgTypeProviders[BgType.Local].verify?.()
  }

  switchStore.start()
  await promiseTimeout(300)
  bgURL.value = ''
  bgURL.value = currentUrl
  switchStore.end()
}

const handleOnlineBgChange = async (newUrl: string) => {
  if (bgURL.value === newUrl) return

  switchStore.start()
  await promiseTimeout(300)
  bgURL.value = ''
  bgURL.value = newUrl
  switchStore.end()
}

function activateBackgroundWatch(type: BgType) {
  if (stopLocalBgWatchRef) {
    stopLocalBgWatchRef()
  }
  stopLocalBgWatchRef = null
  if (stopOnlineBgWatch) {
    stopOnlineBgWatch()
    stopOnlineBgWatch = null
  }

  if (type === BgType.Local) {
    stopLocalBgWatchRef = watch(
      () => [settings.localBackground.url, settings.localDarkBackground.url, isDark.value],
      handleLocalBgChange
    )
  } else if (type === BgType.Online) {
    stopOnlineBgWatch = watch(() => settings.background.onlineUrl, handleOnlineBgChange)
  }
}

function toggleDocumentClass(className: string, shouldAdd: boolean) {
  document.documentElement.classList.toggle(className, shouldAdd)
}

onMounted(() => {
  toggleDocumentClass('dialog-transparent', !settings.perf.disableDialogTransparent)
  toggleDocumentClass('dialog-acrylic', !settings.perf.disableDialogTransparent && !settings.perf.disableDialogBlur)
  toggleDocumentClass('colorful', settings.colorfulMode)

  setSyncEventCallback((type, payload) => {
    if (type === 'version-mismatch') {
      const p = payload as { cloud: string; local: string }
      ElNotification({
        title: t('failMessage.title'),
        message: t('failMessage.message', { cloud: p.cloud, local: p.local }),
        type: 'error'
      })
    } else if (type === 'sync-error') {
      const err = payload as Error
      ElNotification({
        title: t('errorMessage.title'),
        message: err.message || 'Unknown error.',
        type: 'error'
      })
    }
  })
})

watch(
  () => settings.colorfulMode,
  (colorful) => {
    toggleDocumentClass('colorful', colorful)
  }
)

watch(
  () => settings.perf.disableDialogTransparent,
  (disabled) => {
    toggleDocumentClass('dialog-transparent', !disabled)
  }
)

watch(
  () => settings.perf.disableDialogBlur,
  (disabled) => {
    toggleDocumentClass('dialog-acrylic', !disabled && !settings.perf.disableDialogTransparent)
  }
)

watch(
  () => settings.background.bgType,
  async (newType) => {
    await updateBackgroundURL(newType)
    activateBackgroundWatch(newType)
  },
  { immediate: true }
)

const preferredDark = usePreferredDark()
const { store } = useColorMode()
watch(preferredDark, () => {
  if (store.value === 'auto') {
    if (preferredDark.value) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }
})

provide(OPEN_SEARCH_ENGINE_PREFERENCE, () => SESwitcherRef.value?.show())
</script>

<template>
  <el-config-provider
    :locale="elLocale"
    :dialog="{
      transition: settings.perf.disableDialogAnimation ? 'none' : 'dialog',
      alignCenter: true
    }"
    :message="{
      placement: 'bottom'
    }"
  >
    <main class="app">
      <div
        class="app__hero"
        v-if="settings.time.enabled || settings.search.enabled"
      >
        <clock v-if="settings.time.enabled" />
        <search-box v-if="settings.search.enabled" />
      </div>
      <bookmark-menu @panel-visibility-change="handleBookmarkPanelVisibility" />
    </main>
    <background :url="bgURL" />
    <settings-btn
      v-if="settingsBtnVisible"
      @open-settings="SettingsPageRef?.toggle"
      @open-about="AboutRef?.toggle"
      @open-search-engine-preference="SESwitcherRef?.show"
      @open-faq="FaqRef?.show"
      @open-sponsor="SponsorRef?.show"
    />
    <settings-page ref="SettingsPageRef" />
    <faq ref="FaqRef" />
    <about-comp ref="AboutRef" />
    <search-engines-switcher ref="SESwitcherRef" />
    <sponsor ref="SponsorRef" />
  </el-config-provider>
</template>
