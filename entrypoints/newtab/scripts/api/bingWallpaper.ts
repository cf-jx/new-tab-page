
import { isImageFile, verifyImageUrl } from '@/shared/media'
import enhancedFetch from '@/shared/network/fetch'
import { saveSettings, useBingWallpaperStore, useSettingsStore } from '@/shared/settings'

interface BingWallpaperResp {
  images: {
    startdate: string
    fullstartdate: string
    enddate: string
    url: string
    urlbase: string
    copyright: string
    copyrightlink: string
    title: string
    quiz: string
    wp: boolean
    hsh: string
    drk: number
    top: number
    bot: number
    hs: unknown[]
  }[]
  tooltips: {
    loading: string
    previous: string
    next: string
    walle: string
    walls: string
  }
}

export async function getBingWallpaperURL() {
  const settings = useSettingsStore()
  if (settings.bingBackground.updateDate === new Date().toDateString()) {
    const { id } = settings.bingBackground
    const file = await useBingWallpaperStore.getItem<Blob>(id)

    // 校验图片数据是否可用，否则删除该数据
    if (file && isImageFile(file)) {
      const url = URL.createObjectURL(file)
      if (await verifyImageUrl(url)) {
        return url
      }
    }

    URL.revokeObjectURL(settings.bingBackground.url)
    settings.bingBackground.id = ''
    settings.bingBackground.url = ''
    await saveSettings(settings)
    await useBingWallpaperStore.removeItem(id)
  }

  // 移除正在获取的提示，减少打扰
  // ElMessage.info(i18next.t('newtab:notification.bingWallpaper.get'))
  
  try {
    let imgUrl = ''
    
    try {
      // 尝试官方源
      const data: BingWallpaperResp = await enhancedFetch(
        'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1'
      )
      imgUrl = `https://www.bing.com${data.images[0]!.url}`
    } catch (e) {
      console.warn('Bing official API failed, trying mirror...', e)
      // 备用源：直接获取图片
      imgUrl = 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN'
    }

    const response = await fetch(imgUrl)
    if (!response.ok) {
      return imgUrl
    }

    const blob = await response.blob()
    const file = new File([blob], 'bing.jpg', { type: blob.type })

    const id = crypto.randomUUID()
    const url = URL.createObjectURL(file)
    const url_old = settings.bingBackground.url

    // 清除上次壁纸，ObjectURL可能导致内存溢出
    await useBingWallpaperStore.clear()
    if (url_old.startsWith('blob:')) {
      URL.revokeObjectURL(url_old)
    }

    // 保存图片到IndexedDB
    await useBingWallpaperStore.setItem<Blob>(id, file)
    settings.bingBackground = {
      id: id,
      url: url,
      updateDate: new Date().toDateString()
    }
    return url
  } catch (error) {
    console.error('Failed to get Bing wallpaper:', error)
    // 移除错误弹窗，避免每次打开都报错
    // ElNotification({
    //   title: i18next.t('newtab:notification.bingWallpaper.error.title'),
    //   message: i18next.t('newtab:notification.bingWallpaper.error.message'),
    //   type: 'error'
    // })
    throw error
  }
}
