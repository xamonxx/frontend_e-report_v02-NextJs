import { readFile } from 'node:fs/promises'

const workerPath = new URL('../public/sw-v2.js', import.meta.url)
const worker = await readFile(workerPath, 'utf8')

const forbiddenCacheNames = [
  'apis',
  'next-data',
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
  'cross-origin',
  'start-url',
]

for (const cacheName of forbiddenCacheNames) {
  if (worker.includes(`cacheName:"${cacheName}"`) || worker.includes(`cacheName:'${cacheName}'`)) {
    throw new Error(`PWA security regression: private cache "${cacheName}" is registered`)
  }
}

for (const privatePath of ['/api/v1', '/sanctum']) {
  if (worker.includes(privatePath)) {
    throw new Error(`PWA security regression: private path "${privatePath}" appears in service worker`)
  }
}

console.log('PWA security check passed: no private runtime cache or API path found')
