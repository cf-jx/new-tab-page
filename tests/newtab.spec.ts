import fs from 'node:fs'
import path from 'node:path'

import { chromium, expect, test } from '@playwright/test'

const extensionPath = path.resolve('.output', 'chrome-mv3')
const userDataDir = path.resolve('.playwright-user-data')

test('bookmark panel does not render stray [object Promise]', async () => {
  fs.rmSync(userDataDir, { recursive: true, force: true })
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps'
    ]
  })

  try {
    const [serviceWorker] =
      context.serviceWorkers().length > 0
        ? [context.serviceWorkers()[0]!]
        : [
            await context.waitForEvent('serviceworker', {
              timeout: 10000
            })
          ]

    const extensionId = new URL(serviceWorker.url()).host
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/newtab.html`)

    const triggerArea = page.locator('.bookmark-inline-area')
    await triggerArea.waitFor({ state: 'visible', timeout: 10000 })
    await triggerArea.click({ button: 'right' })

    await page.waitForSelector('.bookmark-panel__actions', { timeout: 10000 })

    const strayTextLocator = page.getByText('[object Promise]', { exact: false })
    await expect(strayTextLocator).toHaveCount(0)
  } finally {
    await context.close()
  }
})
