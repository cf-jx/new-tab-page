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
import ArrowDown from '@vicons/material/es/KeyboardArrowDownRound'
import { useTranslation } from 'i18next-vue'
import { browser } from 'wxt/browser'
import Fuse from 'fuse.js'
import { VueDraggable } from 'vue-draggable-plus'

import { getBookmarkFolders, type ChromeBookmarkNode } from '@/shared/chromeBookmarks'
import { useSettingsStore } from '@/shared/settings'



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

// 限制显示的书签：如果未展开且数量大于10，只显示前10个
const limitedBookmarks = computed(() => {
  if (isExpanded.value) return currentBookmarks.value
  return currentBookmarks.value.slice(0, 10)
})

const hasMoreBookmarks = computed(() => {
  return !isExpanded.value && currentBookmarks.value.length > 10
})

const localFolders = ref<ChromeBookmarkNode[]>([])
const isDragging = ref(false)

watch(currentFolders, (newVal) => {
  localFolders.value = [...newVal]
}, { immediate: true })

// 智能网格布局算法：Bento 重点法 + 自适应
const getGridStyle = (index: number, total: number) => {
  // 拖拽过程中，强制所有元素为标准大小，防止布局错乱
  if (isDragging.value) return { gridColumn: 'span 3' }

  // 1-4个：平分一行
  if (total === 1) return { gridColumn: 'span 12' }
  if (total === 2) return { gridColumn: 'span 6' }
  if (total === 3) return { gridColumn: 'span 4' }
  if (total === 4) return { gridColumn: 'span 3' }

  const remainder = total % 4
  
  // 方案 B：Bento 重点法 (余1)
  // 第一个元素 2x2 (span 6, span 2 rows)
  if (remainder === 1) {
    if (index === 0) {
      return { gridColumn: 'span 6', gridRow: 'span 2' }
    }
    return { gridColumn: 'span 3' }
  }

  // 余2：第一行2个（中等），后面全部4个
  if (remainder === 2) {
    return { gridColumn: index < 2 ? 'span 6' : 'span 3' }
  }

  // 余3：第一行3个（稍宽），后面全部4个
  if (remainder === 3) {
    return { gridColumn: index < 3 ? 'span 4' : 'span 3' }
  }
  
  return { gridColumn: 'span 3' }
}

const onDragStart = () => {
  isDragging.value = true
}

const onDragEnd = async () => {
  isDragging.value = false
  // 简单的持久化：将文件夹移动到列表最前面
  // 注意：这假设用户希望文件夹都在书签前面
  try {
    for (let i = 0; i < localFolders.value.length; i++) {
      const folder = localFolders.value[i]
      if (folder) {
        await browser.bookmarks.move(folder.id, { index: i })
      }
    }
    // 刷新数据以确保一致性
    // refresh() // 暂时不刷新，以免闪烁，本地状态已经更新
  } catch (e) {
    console.error('Failed to reorder bookmarks:', e)
  }
}

// 初始化拖拽 - 移除 hook 方式，改用组件方式
// useDraggable(folderGridRef, localFolders, { ... })

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

// 折叠/展开状态
const isExpanded = ref(false)

// 监听文件夹变化，重置折叠状态
watch(currentFolder, () => {
  isExpanded.value = false
})
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
  
  // 保存当前文件夹栈的ID路径
  const currentFolderIds = folderStack.value.map(folder => folder.id)
  
  const folders = await getBookmarkFolders()
  const bookmarksBar = folders.find((folder) => folder.id === '1')
  bookmarkTree.value = bookmarksBar?.children ?? []
  
  // 重建文件夹栈
  if (currentFolderIds.length > 0) {
    folderStack.value = []
    let currentNodes = bookmarkTree.value
    
    for (const folderId of currentFolderIds) {
      const folder = currentNodes.find(node => node.id === folderId)
      if (folder && folder.children) {
        folderStack.value.push(folder)
        currentNodes = folder.children
      } else {
        // 如果找不到文件夹（可能被删除了），返回到能找到的最后一级
        break
      }
    }
  } else {
    folderStack.value = []
  }
  
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
  hideContextMenu()
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
    } else if (editMode.value === 'addFolder') {
      await browser.bookmarks.create({
        parentId: editParentId.value,
        title: editForm.value.title
      })
    } else if (editMode.value === 'addChild') {
      await browser.bookmarks.create({
        parentId: editParentId.value,
        title: editForm.value.title,
        url: editForm.value.url
      })
    } else if (editMode.value === 'addChildFolder') {
      await browser.bookmarks.create({
        parentId: editParentId.value,
        title: editForm.value.title
      })
    } else if (editMode.value === 'edit' && editingNode.value) {
      const payload: { title: string; url?: string } = {
        title: editForm.value.title
      }
      if (shouldShowUrlField.value) {
        payload.url = editForm.value.url || undefined
      }
      await browser.bookmarks.update(editingNode.value.id, payload)
    }

    editDialogVisible.value = false
    await refresh()
  } catch (error) {
    console.error('Save bookmark failed:', error)
    ElMessage.error(t('bookmarkMenu.saveError'))
  }
}

