import { toast } from 'sonner'

/**
 * Resolve the theme's solid card colour. Cards render with a translucent
 * background + `backdrop-blur` in dark mode, neither of which can be rasterized
 * faithfully — so for the export we substitute the opaque `--card` token
 * (#131b2e in dark, white in light). Falls back to white if the token is empty.
 */
function resolveCardBackground(): string {
  const card = window.getComputedStyle(document.documentElement).getPropertyValue('--card').trim()
  return card || '#ffffff'
}

/**
 * Export a single card (chart + header) to a PNG image and trigger a download.
 *
 * Uses `html-to-image` to rasterize the live DOM node exactly as rendered —
 * gradients, legend, axis labels and all — instead of hand-reconstructing the
 * SVG. Before capturing we temporarily force the card opaque (inline styles
 * override the Tailwind classes that make it translucent + blurred in dark
 * mode), so the result isn't washed-out; the styles are reverted immediately
 * after. The canvas background stays transparent so the card's rounded corners
 * are preserved. Action buttons marked with the `print:hidden` Tailwind class
 * are skipped so the screenshot doesn't include the "Save PNG / Save PDF"
 * controls.
 */
export async function saveCardAsPng(el: HTMLElement | null, filename: string): Promise<void> {
  if (!el) return

  // Snapshot the inline styles we're about to override so we can restore them.
  const prev = {
    backgroundColor: el.style.getPropertyValue('background-color'),
    backgroundColorPriority: el.style.getPropertyPriority('background-color'),
    backdropFilter: el.style.backdropFilter,
    webkitBackdropFilter: el.style.getPropertyValue('-webkit-backdrop-filter'),
  }

  // Use `important` so this beats the global `[data-slot="card"]` !important
  // frosted-surface rule, giving a fully opaque card in the exported image.
  el.style.setProperty('background-color', resolveCardBackground(), 'important')
  el.style.backdropFilter = 'none'
  el.style.setProperty('-webkit-backdrop-filter', 'none')

  try {
    // Library rasterisasi cukup besar dan hanya dibutuhkan saat tombol ditekan.
    // Muat terpisah agar dashboard harian Admin tidak ikut membawanya.
    const { toPng } = await import('html-to-image')
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const useLowMemoryMode = (deviceMemory !== undefined && deviceMemory <= 4)
      || Math.max(el.offsetWidth, el.offsetHeight) > 1200
    const dataUrl = await toPng(el, {
      pixelRatio: useLowMemoryMode ? 1 : 2,
      cacheBust: true,
      // Transparent canvas → the card's border-radius stays rounded in the PNG.
      backgroundColor: undefined,
      // Skip the export action buttons so they don't appear in the image.
      filter: (node) =>
        !(node instanceof HTMLElement && node.classList.contains('print:hidden')),
    })

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${filename}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('Failed to export card to PNG:', err)
    toast.error('Gagal menyimpan gambar PNG. Silakan coba lagi.')
  } finally {
    // Restore the original inline styles regardless of success/failure.
    el.style.removeProperty('background-color')
    if (prev.backgroundColor) {
      el.style.setProperty('background-color', prev.backgroundColor, prev.backgroundColorPriority)
    }
    el.style.backdropFilter = prev.backdropFilter
    el.style.setProperty('-webkit-backdrop-filter', prev.webkitBackdropFilter)
  }
}

/**
 * Export a single card to PDF via the browser print dialog. Scoped print CSS
 * (`.pdf-export-target` + `body.printing-pdf` in globals.css) isolates the card
 * so charts stay crisp vector SVG.
 */
export function saveCardAsPdf(el: HTMLElement | null, title: string): void {
  if (!el) return
  const previousTitle = document.title
  document.title = title // browsers use document.title as the default PDF filename
  el.classList.add('pdf-export-target')
  document.body.classList.add('printing-pdf')

  const cleanup = () => {
    el.classList.remove('pdf-export-target')
    document.body.classList.remove('printing-pdf')
    document.title = previousTitle
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  window.print()
}
