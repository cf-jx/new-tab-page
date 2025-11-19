<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import Add from '@vicons/material/es/AddRound'
import ArrowBack from '@vicons/material/es/ArrowBackRound'
import Close from '@vicons/material/es/CloseRound'
import Folder from '@vicons/material/es/FolderRound'
import RefreshIcon from '@vicons/material/es/RefreshRound'
import Search from '@vicons/material/es/SearchRound'
import EditIcon from '@vicons/material/es/EditRound'
import DeleteIcon from '@vicons/material/es/DeleteRound'
import { useTranslation } from 'i18next-vue'
import { browser } from 'wxt/browser'
import Fuse from 'fuse.js'

import { getBookmarkFolders, type ChromeBookmarkNode } from '@/shared/chromeBookmarks'
import { useSettingsStore } from '@/shared/settings'

import BookmarkTreeItem from './BookmarkTreeItem.vue'

const emit = defineEmits<{
  (e: 'panel-visibility-change', visible: boolean): void
}>()

const { t } = useTranslation('newtab')
const settings = useSettingsStore()

const glassBlurStyle = computed(() => ({
  '--bookmark-glass-blur': `${settings.bookmarkMenu.bookmarkGlassBlur}px`
}))

const panelVisible = ref(false)
const bookmarkTree = ref<ChromeBookmarkNode[]>([])
const loading = ref(false)
const folderStack = ref<ChromeBookmarkNode[]>([])

const searchQuery = ref('')
const searchResults = ref<ChromeBookmarkNode[]>([])
const selectedIndex = ref(-1)
const searchInputRef = ref<HTMLInputElement | null>(null)
const isSearching = computed(() => searchQuery.value.trim().length > 0)
const currentFolder = computed(() => folderStack.value[folderStack.value.length - 1] ?? null)
const currentItems = computed(() => (currentFolder.value?.children ?? bookmarkTree.value))
const currentFolders = computed(() => currentItems.value.filter((node) => !node.url))
const currentBookmarks = computed(() =>
  currentItems.value.filter((node) => node.url && !node.children)
)

const editDialogVisible = ref(false)
const editMode = ref<'add' | 'edit' | 'addFolder' | 'addChild' | 'addChildFolder'>('add')
const editingNode = ref<ChromeBookmarkNode | null>(null)
const editParentId = ref('1')
const editForm = ref({
  title: '',
  url: ''
})
const deleteDialogVisible = ref(false)
const deleteNode = ref<ChromeBookmarkNode | null>(null)
const panelContainerRef = ref<HTMLElement | null>(null)
const folderContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  folder: null as ChromeBookmarkNode | null
})

let fuse: Fuse<ChromeBookmarkNode> | null = null

function getAllBookmarks(nodes: ChromeBookmarkNode[]): ChromeBookmarkNode[] {
  const result: ChromeBookmarkNode[] = []
  const traverse = (node: ChromeBookmarkNode) => {
    if (node.url && !node.children) {
      result.push(node)
    }
    if (node.children) {
      node.children.forEach(traverse)
    }
  }
  nodes.forEach(traverse)
  return result
}

function initFuse() {
  const allBookmarks = getAllBookmarks(bookmarkTree.value)
  fuse = new Fuse(allBookmarks, {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'url', weight: 0.3 }
    ],
    threshold: 0.35,
    includeScore: true,
    useExtendedSearch: true
  })
}

function resetSearch() {
  searchQuery.value = ''
  searchResults.value = []
  selectedIndex.value = -1
}

function searchBookmarks() {
  if (!fuse || !searchQuery.value.trim()) {
    resetSearch()
    return
  }

  const results = fuse.search(searchQuery.value.trim())
  searchResults.value = results.map((result) => result.item)
  selectedIndex.value = results.length > 0 ? 0 : -1
}

function performSearch() {
  if (selectedIndex.value >= 0 && selectedIndex.value < searchResults.value.length) {
    const bookmark = searchResults.value[selectedIndex.value]
    if (bookmark?.url) {
      window.open(bookmark.url, '_blank')
    }
  }
}

function handleKeydown(event: Event | KeyboardEvent) {
  const keyboardEvent = event as KeyboardEvent
  if (!isSearching.value || !searchResults.value.length) return

  switch (keyboardEvent.key) {
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value =
        selectedIndex.value <= 0 ? searchResults.value.length - 1 : selectedIndex.value - 1
      break
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value =
        selectedIndex.value >= searchResults.value.length - 1 ? 0 : selectedIndex.value + 1
      break
    case 'Enter':
      event.preventDefault()
      performSearch()
      break
    default:
      break
  }
}

