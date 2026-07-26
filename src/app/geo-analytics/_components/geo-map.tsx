'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MlMap, Marker as MlMarker, StyleSpecification } from 'maplibre-gl'
import pointOnFeature from '@turf/point-on-feature'
import { Layers } from 'lucide-react'
import type { GeoCity, GeoRegion, RegionFeatureCollection } from '@/lib/hooks/useGeoAnalytics'

// CATATAN PENTING: halaman ini WAJIB dijalankan dengan Webpack (`npm run
// dev:webpack`), bukan Turbopack. Turbopack men-drop Web Worker inline MapLibre
// sehingga peta hang / GeoJSON tak pernah parse. Build produksi (`next build`)
// sudah memakai Webpack, jadi produksi aman. Lihat [[11-Modules/Geo-Analytics]].

type Props = {
  kabkota: RegionFeatureCollection
  provinceLines: RegionFeatureCollection
  provinces: GeoRegion[]
  cities: GeoCity[]
  selectedProvince: string | null
  onSelectProvince: (provinceId: string | null, name: string | null) => void
}

// Ambang zoom: di bawah ini tampilkan marker per provinsi, di atas per kabupaten.
const ZOOM_LEVEL_SPLIT = 6
const SCALE = ['#155e75', '#0e7490', '#0891b2', '#06b6d4', '#22d3ee']
const EMPTY = '#94a3b8'

// Basemap raster OSM (gratis, tanpa API key). Bila offline, layer polygon tetap.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.75, 'raster-saturation': -0.35, 'raster-brightness-max': 0.9 } }],
}
const BLANK_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] }

function markerColor(ratio: number): string {
  if (ratio <= 0) return '#334155'
  return SCALE[Math.min(SCALE.length - 1, Math.floor(ratio * SCALE.length))]
}

/**
 * Elemen pin bernomor: lingkaran berwarna berisi angka total.
 * PENTING: MapLibre memasang `transform: translate(...)` pada elemen ROOT marker
 * untuk memposisikannya. Maka hover-scale HARUS di elemen anak (`inner`), bukan
 * root — kalau root disentuh transform-nya, translate hilang dan pin loncat ke
 * pojok. Root cuma jadi anchor posisi; visual + interaksi ada di `inner`.
 */
function buildMarkerEl(total: number, ratio: number, name: string): HTMLElement {
  const size = Math.round(28 + Math.min(1, ratio) * 22) // 28–50px
  const el = document.createElement('div')
  el.className = 'geo-pin'
  el.style.cssText = 'will-change:transform;position:relative;'

  const inner = document.createElement('div')
  inner.style.cssText = `width:${size}px;height:${size}px;display:grid;place-items:center;border-radius:9999px;`
    + `background:${markerColor(ratio)};color:#fff;font-weight:800;font-size:${Math.round(size / 2.8)}px;`
    + `text-shadow:0 1px 3px rgba(0,0,0,0.5);`
    + `border:2px solid rgba(255,255,255,0.7);box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:pointer;`
    + `transition:transform .15s;transform:scale(1);`
  inner.textContent = total >= 1000 ? (total / 1000).toFixed(1) + 'k' : String(total)

  const tip = document.createElement('div')
  tip.style.cssText = 'position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);'
    + 'padding:6px 10px;border-radius:8px;white-space:nowrap;pointer-events:none;'
    + 'background:rgba(15,23,42,0.92);color:#f1f5f9;font-size:11px;font-weight:600;'
    + 'box-shadow:0 4px 12px rgba(0,0,0,0.25);backdrop-filter:blur(4px);'
    + 'opacity:0;transition:opacity .15s;z-index:50;'
  tip.innerHTML = `<span style="color:#67e8f9">${total}</span> konsultasi`

  const arrow = document.createElement('div')
  arrow.style.cssText = 'position:absolute;bottom:-4px;left:50%;transform:translateX(-50%) rotate(45deg);'
    + 'width:8px;height:8px;background:rgba(15,23,42,0.92);'
  tip.appendChild(arrow)

  const nameEl = document.createElement('div')
  nameEl.style.cssText = 'font-weight:800;font-size:12px;color:#fff;margin-bottom:2px;'
  nameEl.textContent = name
  tip.insertBefore(nameEl, tip.firstChild)

  el.appendChild(tip)
  el.appendChild(inner)

  inner.onmouseenter = () => { inner.style.transform = 'scale(1.12)'; el.style.zIndex = '50'; tip.style.opacity = '1' }
  inner.onmouseleave = () => { inner.style.transform = 'scale(1)'; el.style.zIndex = ''; tip.style.opacity = '0' }
  return el
}

