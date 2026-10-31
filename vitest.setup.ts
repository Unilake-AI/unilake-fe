import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// Radix UI gọi các API này khi mở menu; jsdom chưa hỗ trợ.
const elementProto = Element.prototype as unknown as Record<string, unknown>
const polyfills: Record<string, () => unknown> = {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
}
for (const [name, implementation] of Object.entries(polyfills)) {
  if (typeof elementProto[name] !== 'function') {
    elementProto[name] = implementation
  }
}