async function ensureDataLoaded() {
  if (bookmarkTree.value.length > 0) return
  loading.value = true
  const folders = await getBookmarkFolders()
  const bookmarksBar = folders.find((folder) => folder.id === '1')
  bookmarkTree.value = bookmarksBar?.children ?? []
  loading.value = false
  initFuse()
}

async function refresh() {
  loading.value = true
  const folders = await getBookmarkFolders()
  const bookmarksBar = folders.find((folder) => folder.id === '1')
  bookmarkTree.value = bookmarksBar?.children ?? []
  folderStack.value = []
  loading.value = false
  initFuse()
  resetSearch()
}

async function showPanel() {
  if (!settings.bookmarkMenu.enable) return
  await ensureDataLoaded()
  if (!panelVisible.value) {
    panelVisible.value = true
    emit('panel-visibility-change', true)
  }
  folderStack.value = []
  resetSearch()
  await nextTick()
  searchInputRef.value?.focus()
}

function hidePanel() {
  if (!panelVisible.value) return
  panelVisible.value = false
  emit('panel-visibility-change', false)
  folderStack.value = []
  resetSearch()
  hideFolderContextMenu()
}

async function togglePanel() {
  if (panelVisible.value) {
    hidePanel()
  } else {
    await showPanel()
  }
}

function handleTriggerContext(event: MouseEvent) {
  if (!settings.bookmarkMenu.enable) return
  event.preventDefault()
  event.stopPropagation()
  void showPanel()
}

function enterFolder(node: ChromeBookmarkNode) {
  folderStack.value = [...folderStack.value, node]
  resetSearch()
}

function goBack() {
  if (folderStack.value.length > 0) {
    folderStack.value = folderStack.value.slice(0, -1)
  }
}

function openBookmark(url: string) {
  if (url) {
    window.open(url, '_blank')
  }
}

function isEventInsideBookmarkUI(target: EventTarget | null) {
  if (!(target instanceof Node)) {
    return false
  }
  if (panelContainerRef.value?.contains(target)) {
    return true
  }
  if (target instanceof Element) {
    if (target.closest('.bookmark-context-menu')) {
      return true
    }
    if (target.closest('.el-overlay')) {
      return true
    }
    if (target.closest('.settings-icon') || target.closest('.settings-icon__popper')) {
      return true
    }
  }
  return false
}

useEventListener(document, 'mousedown', (event) => {
  if (!panelVisible.value) return
  if (isEventInsideBookmarkUI(event.target)) return
  hidePanel()
})

const editDialogTitle = computed(() => {
  if (editMode.value === 'add') return t('bookmarkMenu.addBookmark')
  if (editMode.value === 'addFolder') return t('bookmarkMenu.addFolder')
  if (editMode.value === 'addChild') return t('bookmarkMenu.addChildBookmark')
  if (editMode.value === 'addChildFolder') return t('bookmarkMenu.addChildFolder')
  return t('bookmarkMenu.editBookmark')
})

const shouldShowUrlField = computed(() => {
  if (editMode.value === 'addFolder' || editMode.value === 'addChildFolder') return false
  if (editMode.value === 'edit' && !editingNode.value?.url) return false
  return true
})


function getCurrentParentId(defaultId = '1') {
  return currentFolder.value?.id ?? defaultId
}

function formatBookmarkUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed)
    return trimmed
  } catch {
    return `https://${trimmed}`
  }
}

function showAddBookmark() {
  editMode.value = 'add'
  editParentId.value = getCurrentParentId()
  editForm.value = { title: '', url: '' }
  editDialogVisible.value = true
}

function showAddFolder() {
  editMode.value = 'addFolder'
  editParentId.value = getCurrentParentId()
  editForm.value = { title: '', url: '' }
  editDialogVisible.value = true
}

function showAddChildBookmark(parentNode: ChromeBookmarkNode) {
  editMode.value = 'addChild'
  editParentId.value = parentNode.id
  editingNode.value = parentNode
  editForm.value = { title: '', url: '' }
  editDialogVisible.value = true
}

function showAddChildFolder(parentNode: ChromeBookmarkNode) {
  editMode.value = 'addChildFolder'
  editParentId.value = parentNode.id
  editingNode.value = parentNode
  editForm.value = { title: '', url: '' }
  editDialogVisible.value = true
}

