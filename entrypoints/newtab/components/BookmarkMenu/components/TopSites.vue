<template>
  <div v-if="sites.length > 0" class="top-sites">
    <div class="top-sites__container">
      <!-- 星标标题 -->
      <div class="top-sites__header">
        <StarRound class="top-sites__star-icon" />
        <span class="top-sites__title">常用网站</span>
      </div>
      
      <!-- 胶囊按钮列表 - "呼吸感幽灵形态" (Breathing Ghost Style) -->
      <div class="top-sites__list">
        <button 
          v-for="site in sites"
          :key="site.url"
          class="site-pill"
          :title="site.title || site.url"
          @click="handleClick(site)"
          @contextmenu="handleContextMenu($event, site)"
        >
          <div class="site-pill__icon">
            <img 
              v-if="getFaviconUrl(site)"
              :src="getFaviconUrl(site)" 
              :alt="site.title"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
            />
            <div v-else class="site-pill__placeholder" :style="{ backgroundColor: stringToColor(site.title || site.url) }">
              {{ (site.title || site.url || '?').charAt(0).toUpperCase() }}
            </div>
          </div>
          <span class="site-pill__name">{{ site.title || site.url }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import type { VisitRecord } from '@newtab/scripts/visitTracker'
import StarRound from '@vicons/material/es/StarRound'

const props = defineProps<{
  sites: VisitRecord[]
}>()

const emit = defineEmits<{
  click: [site: VisitRecord]
  hide: [url: string]
}>()

function handleClick(site: VisitRecord) {
  emit('click', site)
}

function handleContextMenu(event: MouseEvent, site: VisitRecord) {
  event.preventDefault()
  emit('hide', site.url)
}

function getFaviconUrl(site: VisitRecord): string {
  if (site.favicon) return site.favicon
  
  try {
    const domain = new URL(site.url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  } catch {
    return ''
  }
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

watchEffect(() => {
  console.log('[TopSites Debug] Breathing Ghost Style', {
    sitesLength: props.sites.length
  })
})
</script>

<style lang="scss" scoped>
.top-sites {
  margin-bottom: 16px;

  &__container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: center; // 居中对齐
    gap: 6px;
    padding: 0 4px;
  }

  &__star-icon {
    width: 18px;
    height: 18px;
    color: #f5b800;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  &__title {
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
    opacity: 0.8;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center; // 居中对齐
    gap: 8px;
    padding: 0 4px;
  }
}

/**
 * 呼吸感幽灵形态 (Breathing Ghost Style)
 * 设计理念：静若处子，动若脱兔
 * - 静止态：低存在感的幽灵按钮，不与背景争抢视觉
 * - 悬停态：瞬间实体化，高强度反馈
 */
.site-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.15); // 纤细的半透明灰线勾勒轮廓
  border-radius: 12px; // R12 圆角矩形
  background: rgba(255, 255, 255, 0.08); // 几乎全透明，让壁纸纹理透传
  backdrop-filter: blur(4px); // 轻微模糊，增强层次
  cursor: pointer;
  font-family: inherit;
  
  // 弹性动画曲线 - 模拟物理弹性
  transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  // Transform origin bottom - 底部中心缩放，向上生长
  transform-origin: center bottom;
  
  html.dark & {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }

  // 悬停状态 - "实体化变形" (Solid Transformation)
  &:hover {
    // 瞬间变为不透明的纯白实体
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(0, 0, 0, 0.1);
    
    // 深远的弥散阴影 - 营造悬浮感
    box-shadow: 
      0 8px 24px rgba(0, 0, 0, 0.12),
      0 4px 12px rgba(0, 0, 0, 0.08);
    
    // 向上位移 + 整体放大1.15倍 - 模拟气球上浮
    transform: translateY(-4px) scale(1.15);
    
    // 层级跃升 - 防止遮挡
    z-index: 10;
    
    html.dark & {
      background: rgba(40, 40, 40, 0.95);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.4),
        0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }

  // 按下状态 - 阻尼感回弹
  &:active {
    transform: translateY(-2px) scale(1.08);
    transition-duration: 0.1s;
  }

  &__icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  &__name {
    font-size: 13px;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
  }
}
</style>
