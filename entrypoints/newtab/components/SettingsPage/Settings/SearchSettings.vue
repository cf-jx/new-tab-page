<script setup lang="ts">
import { Plus } from '@vicons/fa'
import { CheckmarkCircle12Filled } from '@vicons/fluent'
import { useTranslation } from 'i18next-vue'

import { saveCustomSearchEngine, useCustomSearchEngineStore } from '@/shared/customSearchEngine'
import { getFaviconURL } from '@/shared/media'
import { useSettingsStore } from '@/shared/settings'

import { searchEngines, searchSuggestAPIs } from '@newtab/scripts/api/search'

import AddCustomSearchEngine from './components/AddCustomSearchEngine.vue'
import CustomEngineItem from './components/CustomEngineItem.vue'

const { t } = useTranslation()

const settings = useSettingsStore()
const customSearchEngineStore = useCustomSearchEngineStore()

const addCustomSearchEngineRef = ref<InstanceType<typeof AddCustomSearchEngine>>()

function selectCustomEngine(engineId: string) {
  settings.search.selectedSearchEngine = engineId
}

function editCustomEngine(index: number) {
  addCustomSearchEngineRef.value?.openEditDialog(index)
}

async function deleteCustomEngine(index: number) {
  const engine = customSearchEngineStore.items[index]
  if (!engine) return

  try {
    await ElMessageBox.confirm(
      t('settings:customSearchEngine.deleteConfirm', { title: engine.name }),
      t('settings:common.warning'),
      {
        confirmButtonText: t('settings:common.confirm'),
        cancelButtonText: t('settings:common.cancel'),
        type: 'warning'
      }
    )

    if (settings.search.selectedSearchEngine === engine.id) {
      settings.search.selectedSearchEngine = 'bing'
    }

    customSearchEngineStore.items.splice(index, 1)
    await saveCustomSearchEngine(customSearchEngineStore.$state)
  } catch {
    // cancelled
  }
}

type CustomEngineItemRef = InstanceType<typeof CustomEngineItem> | null
const openedDropdownIndex = ref<number | null>(null)
const dropdownRefs = ref<Array<CustomEngineItemRef>>([])

function setChildRef(i: number, el: CustomEngineItemRef) {
  dropdownRefs.value[i] = el
}

function onChildOpened(index: number) {
  if (openedDropdownIndex.value !== null && openedDropdownIndex.value !== index) {
    const prev = dropdownRefs.value[openedDropdownIndex.value]
    if (prev) {
      prev.close()
    }
  }
  openedDropdownIndex.value = index
}

const customEngineFaviconCache = new Map<string, Ref<string>>()

function getCustomEngineFavicon(engine: { id: string; url: string; icon?: string }): string {
  if (engine.icon) return engine.icon
  if (!customEngineFaviconCache.has(engine.id)) {
    customEngineFaviconCache.set(engine.id, getFaviconURL(engine.url))
  }
  return customEngineFaviconCache.get(engine.id)!.value
}
</script>