function showEditBookmark(node: ChromeBookmarkNode) {
  editMode.value = 'edit'
  editingNode.value = node
  editForm.value = {
    title: node.title,
    url: node.url ?? ''
  }
  editDialogVisible.value = true
}

async function saveBookmark() {
  try {
    if (!editForm.value.title.trim()) {
      ElMessage.error(t('bookmarkMenu.namePlaceholder'))
      return
    }

    if (shouldShowUrlField.value && !editForm.value.url.trim()) {
      ElMessage.error(t('bookmarkMenu.urlPlaceholder'))
      return
    }

    if (shouldShowUrlField.value) {
      editForm.value.url = formatBookmarkUrl(editForm.value.url)
    }
    if (editMode.value === 'add') {
      await browser.bookmarks.create({
        parentId: editParentId.value,
        title: editForm.value.title,
        url: editForm.value.url
      })
      ElMessage.success(t('bookmarkMenu.addSuccess'))
    } else if (editMode.value === 'addFolder') {
      await browser.bookmarks.create({
        parentId: editParentId.value,
        title: editForm.value.title
      })
      ElMessage.success(t('bookmarkMenu.addFolderSuccess'))
    } else if (editMode.value === 'addChild') {
      await browser.bookmarks.create({
        parentId: editParentId.value,
        title: editForm.value.title,
        url: editForm.value.url
      })
      ElMessage.success(t('bookmarkMenu.addSuccess'))
    } else if (editMode.value === 'addChildFolder') {
      await browser.bookmarks.create({
        parentId: editParentId.value,
        title: editForm.value.title
      })
      ElMessage.success(t('bookmarkMenu.addFolderSuccess'))
    } else if (editMode.value === 'edit' && editingNode.value) {
      const payload: { title: string; url?: string } = {
        title: editForm.value.title
      }
      if (shouldShowUrlField.value) {
        payload.url = editForm.value.url || undefined
      }
      await browser.bookmarks.update(editingNode.value.id, payload)
      ElMessage.success(t('bookmarkMenu.editSuccess'))
    }

    editDialogVisible.value = false
    await refresh()
  } catch (error) {
    console.error('Save bookmark failed:', error)
    ElMessage.error(t('bookmarkMenu.saveError'))
  }
}

function showFolderContextMenu(event: MouseEvent, folder: ChromeBookmarkNode) {
  event.preventDefault()
  event.stopPropagation()
  hideFolderContextMenu()
  folderContextMenu.visible = true
  folderContextMenu.folder = folder
  folderContextMenu.x = event.clientX
  folderContextMenu.y = event.clientY
  document.addEventListener('click', hideFolderContextMenu)
  document.addEventListener('contextmenu', hideFolderContextMenu)
}

function hideFolderContextMenu() {
  folderContextMenu.visible = false
  folderContextMenu.folder = null
  document.removeEventListener('click', hideFolderContextMenu)
  document.removeEventListener('contextmenu', hideFolderContextMenu)
}

function handleFolderMenuAction(action: 'edit' | 'delete') {
  const folder = folderContextMenu.folder
  hideFolderContextMenu()
  if (!folder) return
  if (action === 'edit') {
    showEditBookmark(folder)
  } else {
    void deleteBookmark(folder)
  }
}

function showDeleteConfirm(node: ChromeBookmarkNode) {
  deleteNode.value = node
  deleteDialogVisible.value = true
}

async function confirmDelete() {
  if (!deleteNode.value) return

  try {
    if (deleteNode.value.children && deleteNode.value.children.length > 0) {
      await browser.bookmarks.removeTree(deleteNode.value.id)
    } else {
      await browser.bookmarks.remove(deleteNode.value.id)
    }

    ElMessage.success(t('bookmarkMenu.deleteSuccess'))
    deleteDialogVisible.value = false
    deleteNode.value = null
    await refresh()
  } catch (error) {
    console.error('Delete bookmark failed:', error)
    ElMessage.error(t('bookmarkMenu.deleteError'))
  }
}

function deleteBookmark(node: ChromeBookmarkNode) {
  showDeleteConfirm(node)
}

watch(
  () => settings.bookmarkMenu.enable,
  (enabled) => {
    if (!enabled) {
      hidePanel()
    }
  }
)

useEventListener(window, 'keydown', (event) => {
  if (event.key === 'Escape' && panelVisible.value) {
    hidePanel()
  }
})

let previousBodyOverflow = ''
watch(
  () => panelVisible.value,
  (visible) => {
    if (typeof document === 'undefined') return
    if (visible) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = previousBodyOverflow
    }
  }
)

