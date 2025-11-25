interface VisitRecord {
  url: string
  title: string
  favicon?: string
  visitCount: number
  lastVisit: number
  hidden?: boolean
}

interface VisitData {
  [url: string]: VisitRecord
}

const STORAGE_KEY = 'bookmark_visit_tracker'
const MAX_AGE_DAYS = 90

class VisitTracker {
  private data: VisitData = {}

  constructor() {
    this.loadData()
    this.cleanup()
  }

  private loadData(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.data = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load visit data:', error)
      this.data = {}
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch (error) {
      console.error('Failed to save visit data:', error)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    let hasChanges = false

    Object.keys(this.data).forEach(url => {
      const record = this.data[url]
      if (record && now - record.lastVisit > maxAge) {
        delete this.data[url]
        hasChanges = true
      }
    })

    if (hasChanges) {
      this.saveData()
    }
  }

  recordVisit(url: string, title: string, favicon?: string): void {
    if (!url) return

    if (this.data[url]) {
      this.data[url].visitCount++
      this.data[url].lastVisit = Date.now()
      this.data[url].title = title // Update title in case it changed
      if (favicon) {
        this.data[url].favicon = favicon
      }
    } else {
      this.data[url] = {
        url,
        title,
        favicon,
        visitCount: 1,
        lastVisit: Date.now(),
        hidden: false
      }
    }

    this.saveData()
  }

  getTopSites(limit: number = 8): VisitRecord[] {
    return Object.values(this.data)
      .filter(record => !record.hidden)
      .sort((a, b) => {
        // Sort by visit count first, then by last visit time
        if (b.visitCount !== a.visitCount) {
          return b.visitCount - a.visitCount
        }
        return b.lastVisit - a.lastVisit
      })
      .slice(0, limit)
  }

  hideSite(url: string): void {
    if (this.data[url]) {
      this.data[url].hidden = true
      this.saveData()
    }
  }

  unhideSite(url: string): void {
    if (this.data[url]) {
      this.data[url].hidden = false
      this.saveData()
    }
  }

  clearAll(): void {
    this.data = {}
    this.saveData()
  }

  getAllRecords(): VisitRecord[] {
    return Object.values(this.data)
  }
}

export const visitTracker = new VisitTracker()
export type { VisitRecord }