function showContextMenu(event: MouseEvent, node: ChromeBookmarkNode) {
  event.preventDefault()
  event.stopPropagation()
  folderContextMenu.visible = true
  folderContextMenu.folder = node
  folderContextMenu.x = event.clientX
  folderContextMenu.y = event.clientY
  
  document.addEventListener('click', hideContextMenu)
  document.addEventListener('contextmenu', hideContextMenu)
}

function hideContextMenu() {
  folderContextMenu.visible = false
  folderContextMenu.folder = null
  document.removeEventListener('click', hideContextMenu)
  document.removeEventListener('contextmenu', hideContextMenu)
}

function handleMenuAction(action: 'edit' | 'delete') {
  const node = folderContextMenu.folder
  hideContextMenu()
  if (!node) return
  if (action === 'edit') {
    showEditBookmark(node)
  } else {
    void deleteBookmark(node)
  }
}

function showDeleteConfirm(node: ChromeBookmarkNode) {
  deleteNode.value = node
  deleteDialogVisible.value = true
}

async function confirmDelete() {
  if (!deleteNode.value) return

  const isFolder = !deleteNode.value.url

  try {
    if (deleteNode.value.children && deleteNode.value.children.length > 0) {
      await browser.bookmarks.removeTree(deleteNode.value.id)
    } else {
      await browser.bookmarks.remove(deleteNode.value.id)
    }

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
  document.removeEventListener('click', hideContextMenu)
  document.removeEventListener('contextmenu', hideContextMenu)
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
          <div class="bookmark-panel__actions">
            <el-tooltip placement="top">
              <template #content>
                {{ currentFolder ? t('bookmarkMenu.goBack') : t('bookmarkMenu.close') }}
              </template>
              <div class="mac-icon close" @click="currentFolder ? goBack() : hidePanel()">
                <el-icon>
                  <arrow-back v-if="currentFolder" />
                  <close v-else />
                </el-icon>
              </div>
            </el-tooltip>
            <el-tooltip placement="top">
              <template #content>
                {{ t('bookmarkMenu.refresh') }}
              </template>
              <div class="mac-icon refresh" @click.stop="refresh">
                <el-icon>
                  <refresh-icon />
                </el-icon>
              </div>
            </el-tooltip>
            <el-tooltip placement="top">
              <template #content>
                {{ currentFolder ? t('bookmarkMenu.addBookmark') : t('bookmarkMenu.addFolder') }}
              </template>
              <div class="mac-icon folder" @click.stop="currentFolder ? showAddBookmark() : showAddFolder()">
                <el-icon>
                  <add v-if="currentFolder" />
                  <folder v-else />
                </el-icon>
              </div>
            </el-tooltip>
          </div>

          <div class="bookmark-panel__title-group">
            <h3 class="bookmark-panel__title">
              {{ currentFolder?.title || t('bookmarkMenu.title') }}
            </h3>
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

        <div class="bookmark-panel__body" :class="{ 'is-expanded': isExpanded && !isSearching }">
          <transition name="fade" mode="out-in">
            <div v-if="loading" class="bookmark-panel__loading">
              <div class="loading-spinner"></div>
            </div>
            
            <!-- 搜索结果 -->
            <div v-else-if="isSearching" class="bookmark-panel__search-results">
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

            <!-- 正常内容 -->
            <div v-else class="bookmark-panel__content">
              <!-- 文件夹网格 -->
              <VueDraggable
                v-if="localFolders.length"
                v-model="localFolders"
                class="bookmark-panel__folder-grid"
                :animation="150"
                :delay="200"
                :fallback-tolerance="5"
                handle=".bookmark-panel__folder-icon-wrap"
                @start="onDragStart"
                @end="onDragEnd"
              >
                <div
                  v-for="(folder, index) in localFolders"
                  :key="folder.id"
                  role="button"
                  class="bookmark-panel__folder-card"
                  :style="getGridStyle(index, localFolders.length)"
                  @click="enterFolder(folder)"
                  @contextmenu="showContextMenu($event, folder)"
                >
                  <div class="bookmark-panel__folder-icon-wrap">
                    <Folder class="bookmark-panel__folder-icon" />
                  </div>
                  <div class="bookmark-panel__folder-info">
                    <div class="bookmark-panel__folder-name" :title="folder.title">
                      {{ folder.title }}
                    </div>
                  </div>
                </div>
              </VueDraggable>

              <!-- 书签列表 -->
              <div v-if="currentBookmarks.length" class="bookmark-panel__bookmark-list">
                <button
                  v-for="bookmark in limitedBookmarks"
                  :key="bookmark.id"
                  type="button"
                  class="bookmark-panel__bookmark-item"
                  :title="bookmark.title || bookmark.url"
                  @click="openBookmark(bookmark.url!)"
                  @contextmenu="showContextMenu($event, bookmark)"
                >
                  <div class="bookmark-panel__bookmark-info">
                    <span class="bookmark-panel__bookmark-title">{{ bookmark.title || bookmark.url }}</span>
                    <span class="bookmark-panel__bookmark-url">{{ bookmark.url }}</span>
                  </div>
                </button>
              </div>
              
              <!-- 展开更多按钮 -->
              <div v-if="hasMoreBookmarks" class="bookmark-panel__expand-btn" @click="isExpanded = true">
                <span>显示更多 ({{ currentBookmarks.length - 10 }})</span>
                <el-icon><arrow-down /></el-icon>
              </div>
              
              <p v-if="!currentFolders.length && !currentBookmarks.length" class="bookmark-panel__empty">
                {{ t('bookmarkMenu.empty') }}
              </p>
            </div>
          </transition>
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
      @click="hideContextMenu"
      @contextmenu.prevent="hideContextMenu"
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
        <div class="bookmark-context-menu__item" @click="handleMenuAction('edit')">
          <el-icon class="bookmark-context-menu__item-icon">
            <edit-icon />
          </el-icon>
          <span>{{ t('common.edit') }}</span>
        </div>
        <div
          class="bookmark-context-menu__item bookmark-context-menu__item--danger"
          @click="handleMenuAction('delete')"
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 180px;
  margin-top: 24px;
}

.bookmark-panel {

  display: flex;
  flex-direction: column;
  width: min(860px, 100%);
  max-height: 80vh;
  padding: 20px 28px 28px;
  background: rgb(255 255 255 / 86%);
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 20px;
  box-shadow:
    0 20px 45px rgb(15 23 42 / 15%),
    0 5px 15px rgb(15 23 42 / 8%);
  -webkit-backdrop-filter: blur(var(--bookmark-glass-blur, 20px)) saturate(180%);
  backdrop-filter: blur(var(--bookmark-glass-blur, 20px)) saturate(180%);

  html.dark & {
    background: rgb(25 25 25 / 88%);
    border-color: rgb(255 255 255 / 10%);
  }
}

.bookmark-panel__header {
  position: relative;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
}

.bookmark-panel__title-group {
  display: flex;
  gap: 12px;
  align-items: center;
  text-align: center;
}

.bookmark-panel__circle-btn {

  position: absolute;
  right: 24px;
  left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--el-color-primary);
  cursor: pointer;
  background: var(--el-color-primary-light-9);
  border: none;
  border-radius: 50%;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(-2px);
  }

  html.dark & {
    color: #fff;
    background: rgb(255 255 255 / 12%);
  }
}