export default function GeoMap({ kabkota, provinceLines, provinces, cities, selectedProvince, onSelectProvince }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const readyRef = useRef(false)
  const markersRef = useRef<MlMarker[]>([])
  const onSelectRef = useRef(onSelectProvince)
  onSelectRef.current = onSelectProvince
  // Data terbaru disimpan di ref supaya handler map ('load'/'zoomend') yang
  // di-bind sekali TIDAK menangkap closure lama berisi data kosong (bug pin
  // hilang setelah flyTo/zoom).
  const dataRef = useRef({ provinces, cities, selectedProvince })
  dataRef.current = { provinces, cities, selectedProvince }
  const [basemap, setBasemap] = useState(true)

  // Centroid tiap wilayah — useMemo supaya tersedia SEBELUM effect pertama.
  // pointOnFeature (bukan centroid) menjamin titik di DALAM polygon,
  // bukan di laut untuk provinsi kepulauan (Maluku, Kepri, dll).
  const geoLookup = useMemo(() => {
    const prov = new Map<string, [number, number]>()
    const kab = new Map<string, [number, number]>()
    const kabProv = new Map<string, { id: string | null; name: string }>()
    for (const f of provinceLines.features) {
      const c = pointOnFeature(f as any).geometry.coordinates as [number, number]
      prov.set(f.id, c)
    }
    for (const f of kabkota.features) {
      const c = pointOnFeature(f as any).geometry.coordinates as [number, number]
      kab.set(f.id, c)
      kabProv.set(f.id, { id: f.properties.province_id ?? null, name: f.properties.province ?? '' })
    }
    return { provCentroid: prov, kabCentroid: kab, kabProvince: kabProv }
  }, [provinceLines, kabkota])
  const geoRef = useRef(geoLookup)
  geoRef.current = geoLookup

  // Init peta sekali.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemap ? OSM_STYLE : BLANK_STYLE,
      center: [118, -2.3],
      zoom: 4.1,
      attributionControl: false,
      dragRotate: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.FullscreenControl(), 'top-right')

    map.on('load', () => {
      map.addSource('kabkota', { type: 'geojson', data: kabkota as any, promoteId: 'region_id' })
      map.addSource('provinces', { type: 'geojson', data: provinceLines as any, promoteId: 'region_id' })

      map.addLayer({
        id: 'kab-fill',
        type: 'fill',
        source: 'kabkota',
        paint: {
          'fill-color': [
            'case',
            ['==', ['coalesce', ['feature-state', 'total'], 0], 0], EMPTY,
            ['interpolate', ['linear'], ['feature-state', 'ratio'], 0, SCALE[0], 0.5, SCALE[2], 1, SCALE[4]],
          ],
          'fill-opacity': 0.4,
        },
      })
      map.addLayer({
        id: 'prov-line',
        type: 'line',
        source: 'provinces',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#f0abfc', 'rgba(255,255,255,0.55)'],
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 1],
        },
      })

      map.on('click', 'kab-fill', (e: any) => {
        const f = e.features?.[0]
        if (!f) return
        const prov = geoRef.current.kabProvince.get(f.id as string)
        const sel = dataRef.current.selectedProvince
        onSelectRef.current(
          sel === prov?.id ? null : (prov?.id ?? null),
          prov?.name ?? null
        )
      })
      map.on('mouseenter', 'kab-fill', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'kab-fill', () => { map.getCanvas().style.cursor = '' })

      readyRef.current = true
      applyData()
      renderMarkers()
    })

    map.on('zoomend', renderMarkers)

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ganti basemap tanpa membuang layer data: set style lalu pasang ulang.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    map.setStyle(basemap ? OSM_STYLE : BLANK_STYLE)
    map.once('styledata', () => {
      if (!map.getSource('kabkota')) {
        map.addSource('kabkota', { type: 'geojson', data: kabkota as any, promoteId: 'region_id' })
        map.addSource('provinces', { type: 'geojson', data: provinceLines as any, promoteId: 'region_id' })
        map.addLayer({
          id: 'kab-fill', type: 'fill', source: 'kabkota',
          paint: {
            'fill-color': ['case', ['==', ['coalesce', ['feature-state', 'total'], 0], 0], EMPTY,
              ['interpolate', ['linear'], ['feature-state', 'ratio'], 0, SCALE[0], 0.5, SCALE[2], 1, SCALE[4]]],
            'fill-opacity': 0.4,
          },
        })
        map.addLayer({
          id: 'prov-line', type: 'line', source: 'provinces',
          paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#f0abfc', 'rgba(255,255,255,0.55)'],
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 1],
          },
        })
        applyData()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap])

  // Warnai fill dari data kota + tandai provinsi terpilih.
  function applyData() {
    const map = mapRef.current
    if (!map || !readyRef.current || !map.getSource('kabkota')) return
    const { cities, selectedProvince } = dataRef.current

    const max = cities.reduce((m, c) => Math.max(m, c.total), 0) || 1
    for (const c of cities) {
      map.setFeatureState({ source: 'kabkota', id: c.region_id }, { total: c.total, ratio: c.total / max })
    }
    for (const p of provinceLines.features) {
      map.setFeatureState({ source: 'provinces', id: p.id }, { selected: selectedProvince === p.id })
    }
  }

  function renderMarkers() {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const { provinces, cities, selectedProvince } = dataRef.current
    const { provCentroid: pc, kabCentroid: kc, kabProvince: kp } = geoRef.current
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const perKab = map.getZoom() >= ZOOM_LEVEL_SPLIT
    const rows: { id: string; name: string; total: number; lngLat?: [number, number]; provId: string | null; provName: string }[] =
      perKab
        ? cities.filter((c) => c.total > 0).map((c) => {
            const p = kp.get(c.region_id)
            return { id: c.region_id, name: c.name, total: c.total, lngLat: kc.get(c.region_id), provId: p?.id ?? null, provName: p?.name ?? c.province ?? '' }
          })
        : provinces.filter((p) => p.total > 0).map((p) => ({ id: p.region_id, name: p.name, total: p.total, lngLat: pc.get(p.region_id), provId: p.region_id, provName: p.name }))

    const max = rows.reduce((m, r) => Math.max(m, r.total), 0) || 1

    for (const r of rows) {
      if (!r.lngLat) continue
      const el = buildMarkerEl(r.total, r.total / max, r.name)
      el.onclick = () => {
        onSelectRef.current(dataRef.current.selectedProvince === r.provId ? null : r.provId, r.provName)
        map.flyTo({ center: r.lngLat!, zoom: Math.max(map.getZoom(), 6.5), duration: 700 })
      }
      markersRef.current.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(r.lngLat).addTo(map))
    }
  }

  // Re-apply saat data/seleksi berubah.
  useEffect(() => {
    applyData()
    renderMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, provinces, selectedProvince])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <button
        onClick={() => setBasemap((b) => !b)}
        title={basemap ? 'Sembunyikan basemap' : 'Tampilkan basemap'}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/95 px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80 shadow transition-colors hover:text-[var(--primary-theme)]"
      >
        <Layers className="h-3.5 w-3.5" /> Basemap {basemap ? 'On' : 'Off'}
      </button>
    </div>
  )
}