onUnmounted(() => {
  document.removeEventListener('click', hideFolderContextMenu)
  document.removeEventListener('contextmenu', hideFolderContextMenu)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow
  }
})

defineExpose({
  show: showPanel,
  hide: hidePanel,
  toggle: togglePanel,
  visible: panelVisible
})
</script>

<template>
  <div class="bookmark-inline-area" @contextmenu.prevent="handleTriggerContext">
    <transition name="bookmark-panel-fade">
      <section
        v-if="panelVisible"
        ref="panelContainerRef"
        class="bookmark-panel"
        :style="glassBlurStyle"
        @click.stop
      >
          <header class="bookmark-panel__header">
            <button
              v-if="currentFolder"
              type="button"
              class="bookmark-panel__circle-btn"
              @click="goBack"
            >
              <el-icon><arrow-back /></el-icon>
            </button>
            <div class="bookmark-panel__title-group">
              <h3 class="bookmark-panel__title">
                {{ currentFolder?.title || t('bookmarkMenu.title') }}
              </h3>
            </div>
              <div class="bookmark-panel__actions">
                <el-tooltip v-if="currentFolder" placement="top">
                  <template #content>
                    {{ t('bookmarkMenu.addBookmark') }}
                  </template>
                <el-icon
                  class="bookmark-panel__icon"
                @click.stop="showAddBookmark"
              >
                <add />
              </el-icon>
            </el-tooltip>
            <el-tooltip placement="top">
              <template #content>
                {{ t('bookmarkMenu.addFolder') }}
              </template>
              <el-icon
                  class="bookmark-panel__icon"
                  @click.stop="showAddFolder"
                >
                  <folder />
                </el-icon>
              </el-tooltip>
            <el-tooltip placement="top">
              <template #content>
                {{ t('bookmarkMenu.refresh') }}
              </template>
                <el-icon class="bookmark-panel__icon" @click.stop="refresh">
                  <refresh-icon />
                </el-icon>
            </el-tooltip>
            <el-icon class="bookmark-panel__icon" @click="hidePanel">
              <close />
            </el-icon>
          </div>
        </header>

        <div class="bookmark-panel__search">
          <el-input
            ref="searchInputRef"
            v-model="searchQuery"
            :placeholder="t('bookmarkMenu.searchPlaceholder')"
            :prefix-icon="Search"
            clearable
            @input="searchBookmarks"
            @keydown="handleKeydown"
          />
        </div>

        <div class="bookmark-panel__body">
          <div v-if="loading" class="bookmark-panel__loading">
            <span class="bookmark-panel__loading-spinner"></span>
            <span>{{ t('common.loading') }}</span>
          </div>
          <template v-else>
            <div v-if="isSearching" class="bookmark-panel__search-results">
              <div
                v-for="(item, index) in searchResults"
                :key="item.id"
                class="bookmark-panel__search-item"
                :class="{ active: index === selectedIndex }"
                @click="openBookmark(item.url!)"
              >
                <div class="bookmark-panel__search-item-title">{{ item.title }}</div>
                <div class="bookmark-panel__search-item-url">{{ item.url }}</div>
              </div>
              <div v-if="searchResults.length === 0" class="bookmark-panel__empty">
                {{ t('bookmarkMenu.noSearchResults') }}
              </div>
            </div>

            <transition name="bookmark-panel-slide" mode="out-in">
              <div v-if="!isSearching" key="panel-content">
                <div v-if="currentFolder" class="bookmark-panel__tree">
                  <template v-if="currentItems.length">
                  <bookmark-tree-item
                    v-for="node in currentItems"
                    :key="node.id"
                    :node="node"
                    :level="0"
                    @edit="showEditBookmark"
                    @delete="deleteBookmark"
                    @add-child="showAddChildBookmark"
                    @add-child-folder="showAddChildFolder"
                  />
                  </template>
                  <p v-else class="bookmark-panel__empty">{{ t('bookmarkMenu.folderEmpty') }}</p>
                </div>
                <div v-else>
                  <div v-if="currentFolders.length" class="bookmark-panel__folder-grid">
                    <button
                      v-for="folder in currentFolders"
                      :key="folder.id"
                      type="button"
                      class="bookmark-panel__folder-card"
                      @click="enterFolder(folder)"
                      @contextmenu="showFolderContextMenu($event, folder)"
                    >
                      <div class="bookmark-panel__folder-icon-wrap">
                        <el-icon class="bookmark-panel__folder-icon">
                          <folder />
                        </el-icon>
                      </div>
                    <div class="bookmark-panel__folder-info">
                      <span class="bookmark-panel__folder-name">
                        {{ folder.title || t('bookmarkMenu.untitledFolder') }}
                      </span>
                    </div>
                  </button>
                </div>
                  <p v-else class="bookmark-panel__empty">{{ t('bookmarkMenu.empty') }}</p>

                  <div v-if="currentBookmarks.length" class="bookmark-panel__bookmark-list">
                    <button
                      v-for="bookmark in currentBookmarks"
                      :key="bookmark.id"
                      type="button"
                      class="bookmark-panel__bookmark-item"
                      @click="openBookmark(bookmark.url!)"
                    >
                      <span>{{ bookmark.title || bookmark.url }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </template>
        </div>
      </section>
    </transition>
  </div>

  <el-dialog
    v-model="editDialogVisible"
    :title="editDialogTitle"
    width="500px"
    custom-class="bookmark-edit-modal"
  >
    <el-form :model="editForm" label-width="80px">
      <el-form-item :label="t('bookmarkMenu.name')">
        <el-input v-model="editForm.title" :placeholder="t('bookmarkMenu.namePlaceholder')" />
      </el-form-item>
      <el-form-item v-if="shouldShowUrlField" :label="t('bookmarkMenu.url')">
        <el-input v-model="editForm.url" :placeholder="t('bookmarkMenu.urlPlaceholder')" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editDialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="saveBookmark">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="deleteDialogVisible"
    :title="t('common.warning')"
    width="500px"
    custom-class="bookmark-edit-modal"
  >
    <div class="bookmark-delete-content">
      {{ t('bookmarkMenu.deleteConfirm', { title: deleteNode?.title || '' }) }}
    </div>
    <template #footer>
      <el-button @click="deleteDialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmDelete">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>

  <teleport to="body">
    <div
      v-if="folderContextMenu.visible"
      class="bookmark-context-backdrop"
      @click="hideFolderContextMenu"
      @contextmenu.prevent="hideFolderContextMenu"
    ></div>
    <transition name="context-fade">
      <div
        v-if="folderContextMenu.visible && folderContextMenu.folder"
        class="bookmark-context-menu"
        :style="{
          left: `${folderContextMenu.x}px`,
          top: `${folderContextMenu.y}px`
        }"
        @click.stop
      >
        <div class="bookmark-context-menu__item" @click="handleFolderMenuAction('edit')">
          <el-icon class="bookmark-context-menu__item-icon">
            <edit-icon />
          </el-icon>
          <span>{{ t('common.edit') }}</span>
        </div>
        <div
          class="bookmark-context-menu__item bookmark-context-menu__item--danger"
          @click="handleFolderMenuAction('delete')"
        >
          <el-icon class="bookmark-context-menu__item-icon">
            <delete-icon />
          </el-icon>
          <span>{{ t('common.delete') }}</span>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped lang="scss">