.bookmark-panel__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.bookmark-panel__title {
  margin: 4px 0 0;
  font-size: 22px;
  width: 100%;
  text-align: center;
}

.bookmark-panel__actions {
  position: absolute;
  top: 8px;
  left: 12px;
  right: auto;
  display: flex;
  gap: 6px;
  align-items: center;
}

.mac-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  font-size: 8px;
  color: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;

  &.close {
    background-color: #ff5f56;
  }

  &.refresh {
    background-color: #ffbd2e;
  }

  &.folder {
    background-color: #27c93f;
  }

  &:hover {
    color: rgb(0 0 0 / 60%);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%);
  }

  .el-icon {
    width: 100%;
    height: 100%;
  }
}


.bookmark-panel__icon {
  font-size: 18px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    color: var(--el-color-primary);
    transform: scale(1.1);
  }
}

.bookmark-panel__search {
  margin-top: 18px;

  :deep(.el-input__wrapper) {
    justify-content: center;
  }

  :deep(.el-input__inner) {
    text-align: center;
  }
}

.bookmark-panel__body {
  flex: 1;
  min-height: 200px;
  margin-top: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  
  /* 默认状态：无遮罩，无高度限制（因为内容少） */
  
  /* 展开状态：应用高度限制和遮罩 */
  &.is-expanded {
    max-height: 55vh;
    padding-bottom: 20px;
    
    /* 底部渐变遮罩 */
    mask-image: linear-gradient(to bottom, black calc(100% - 40px), transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 40px), transparent 100%);

    /* 滚动条样式 */
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: rgb(0 0 0 / 20%);

      &:hover {
        background: rgb(0 0 0 / 40%);
      }
    }

    html.dark & {
      &:hover::-webkit-scrollbar-thumb {
        background: rgb(255 255 255 / 20%);

        &:hover {
          background: rgb(255 255 255 / 40%);
        }
      }
    }
  }
}