<template>
  <div class="settings__items-container search-settings">
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('newtab:common.enable') }}</div>
      <el-switch v-model="settings.search.enabled" />
    </div>

    <!-- 搜索引擎切换 -->
    <div class="settings__item">
      <div class="settings__label" style="margin-bottom: 12px">
        {{ t('settings:search.defaultSearchEngine') }}
      </div>
      <div class="se-switcher-grid noselect">
        <el-row :gutter="10">
          <!-- 内置引擎 -->
          <el-col
            v-for="key in Object.keys(searchEngines) as (keyof typeof searchEngines)[]"
            :key="key"
            :span="12"
            style="margin-bottom: 10px"
          >
            <div
              class="se-switcher-item"
              :class="{ 'is-active': settings.search.selectedSearchEngine === key }"
              @click="settings.search.selectedSearchEngine = key"
            >
              <el-icon size="16" class="se-switcher-item__icon">
                <component :is="searchEngines[key].icon" />
              </el-icon>
              <div class="se-switcher-item__content">
                <div class="se-switcher-item__label">
                  {{ t(searchEngines[key].nameKey) }}
                </div>
                <el-text truncated class="se-switcher-item__url">
                  {{ searchEngines[key].url }}
                </el-text>
              </div>
              <el-icon size="16" class="se-switcher-item__checked">
                <CheckmarkCircle12Filled />
              </el-icon>
            </div>
          </el-col>

          <!-- 自定义引擎 -->
          <el-col
            v-for="(engine, index) in customSearchEngineStore.items"
            :key="engine.id"
            :span="12"
            style="margin-bottom: 10px"
          >
            <CustomEngineItem
              :engine="engine"
              :is-active="settings.search.selectedSearchEngine === engine.id"
              :icon-url="getCustomEngineFavicon(engine)"
              @select="selectCustomEngine"
              @edit="() => editCustomEngine(index)"
              @delete="() => deleteCustomEngine(index)"
              @opened="() => onChildOpened(index)"
              :ref="(el) => setChildRef(index, el as any)"
            />
          </el-col>

          <!-- 添加按钮 -->
          <el-col :span="12">
            <div
              class="se-switcher-item se-switcher-item--add"
              @click="addCustomSearchEngineRef?.openAddDialog"
            >
              <el-icon size="16" class="se-switcher-item__icon">
                <Plus />
              </el-icon>
              <div class="se-switcher-item__content">
                <div class="se-switcher-item__label">
                  {{ t('settings:customSearchEngine.add') }}
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 其他设置 -->
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">
        {{ t('settings:search.searchSuggestionProvider') }}
      </div>
      <el-select
        v-model="settings.search.selectedSearchSuggestionAPI"
        style="width: 150px"
        fit-input-width
        :show-arrow="false"
      >
        <el-option
          v-for="name in Object.keys(searchSuggestAPIs)"
          :key="name"
          :label="t(searchSuggestAPIs[name as keyof typeof searchSuggestAPIs].nameKey)"
          :value="name"
        />
      </el-select>
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('settings:search.openInNewTab') }}</div>
      <el-switch v-model="settings.search.searchInNewTab" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('settings:search.alwaysExpandSearchBar') }}</div>
      <el-switch v-model="settings.search.alwaysExpandSearchBar" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('settings:search.enableShadow') }}</div>
      <el-switch v-model="settings.search.enableShadow" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('settings:search.recordSearchHistory') }}</div>
      <el-switch v-model="settings.search.recordSearchHistory" />
    </div>
    <div class="settings__item settings__item--horizontal">
      <div class="settings__label">{{ t('settings:search.placeholder') }}</div>
      <el-input v-model="settings.search.placeholder" style="width: 240px" />
    </div>
  </div>

  <AddCustomSearchEngine ref="addCustomSearchEngineRef" />
</template>

<style lang="scss">
@use '@newtab/styles/mixins/acrylic.scss' as acrylic;

.se-switcher-item {
  display: flex;
  align-items: center;
  height: 65px;
  padding: 12px 16px;
  cursor: pointer;
  background-color: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--el-fill-color-light);
    border-color: var(--el-border-color);
  }

  &.is-active {
    color: var(--el-color-white);
    background-color: var(--el-color-primary);
    border-color: var(--el-color-primary);

    .se-switcher-item__url {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  &--add {
    color: var(--el-text-color-secondary);
    border-style: dashed;
  }

  &__icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    margin-right: 12px;
    background-color: var(--el-bg-color);
    border-radius: 8px;

    img {
      width: 18px;
      height: 18px;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__label {
    font-size: 14px;
    font-weight: 600;
  }

  &__url {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__checked {
    display: none;
    margin-left: 8px;

    .is-active & {
      display: block;
    }
  }
}

// 复用 switcher 菜单样式
.se-switcher-item__menu-popper.el-dropdown__popper.el-popper {
  .el-dropdown-menu__item {
    padding: 2px 15px;
    font-size: var(--el-font-size-small);
  }

  &.se-switcher-item__menu-popper--blur {
    @include acrylic.acrylic;
  }
}
</style>
