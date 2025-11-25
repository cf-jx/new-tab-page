<script setup lang="ts">
import { computed } from 'vue'
import type { VisitRecord } from '@newtab/scripts/visitTracker'

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
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ''
  }
}
</script>

<template>
  <div v-if="sites.length > 0" class="top-sites">
    <div class="top-sites__header">
      <span class="header-icon">⭐</span>
      <span class="header-title">常用网站</span>
    </div>
    
    <div class="top-sites__grid">
      <div
        v-for="site in sites"
        :key="site.url"
        class="site-card"
        @click="handleClick(site)"
        @contextmenu="handleContextMenu($event, site)"
      >
        <div class="site-favicon">
          <img 
            :src="getFaviconUrl(site)" 
            :alt="site.title"
            @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
          />
        </div>
        <div class="site-info">
          <div class="site-title">{{ site.title }}</div>
          <div class="site-count">{{ site.visitCount }} 次访问</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.top-sites {
  margin-bottom: 24px;
  
  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 0 4px;
    
    .header-icon {
      font-size: 18px;
    }
    
    .header-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      opacity: 0.9;
    }
  }
  
  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    
    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

.site-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(245, 184, 0, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.site-favicon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
}

.site-info {
  width: 100%;
  text-align: center;
}

.site-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.site-count {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  opacity: 0.7;
}
</style>
