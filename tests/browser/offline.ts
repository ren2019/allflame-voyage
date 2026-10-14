import { test as base, expect } from '@playwright/test'

/** The acceptance run permits only its local site; optional analytics/fonts
 * are blocked, and online PoEDB/original-site access cannot supply test data. */
export const test = base.extend<{ offlineNetwork: void }>({
  offlineNetwork: [async ({ context, baseURL }, use) => {
    if (process.env.OFFLINE_ACCEPTANCE === '1') {
      const origin = new URL(baseURL!).origin
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url())
        return url.origin === origin ? route.continue() : route.abort('blockedbyclient')
      })
    }
    await use()
  }, { auto: true }],
})
export { expect }