.bookmark-panel__expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px 0;
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  html.dark & {
    &:hover {
      background: rgb(255 255 255 / 10%);
    }
  }
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

.bookmark-delete-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}

.bookmark-panel__loading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
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
  grid-template-columns: repeat(12, 1fr); /* 12列网格系统 */
  grid-auto-flow: row dense; /* 关键：允许自动填补空隙 */
  gap: 14px;
  width: 100%;
}

.bookmark-panel__folder-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  width: 100%; /* 填满网格单元 */
  min-height: 120px; /* 保证高度一致 */
  padding: 24px 12px;
  text-align: center;
  cursor: pointer;
  user-select: none; /* 防止拖拽时选中文字 */
  background: rgb(255 255 255 / 40%);
  border: 1px solid rgb(255 255 255 / 40%);
  border-radius: 18px;
  transition:
    transform 0.2s ease,
    border 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;

  &.is-wide {
    /* 废弃，由 gridColumn 动态控制 */
  }

  /* 当 span 大于 3 (即宽度大于 25%) 时，改为横向布局 */
  &[style*="span 4"],
  &[style*="span 6"],
  &[style*="span 12"] {
    flex-direction: row;
    gap: 16px;
    padding-left: 24px;
    padding-right: 24px;
    
    .bookmark-panel__folder-info {
      text-align: left;
      flex: 1;
    }

    .bookmark-panel__folder-name {
      font-size: 14px;
      font-weight: 600;
    }
  }

  /* 拖拽时的样式 */
  &.sortable-ghost {
    opacity: 0.5;
    background: rgb(255 255 255 / 20%);
  }

  &.sortable-drag {
    cursor: grabbing;
    background: rgb(255 255 255 / 90%);
    transform: scale(1.05);
    box-shadow: 0 12px 32px rgb(0 0 0 / 20%);
    z-index: 10;
    
    /* 拖拽时的文字提示 */
    &::after {
      content: "松开排序";
      position: absolute;
      bottom: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      animation: fadeIn 0.2s ease;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, 5px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  &:hover {
    background: rgb(255 255 255 / 60%);
    border-color: rgb(255 255 255 / 80%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgb(0 0 0 / 5%);
  }

  html.dark & {
    background: rgb(255 255 255 / 5%);
    border-color: rgb(255 255 255 / 8%);

    .bookmark-panel__folder-name {
      color: rgb(255 255 255 / 90%); /* 深色模式文字变白 */
    }

    &:hover {
      background: rgb(255 255 255 / 10%);
      border-color: rgb(255 255 255 / 15%);
      box-shadow: 0 4px 12px rgb(0 0 0 / 20%);
    }
  }
}

.bookmark-panel__folder-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgb(255 255 255 / 50%);
  border-radius: 14px;
  color: #f5b800;
  font-size: 24px;
  flex-shrink: 0; /* 防止图标被压缩 */
  cursor: grab; /* 提示可拖拽 */
  position: relative; /* 为提示文字定位 */

  /* 长按时的提示 */
  &:active::after {
    content: "拖拽排序";
    position: absolute;
    top: -32px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 20;
    animation: fadeIn 0.2s ease;
  }

  &:active {
    cursor: grabbing;
  }

  html.dark & {
    background: rgb(255 255 255 / 10%);
    color: #ffd700;
  }
}

.bookmark-panel__folder-icon {
  font-size: 26px;
  color: var(--el-color-warning-dark-2);
}

.bookmark-panel__folder-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  width: 100%;
}

.bookmark-panel__folder-name {
  font-size: 13px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.bookmark-panel__bookmark-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 12px;
}

.bookmark-panel__bookmark-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgb(0 0 0 / 4%);
  }

  html.dark & {
    &:hover {
      background: rgb(255 255 255 / 6%);
    }
  }
}

.bookmark-panel__bookmark-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  text-align: left;
}

.bookmark-panel__bookmark-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-panel__bookmark-url {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
}

.bookmark-panel__tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bookmark-panel__empty {
  margin: 32px 0;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.bookmark-panel__search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bookmark-panel__search-item {
  padding: 10px 14px;
  cursor: pointer;
  background: rgb(0 0 0 / 4%);
  border-radius: 12px;
  transition:
    transform 0.2s ease,
    background 0.2s ease;

  &.active,
  &:hover {
    background: var(--el-color-primary-light-9);
    transform: translateX(4px);
  }

  html.dark & {
    background: rgb(255 255 255 / 10%);
  }
}

.bookmark-panel__search-item-title {
  font-weight: 600;
}

.bookmark-panel__search-item-url {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-secondary);
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