.bookmark-inline-area {
  width: 100%;
  min-height: 180px;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
}

.bookmark-panel {
  width: min(860px, 100%);
  padding: 20px 28px 28px;
  background: rgb(255 255 255 / 86%);
  border-radius: 20px;
  border: 1px solid rgb(255 255 255 / 30%);
  box-shadow:
    0 20px 45px rgb(15 23 42 / 15%),
    0 5px 15px rgb(15 23 42 / 8%);
  -webkit-backdrop-filter: blur(var(--bookmark-glass-blur, 20px)) saturate(180%);
  backdrop-filter: blur(var(--bookmark-glass-blur, 20px)) saturate(180%);

  html.dark & {
    background: rgb(25 25 25 / 88%);
    border-color: rgb(255 255 255 / 10%);
  }

  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.bookmark-panel__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.bookmark-panel__title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.bookmark-panel__circle-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(-2px);
  }

  html.dark & {
    background: rgb(255 255 255 / 12%);
    color: #fff;
  }

  position: absolute;
  left: 0;
}

.bookmark-panel__subtitle {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.bookmark-panel__title {
  margin: 4px 0 0;
  font-size: 22px;
}

.bookmark-panel__actions {
  display: flex;
  gap: 12px;
  align-items: center;
  position: absolute;
  right: 0;
}

.bookmark-panel__icon {
  font-size: 18px;
  cursor: pointer;
  color: var(--el-text-color-primary);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
    color: var(--el-color-primary);
  }
}

