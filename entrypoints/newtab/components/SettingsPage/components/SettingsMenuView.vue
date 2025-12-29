<script setup lang="ts">
import {
  ClockCircleOutlined,
  ControlOutlined,
  PictureOutlined,
  SearchOutlined
} from '@vicons/antd'
import { ApiRound, ChevronRightRound, ColorLensOutlined } from '@vicons/material'
import { useTranslation } from 'i18next-vue'

import { Chrome, Edge, Firefox, Github } from '@vicons/fa'
import { useDateFormat, useNow } from '@vueuse/core'
import { browser } from 'wxt/browser'

import { version } from '@/package.json'

import { SettingsRoute } from '../composables/useSettingsRouter'

const { t } = useTranslation('settings')
const year = useDateFormat(useNow(), 'YYYY')

interface MenuItem {
  key: SettingsRoute
  icon: Component
  titleKey: string
}

const menuItems: MenuItem[] = [
  {
    key: SettingsRoute.THEME,
    icon: ColorLensOutlined,
    titleKey: 'theme.title'
  },
  {
    key: SettingsRoute.CLOCK,
    icon: ClockCircleOutlined,
    titleKey: 'clock.title'
  },
  {
    key: SettingsRoute.SEARCH,
    icon: SearchOutlined,
    titleKey: 'search.title'
  },
  {
    key: SettingsRoute.BACKGROUND,
    icon: PictureOutlined,
    titleKey: 'background.title'
  },
  {
    key: SettingsRoute.PERFORMANCE,
    icon: ApiRound,
    titleKey: 'perf.title'
  },
  {
    key: SettingsRoute.OTHER,
    icon: ControlOutlined,
    titleKey: 'other.title'
  }
]

interface Props {
  isMobile?: boolean
  isCollapse?: boolean
  activeKey?: string
}

defineProps<Props>()

const emit = defineEmits<{
  select: [key: string]
}>()

function handleMenuSelect(key: string) {
  emit('select', key)
}
</script>

<template>
  <aside class="settings-aside">
    <el-menu
      :default-active="activeKey"
      :collapse="isCollapse"
      :collapse-transition="!isMobile"
      class="settings-menu"
      @select="handleMenuSelect"
    >
      <div class="settings-menu__icon">
        <el-icon v-if="!isMobile" :size="36">
          <Icon />
        </el-icon>
        <span v-else>{{ t('title') }}</span>
      </div>
      <el-menu-item
        v-for="item in menuItems"
        :key="item.key"
        :index="item.key"
        class="settings-menu-item noselect"
      >
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
        <template #title>
          <span class="menu-title">{{ t(item.titleKey) }}</span>
        </template>
        <!-- Mobile: Show chevron arrow -->
        <el-icon v-if="isMobile" class="menu-chevron">
          <component :is="ChevronRightRound" />
        </el-icon>
      </el-menu-item>
    </el-menu>

    <!-- About Section at Bottom -->
    <div v-if="!isCollapse" class="settings-aside__footer noselect">
      <div class="footer-info">
        <span class="footer-info__name">{{ browser.i18n.getMessage('extension_name') }}</span>
        <span class="footer-info__version">v{{ version }}</span>
      </div>
      <div class="footer-copyright">© {{ year }} cf-jx</div>
      <div class="footer-links">
        <el-link :underline="false" href="https://github.com/cf-jx/new-tab-page" target="_blank">
          <el-icon :size="16"><Github /></el-icon>
        </el-link>
        <el-link :underline="false" href="https://chromewebstore.google.com/detail/bhbpmpflnpnkjanfgbjjhldccbckjohb" target="_blank">
          <el-icon :size="16"><Chrome /></el-icon>
        </el-link>
        <el-link :underline="false" href="https://microsoftedge.microsoft.com/addons/detail/keikkgfgidagjlicckkangkfgnbdjdnh" target="_blank">
          <el-icon :size="16"><Edge /></el-icon>
        </el-link>
        <el-link :underline="false" href="https://addons.mozilla.org/firefox/addon/lemon-new-tab/" target="_blank">
          <el-icon :size="16"><Firefox /></el-icon>
        </el-link>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.settings-aside {
  display: flex;
  flex-direction: column;
  height: 100%;

  .settings-menu {
    flex: 1;
    border-right: none;
  }

  &__footer {
    padding: 20px;
    margin-top: auto;
    border-top: 1px solid var(--el-border-color-lighter);

    .footer-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      &__name {
        font-size: 13px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      &__version {
        font-size: 11px;
        color: var(--el-color-primary);
      }
    }

    .footer-copyright {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }

    .footer-links {
      display: flex;
      gap: 12px;
      margin-top: 12px;

      .el-link {
        color: var(--el-text-color-secondary);
        &:hover {
          color: var(--el-color-primary);
        }
      }
    }
  }
}
</style>
