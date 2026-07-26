'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/lib/stores/authStore'
import { useGeoAnalytics, useProvinceGeoJson, useKabkotaGeoJson, type GeoAnalyticsFilters } from '@/lib/hooks/useGeoAnalytics'
import { useAccountGroups } from '@/lib/hooks/useReportAttendances'
import { useNeedsCategories, useStatusCategories } from '@/lib/hooks/useMasterData'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  MapPinned, Users, ClipboardList, CheckCircle2, Percent, Globe2, Loader2, RotateCcw, X,
} from 'lucide-react'

const GeoMap = dynamic(() => import('./_components/geo-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  ),
})

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const currentYear = new Date().getFullYear()

export default function GeoAnalyticsView() {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(currentYear)
  const [accountGroup, setAccountGroup] = useState<string | undefined>(undefined)
  const [needsCategory, setNeedsCategory] = useState<number | undefined>(undefined)
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)

  const { data: groupsRes } = useAccountGroups()
  const groups = groupsRes?.data ?? []
  const { data: needs = [] } = useNeedsCategories()
  const { data: statuses = [] } = useStatusCategories()
  const { data: provGeo, isLoading: provLoading } = useProvinceGeoJson()
  const { data: kabGeo, isLoading: kabLoading } = useKabkotaGeoJson()
  const geoLoading = provLoading || kabLoading

  const filters: GeoAnalyticsFilters = useMemo(() => ({
    period_type: periodType,
    month: periodType === 'monthly' ? month : undefined,
    year,
    account_group: accountGroup,
    needs_category: needsCategory,
    status,
    province: selected?.id,
  }), [periodType, month, year, accountGroup, needsCategory, status, selected])

  const { data: res, isLoading, isFetching } = useGeoAnalytics(filters)
  const data = res?.data

  const kpi = data?.kpi
  const regions = data?.provinces ?? []
  const selectedRegion = selected ? regions.find((r) => r.region_id === selected.id) : undefined

  const resetFilters = () => {
    setAccountGroup(undefined); setNeedsCategory(undefined); setStatus(undefined); setSelected(null)
  }

  return (
    <div className="min-w-0 space-y-5 pb-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--primary-theme)]">Business Intelligence</p>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_12%,var(--card))] text-[var(--primary-theme)]">
              <MapPinned className="size-[18px]" />
            </span>
            Analisis Wilayah Konsumen
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Pemetaan persebaran konsultasi per wilayah. Klik provinsi untuk memfilter seluruh dashboard.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-sm ring-1 ring-border/40 dark:border-zinc-700/80">
          <FilterField label="Rentang">
            <Select value={periodType} onValueChange={(v) => v && setPeriodType(v as any)}>
              <SelectTrigger className="h-9 w-32 rounded-lg text-xs"><SelectValue>{periodType === 'monthly' ? 'Bulanan' : 'Tahunan'}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {periodType === 'monthly' && (
            <FilterField label="Bulan">
              <Select value={String(month)} onValueChange={(v) => v && setMonth(Number(v))}>
                <SelectTrigger className="h-9 w-32 rounded-lg text-xs"><SelectValue>{new Date(2000, month - 1).toLocaleString('id-ID', { month: 'long' })}</SelectValue></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          )}

          <FilterField label="Tahun">
            <Select value={String(year)} onValueChange={(v) => v && setYear(Number(v))}>
              <SelectTrigger className="h-9 w-24 rounded-lg text-xs"><SelectValue>{year}</SelectValue></SelectTrigger>
              <SelectContent>
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          {isSuperAdmin && (
            <FilterField label="Grup Akun">
              <Select value={accountGroup ?? 'all'} onValueChange={(v) => setAccountGroup(v && v !== 'all' ? v : undefined)}>
                <SelectTrigger className="h-9 w-36 rounded-lg text-xs"><SelectValue>{accountGroup ? groups.find((g) => g.value === accountGroup)?.label ?? accountGroup : 'Semua Grup'}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Grup</SelectItem>
                  {groups.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          )}

          <FilterField label="Produk">
            <Select value={needsCategory ? String(needsCategory) : 'all'} onValueChange={(v) => setNeedsCategory(v && v !== 'all' ? Number(v) : undefined)}>
              <SelectTrigger className="h-9 w-40 rounded-lg text-xs"><SelectValue>{needsCategory ? needs.find((n) => n.id === needsCategory)?.name ?? '?' : 'Semua Produk'}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Produk</SelectItem>
                {needs.map((n) => <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Status">
            <Select value={status ? String(status) : 'all'} onValueChange={(v) => setStatus(v && v !== 'all' ? Number(v) : undefined)}>
              <SelectTrigger className="h-9 w-40 rounded-lg text-xs"><SelectValue>{status ? statuses.find((s) => s.id === status)?.name ?? '?' : 'Semua Status'}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {statuses.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>

          {(accountGroup || needsCategory || status || selected) && (
            <button onClick={resetFilters} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-[var(--primary-theme)]" />}
        </div>
      </header>

      {/* KPI */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={ClipboardList} tint="text-cyan-400" chip="bg-cyan-500/10" label="Total Konsultasi" value={kpi?.total_consultations} loading={isLoading} />
        <Kpi icon={Users} tint="text-violet-400" chip="bg-violet-500/10" label="Konsumen" value={kpi?.total_customers} loading={isLoading} />
        <Kpi icon={MapPinned} tint="text-amber-400" chip="bg-amber-500/10" label="Survey" value={kpi?.total_surveys} loading={isLoading} />
        <Kpi icon={CheckCircle2} tint="text-emerald-400" chip="bg-emerald-500/10" label="Deal" value={kpi?.total_deals} loading={isLoading} />
        <Kpi icon={Percent} tint="text-blue-400" chip="bg-blue-500/10" label="Closing Rate" value={kpi ? `${kpi.closing_rate}%` : undefined} loading={isLoading} />
        <Kpi icon={Globe2} tint="text-teal-400" chip="bg-teal-500/10" label="Wilayah Aktif" value={kpi?.active_regions} loading={isLoading} />
      </section>

      {/* Peta + sidebar kanan */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Kolom kiri: peta + peringkat akun */}
        <div className="space-y-4">
          {/* Peta */}
          <div className="relative h-[560px] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm lg:h-[620px]">
            {geoLoading || !provGeo || !kabGeo ? (
              <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <GeoMap
                kabkota={kabGeo}
                provinceLines={provGeo}
                provinces={regions}
                cities={data?.cities ?? []}
                selectedProvince={selected?.id ?? null}
                onSelectProvince={(id, name) => setSelected(id ? { id, name: name ?? id } : null)}
              />
            )}

            {/* Panel detail provinsi terpilih */}
            {selected && (
              <div className="absolute bottom-3 left-3 w-60 rounded-xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{selected.name}</p>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
                {selectedRegion ? (
                  <dl className="mt-2 space-y-1 text-[11px]">
                    <Row k="Konsultasi" v={selectedRegion.total} />
                    <Row k="Survey" v={selectedRegion.surveys} />
                    <Row k="Deal" v={selectedRegion.deals} />
                    <Row k="Closing Rate" v={`${selectedRegion.closing_rate}%`} />
                    <Row k="Share Nasional" v={`${selectedRegion.share}%`} />
                  </dl>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">Belum ada konsultasi di periode ini.</p>
                )}
              </div>
            )}

            {/* Legenda */}
            <div className="absolute left-3 top-3 rounded-lg border border-border/60 bg-card/95 px-2.5 py-2 text-[10px] shadow backdrop-blur">
              <p className="mb-1 font-bold text-muted-foreground">Kepadatan</p>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm" style={{ background: '#1f2937' }} />
                <span className="text-muted-foreground/70">0</span>
                <span className="ml-1 h-2.5 w-16 rounded-sm" style={{ background: 'linear-gradient(90deg,#164e63,#22d3ee)' }} />
                <span className="text-muted-foreground/70">tinggi</span>
              </div>
            </div>
          </div>

          {/* Peringkat Akun — full-width di bawah peta */}
          <Panel title="Peringkat Akun" subtitle="Kontribusi konsultasi per akun">
            <RankTable
              head={['Akun', 'Konsultasi', 'Survey', 'Deal', 'Closing']}
              rows={(data?.accountRanking ?? []).map((a) => [a.name, a.total, a.surveys, a.deals, `${a.closing_rate}%`])}
            />
          </Panel>
        </div>

        {/* Kolom kanan: ranking wilayah + status + kota */}
        <div className="space-y-4">
          <Panel title="Peringkat Wilayah" subtitle="Berdasarkan jumlah konsultasi">
            <ol className="space-y-1.5">
              {regions.slice(0, 10).map((r, i) => (
                <li key={r.region_id}>
                  <button
                    onClick={() => setSelected(selected?.id === r.region_id ? null : { id: r.region_id, name: r.name })}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                      selected?.id === r.region_id ? 'bg-[color-mix(in_srgb,var(--primary-theme)_12%,transparent)]' : 'hover:bg-muted/50'
                    )}
                  >
                    <span className="w-4 text-[10px] font-bold text-muted-foreground/60">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground/90">{r.name}</span>
                    <span className="text-xs font-black tabular-nums text-foreground">{r.total}</span>
                    <span className="w-10 text-right text-[10px] text-muted-foreground/70">{r.share}%</span>
                  </button>
                </li>
              ))}
              {regions.length === 0 && !isLoading && <p className="px-2 py-6 text-center text-xs text-muted-foreground/60">Tidak ada data wilayah.</p>}
            </ol>
            {(data?.unlocatedProvince ?? 0) > 0 && (
              <p className="mt-2 border-t border-border/40 pt-2 text-[10px] text-muted-foreground/70">
                {data?.unlocatedProvince} konsultasi belum berlokasi (provinsi belum dikonfirmasi).
              </p>
            )}
          </Panel>

          <Panel title="Distribusi Status">
            <ul className="space-y-1.5">
              {(data?.statusBreakdown ?? []).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color ?? '#64748b' }} />
                  <span className="min-w-0 flex-1 truncate text-foreground/80">{s.name}</span>
                  <span className="font-bold tabular-nums text-foreground">{s.count}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Peringkat Kota" subtitle={selected ? `Difilter: ${selected.name}` : 'Semua wilayah'}>
            <RankTable
              head={['Kota', 'Provinsi', 'Konsultasi', 'Deal']}
              rows={(data?.cities ?? []).slice(0, 15).map((c) => [c.name, c.province ?? '-', c.total, c.deals])}
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Kpi({ icon: Icon, tint, chip, label, value, loading }: {
  icon: typeof Users; tint: string; chip: string; label: string; value?: number | string; loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3.5 py-3 shadow-sm">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', chip)}><Icon className={cn('h-4.5 w-4.5', tint)} /></span>
      <span className="min-w-0">
        <span className="block text-xl font-black tabular-nums text-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" /> : (value ?? 0)}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-bold text-foreground">{v}</dd>
    </div>
  )
}

function RankTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/50 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {head.map((h, i) => <th key={h} className={cn('py-2', i === 0 ? 'pl-1' : 'px-2 text-right last:pr-1')}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30 text-xs">
          {rows.map((r, ri) => (
            <tr key={ri} className="hover:bg-muted/30">
              {r.map((cell, ci) => (
                <td key={ci} className={cn('py-2', ci === 0 ? 'pl-1 font-semibold text-foreground/90 truncate max-w-[140px]' : 'px-2 text-right tabular-nums text-muted-foreground last:pr-1')}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={head.length} className="py-6 text-center text-muted-foreground/60">Tidak ada data.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