.bookmark-panel__search {
  margin-top: 18px;
}

.bookmark-panel__body {
  margin-top: 18px;
  min-height: 220px;
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
}

.bookmark-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.bookmark-context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 150px;
  overflow: hidden;
  background: rgb(255 255 255 / 95%);
  border: 1px solid rgb(0 0 0 / 10%);
  border-radius: 8px;
  box-shadow:
    0 4px 16px 0 rgb(0 0 0 / 10%),
    0 2px 4px -1px rgb(0 0 0 / 6%);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);

  html.dark & {
    background: rgb(40 40 40 / 95%);
    border-color: rgb(255 255 255 / 10%);
  }
}

.bookmark-context-menu__item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: rgb(0 0 0 / 5%);

    html.dark & {
      background-color: rgb(255 255 255 / 5%);
    }
  }

  &--danger {
    color: var(--el-color-danger);

    &:hover {
      background-color: rgb(245 108 108 / 10%);
    }
  }

  &-icon {
    font-size: 16px;
  }

  span {
    flex: 1;
    text-align: left;
  }
}

.context-fade-enter-active,
.context-fade-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.context-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.context-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

:global(.bookmark-edit-modal) {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 60%);
  box-shadow:
    0 20px 45px rgb(15 23 42 / 20%),
    0 8px 20px rgb(15 23 42 / 8%);

  .el-dialog__header {
    padding: 16px 24px;
    border-bottom: 1px solid rgb(0 0 0 / 6%);
    justify-content: center;
  }

  .el-dialog__title {
    font-weight: 600;
    font-size: 16px;
  }

  .el-dialog__body {
    padding: 24px;
  }

  .el-dialog__footer {
    padding: 0 24px 24px;
  }

  .el-button + .el-button {
    margin-left: 10px;
  }

  .el-dialog__footer .el-button {
    min-width: 72px;
    border-radius: 999px;
  }
}

.bookmark-delete-content {
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.6;
}

.bookmark-panel__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.bookmark-panel__loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--el-color-primary-light-4);
  border-top-color: transparent;
  border-radius: 50%;
  animation: bookmark-panel__spin 1s linear infinite;
}

@keyframes bookmark-panel__spin {
  to {
    transform: rotate(360deg);
  }
}

.bookmark-panel__folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
}

.bookmark-panel__folder-card {
  border-radius: 18px;
  padding: 24px 12px;
  border: 1px dashed rgb(255 255 255 / 60%);
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border 0.2s ease,
    background 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgb(255 255 255 / 80%);
  }

  html.dark & {
    border-color: rgb(255 255 255 / 25%);

    &:hover {
      border-color: rgb(255 255 255 / 40%);
    }
  }
}

.bookmark-panel__folder-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  background: rgb(255 255 255 / 18%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bookmark-panel__folder-icon {
  font-size: 26px;
  color: var(--el-color-warning-dark-2);
}

.bookmark-panel__folder-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  line-height: 1.3;
}

.bookmark-panel__folder-name {
  font-weight: 600;
  font-size: 15px;
}

.bookmark-panel__bookmark-list {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.bookmark-panel__bookmark-item {
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  background: rgb(0 0 0 / 5%);
  cursor: pointer;
  color: var(--el-text-color-primary);
  transition: background 0.2s ease;

  &:hover {
    background: var(--el-color-primary-light-9);
  }

  html.dark & {
    background: rgb(255 255 255 / 10%);

    &:hover {
      background: rgb(255 255 255 / 25%);
    }
  }
}

.bookmark-panel__tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bookmark-panel__empty {
  margin: 32px 0;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.bookmark-panel__search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bookmark-panel__search-item {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgb(0 0 0 / 4%);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;

  &.active,
  &:hover {
    transform: translateX(4px);
    background: var(--el-color-primary-light-9);
  }

  html.dark & {
    background: rgb(255 255 255 / 10%);
  }
}

.bookmark-panel__search-item-title {
  font-weight: 600;
}

.bookmark-panel__search-item-url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-panel-fade-enter-active,
.bookmark-panel-fade-leave-active {
  transition: opacity 0.25s ease;
}

.bookmark-panel-fade-enter-from,
.bookmark-panel-fade-leave-to {
  opacity: 0;
}

.bookmark-panel-slide-enter-active,
.bookmark-panel-slide-leave-active {
  transition: opacity 0.25s ease;
}

.bookmark-panel-slide-enter-from,
.bookmark-panel-slide-leave-to {
  opacity: 0;
}
</style>
