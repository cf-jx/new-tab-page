<script setup lang="ts">
import { Folder20Regular as Folder, Document20Regular as Document } from '@vicons/fluent'
import { KeyboardArrowRightRound as ArrowRight, EditRound as Edit, DeleteRound as Delete } from '@vicons/material'

import { isFolder, getNodeFavicon, type ChromeBookmarkNode } from '@/shared/chromeBookmarks'

interface Props {
  node: ChromeBookmarkNode
  level: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  closeMenu: []
  edit: [node: ChromeBookmarkNode]
  delete: [node: ChromeBookmarkNode]
  addChild: [node: ChromeBookmarkNode]
  addChildFolder: [node: ChromeBookmarkNode]
}>()

const expanded = ref(false)
const isNodeFolder = computed(() => isFolder(props.node))
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

/**
 * 切换文件夹展开/折叠
 */
function toggleExpand() {
  if (isNodeFolder.value) {
    expanded.value = !expanded.value
  }
}

/**
 * 打开书签链接
 */
function openBookmark(url: string) {
  if (url) {
    window.open(url, '_blank')
    emit('closeMenu')
  }
}

/**
 * 处理点击事件
 */
function handleClick() {
  if (isNodeFolder.value) {
    toggleExpand()
  } else if (props.node.url) {
    openBookmark(props.node.url)
  }
}

/**
 * 处理右键菜单
 */
function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()

  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  contextMenuVisible.value = true

  // 点击其他地方关闭右键菜单
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu)
  }, 0)
}

/**
 * 关闭右键菜单
 */
function closeContextMenu() {
  contextMenuVisible.value = false
  document.removeEventListener('click', closeContextMenu)
}

/**
 * 编辑书签
 */
function handleEdit() {
  emit('edit', props.node)
  closeContextMenu()
}

/**
 * 删除书签
 */
function handleDelete() {
  emit('delete', props.node)
  closeContextMenu()
}

/**
 * 添加子书签
 */
function handleAddChild() {
  emit('addChild', props.node)
  closeContextMenu()
}

/**
 * 添加子文件夹
 */
function handleAddChildFolder() {
  emit('addChildFolder', props.node)
  closeContextMenu()
}

/**
 * 获取缩进样式
 */
const indentStyle = computed(() => ({
  paddingLeft: `${props.level * 16 + 12}px`
}))

/**
 * 获取 favicon
 */
const favicon = computed(() => {
  if (isNodeFolder.value) {
    return null
  }
  return getNodeFavicon(props.node)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<template>
  <div class="bookmark-tree-item">
    <div
      class="bookmark-tree-item__row"
      :class="{ 'bookmark-tree-item__row--folder': isNodeFolder }"
      :style="indentStyle"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <!-- 文件夹展开/折叠箭头 -->
      <el-icon
        v-if="isNodeFolder"
        class="bookmark-tree-item__arrow"
        :class="{ 'bookmark-tree-item__arrow--expanded': expanded }"
      >
        <arrow-right />
      </el-icon>

      <!-- 图标 -->
      <el-icon v-if="isNodeFolder" class="bookmark-tree-item__icon bookmark-tree-item__icon--folder">
        <folder />
      </el-icon>
      <img
        v-else-if="favicon"
        :src="favicon"
        class="bookmark-tree-item__favicon"
        @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
      />
      <el-icon v-else class="bookmark-tree-item__icon">
        <document />
      </el-icon>

      <!-- 标题 -->
      <span class="bookmark-tree-item__title">{{ node.title || '(无标题)' }}</span>
    </div>

    <!-- 子节点 -->
    <transition name="expand">
      <div v-if="isNodeFolder && expanded && node.children" class="bookmark-tree-item__children">
        <bookmark-tree-item
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :level="level + 1"
          @close-menu="emit('closeMenu')"
          @edit="(node) => emit('edit', node)"
          @delete="(node) => emit('delete', node)"
          @add-child="(node) => emit('addChild', node)"
          @add-child-folder="(node) => emit('addChildFolder', node)"
        />
      </div>
    </transition>

    <!-- 右键菜单 -->
    <teleport to="body">
      <transition name="context-fade">
        <div
          v-if="contextMenuVisible"
          class="bookmark-context-menu"
          :style="{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`
          }"
          @click.stop
        >
          <!-- 文件夹可以添加子项 -->
          <template v-if="isNodeFolder">
            <div class="bookmark-context-menu__item" @click="handleAddChild">
              <el-icon><document /></el-icon>
              <span>添加子书签</span>
            </div>
            <div class="bookmark-context-menu__item" @click="handleAddChildFolder">
              <el-icon><folder /></el-icon>
              <span>添加子文件夹</span>
            </div>
            <div class="bookmark-context-menu__divider"></div>
          </template>

          <div class="bookmark-context-menu__item" @click="handleEdit">
            <el-icon><edit /></el-icon>
            <span>编辑</span>
          </div>
          <div class="bookmark-context-menu__item bookmark-context-menu__item--danger" @click="handleDelete">
            <el-icon><delete /></el-icon>
            <span>删除</span>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<style scoped lang="scss">
.bookmark-tree-item {
  &__row {
    display: flex;
    align-items: center;
    height: 36px;
    padding-right: 12px;
    margin: 2px 8px;
    color: var(--el-text-color-primary);
    cursor: pointer;
    user-select: none;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      background-color: rgb(0 0 0 / 5%);
    }

    &:active {
      background-color: rgb(0 0 0 / 8%);
    }

    &--folder {
      font-weight: 500;
    }

    html.dark & {
      &:hover {
        background-color: rgb(255 255 255 / 5%);
      }

      &:active {
        background-color: rgb(255 255 255 / 8%);
      }
    }
  }

  &__arrow {
    flex-shrink: 0;
    margin-right: 4px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    transition: transform 0.25s ease;

    &--expanded {
      transform: rotate(90deg);
    }
  }

  &__icon {
    flex-shrink: 0;
    margin-right: 10px;
    font-size: 18px;
    color: var(--el-text-color-secondary);

    &--folder {
      color: var(--el-color-warning);
    }
  }

  &__favicon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-right: 10px;
    object-fit: contain;
  }

  &__title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
    white-space: nowrap;
  }

  &__children {
    overflow: hidden;
  }
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

  &__item {
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

    .el-icon {
      font-size: 16px;
    }
  }

  &__divider {
    height: 1px;
    margin: 4px 0;
    background-color: rgb(0 0 0 / 10%);

    html.dark & {
      background-color: rgb(255 255 255 / 10%);
    }
  }
}

.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 2000px;
  opacity: 1;
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
</style>
