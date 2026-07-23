'use client'

import { useState, useEffect } from 'react'
import { useConsultations, useDeleteConsultation, useImportConsultations } from '@/lib/hooks/useConsultations'
import { useAccounts, useStatusCategories } from '@/lib/hooks/useMasterData'
import { useNotificationCount } from '@/lib/hooks/useNotifications'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Plus,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  ListFilter,
  Building2,
  Trash2,
  Eye,
  Edit2,
  ListChecks,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Upload,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MapPinned,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDebounce } from 'use-debounce'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn, productCategoryNames } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { buildExportUrl } from '@/lib/api/client'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format, parseISO } from 'date-fns'
import { SearchField } from '@/components/ui/search-field'
import { Checkbox } from '@/components/ui/checkbox'

const softActionGradientClass = 'bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary-theme)_7%,var(--card))_0%,color-mix(in_srgb,var(--primary-theme)_2%,var(--background))_100%)]'
const softActionSurfaceClass = [
  'border-[color:color-mix(in_srgb,var(--primary-theme)_18%,var(--border))]',
  softActionGradientClass,
].join(' ')

const secondaryFileActionClass = [
  'group inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-semibold sm:gap-1.5 sm:px-3 sm:text-xs',
  softActionSurfaceClass,
  'text-foreground/70',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_5px_14px_-12px_rgba(15,23,42,0.4)]',
  'transition-[background-image,border-color,color,box-shadow,transform] duration-200',
  'hover:border-[color:color-mix(in_srgb,var(--primary-theme)_42%,var(--border))] hover:text-amber-700',
  'hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary-theme)_14%,var(--card))_0%,color-mix(in_srgb,var(--primary-theme)_5%,var(--background))_100%)]',
  'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-12px_color-mix(in_srgb,var(--primary-theme)_35%,transparent)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 active:translate-y-px',
  'dark:text-foreground/70 dark:hover:text-amber-300',
].join(' ')

const filterControlSurfaceClass = [
  softActionSurfaceClass,
  'text-muted-foreground',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_5px_14px_-12px_rgba(15,23,42,0.42)]',
  'transition-[background-image,border-color,color,box-shadow,transform] duration-200',
  'hover:border-[color:color-mix(in_srgb,var(--primary-theme)_38%,var(--border))] hover:text-foreground',
  'hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary-theme)_13%,var(--card))_0%,color-mix(in_srgb,var(--primary-theme)_5%,var(--background))_100%)]',
  'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-13px_color-mix(in_srgb,var(--primary-theme)_30%,transparent)]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 active:translate-y-px',
].join(' ')

const filterIconButtonClass = [
  'relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl border',
  filterControlSurfaceClass,
].join(' ')

const activeFilterControlClass = 'border-amber-500/50 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary-theme)_18%,var(--card))_0%,color-mix(in_srgb,var(--primary-theme)_8%,var(--background))_100%)] text-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_7px_18px_-13px_rgba(245,158,11,0.7)] hover:border-amber-500/65 hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary-theme)_24%,var(--card))_0%,color-mix(in_srgb,var(--primary-theme)_11%,var(--background))_100%)] hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'

export default function ConsultationsPage() {
  const confirm = useConfirm()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Filter state variables
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [statusFilter, setStatusFilter] = useState('')
  // Filter lead yang sudah di tahap Request Survey tapi belum diajukan ke
  // manager surveyor. Dibaca juga dari URL supaya notifikasi bisa menautkannya.
  const [pendingSurveyOnly, setPendingSurveyOnly] = useState(false)
  const [accountFilter, setAccountFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedConsultationIds, setSelectedConsultationIds] = useState<Set<number>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Filter bar icon popovers
  const [barStatusOpen, setBarStatusOpen] = useState(false)
  const [barAkunOpen, setBarAkunOpen] = useState(false)
  const [barPeriodOpen, setBarPeriodOpen] = useState(false)
  const [barDateOpen, setBarDateOpen] = useState(false)

  // Column header filter popovers
  const [statusPopOpen, setStatusPopOpen] = useState(false)
  const [akunPopOpen, setAkunPopOpen] = useState(false)
  const [konsulDatePopOpen, setKonsulDatePopOpen] = useState(false)
  const [updateSortDir, setUpdateSortDir] = useState<'asc' | 'desc' | null>(null)

  // Reset to first page when search filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, accountFilter, monthFilter, yearFilter, startDate, endDate, pendingSurveyOnly])

  useEffect(() => {
    setSelectedConsultationIds(new Set())
  }, [page, debouncedSearch, statusFilter, accountFilter, monthFilter, yearFilter, startDate, endDate, pendingSurveyOnly])

  // Notifikasi pasca-import menautkan ke /consultations?pending_survey=1.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('pending_survey') === '1') {
      setPendingSurveyOnly(true)
    }
  }, [])

  // CSV Import states
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  // Consultation Fetching
  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
  } = useConsultations({
    search: debouncedSearch,
    status: statusFilter,
    account: accountFilter,
    month: monthFilter,
    year: yearFilter,
    start_date: startDate,
    end_date: endDate,
    pending_survey: pendingSurveyOnly ? 1 : undefined,
    page,
    per_page: 10,
  })

  const { data: notificationCount } = useNotificationCount()
  const pendingSurveyCount = notificationCount?.pending_survey_requests ?? 0

  const { data: statuses } = useStatusCategories()
  const { data: accounts } = useAccounts()
  const deleteMutation = useDeleteConsultation()
  const importMutation = useImportConsultations()

  const consultations = response?.data || []
  const meta = response?.meta

  const sortedConsultations = updateSortDir
    ? [...consultations].sort((a, b) => {
        const aTime = new Date(a.updated_at).getTime()
        const bTime = new Date(b.updated_at).getTime()
        return updateSortDir === 'asc' ? aTime - bTime : bTime - aTime
      })
    : consultations

  const visibleConsultationIds = sortedConsultations.map((consultation) => consultation.id)
  const selectedVisibleCount = visibleConsultationIds.filter((id) => selectedConsultationIds.has(id)).length
  const areAllVisibleSelected = visibleConsultationIds.length > 0 && selectedVisibleCount === visibleConsultationIds.length
  const areSomeVisibleSelected = selectedVisibleCount > 0 && !areAllVisibleSelected

  const toggleConsultationSelection = (id: number, checked: boolean) => {
    setSelectedConsultationIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllVisibleConsultations = (checked: boolean) => {
    setSelectedConsultationIds((current) => {
      const next = new Set(current)
      visibleConsultationIds.forEach((id) => {
        if (checked) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  const getStatusColor = (name: string, cssClass?: string | null): string => {
    if (cssClass && /^#[0-9a-fA-F]{3,8}$/.test(cssClass)) return cssClass
    const n = name.toLowerCase()
    if (n.includes('deal') || n.includes('selesai')) return '#10b981'
    if (n.includes('kendala') || n.includes('anggaran') || n.includes('gagal')) return '#ef4444'
    if (n.includes('tidak ada respon') || n.includes('no respon')) return '#f97316'
    if (n.includes('masih') || n.includes('konsultasi')) return '#3b82f6'
    if (n.includes('request') || n.includes('survey')) return '#8b5cf6'
    if (n.includes('tanya')) return '#f59e0b'
    if (n.includes('batal') || n.includes('cancel')) return '#dc2626'
    if (n.includes('pending') || n.includes('tunggu')) return '#eab308'
    return '#71717a'
  }
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 7 }, (_, index) => currentYear - index)
  const monthOptions = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ]

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Lead Konsultasi?',
      description: 'Apakah Anda yakin ingin menghapus data konsultasi ini?',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          setSelectedConsultationIds((current) => {
            const next = new Set(current)
            next.delete(id)
            return next
          })
          toast.success('Konsultasi berhasil dihapus')
        },
        onError: () => {
          toast.error('Gagal menghapus konsultasi')
        },
      })
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedConsultationIds)
    if (ids.length === 0 || isBulkDeleting) return

    const isConfirmed = await confirm({
      title: `Hapus ${ids.length} Data Konsultasi?`,
      description: 'Data yang dipilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
      actionLabel: `Hapus ${ids.length} Data`,
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (!isConfirmed) return

    setIsBulkDeleting(true)
    const failedIds: number[] = []

    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch {
        failedIds.push(id)
      }
    }

    setSelectedConsultationIds(new Set(failedIds))
    setIsBulkDeleting(false)

    const deletedCount = ids.length - failedIds.length
    if (deletedCount > 0) toast.success(`${deletedCount} data konsultasi berhasil dihapus`)
    if (failedIds.length > 0) toast.error(`${failedIds.length} data gagal dihapus dan tetap dipilih`)
  }

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) {
      toast.error('Silakan pilih file CSV terlebih dahulu.')
      return
    }

    const formData = new FormData()
    formData.append('csv_file', importFile)

    importMutation.mutate(formData, {
      onSuccess: (data) => {
        toast.success(data.message || 'Import data berhasil dijadwalkan')
        setImportOpen(false)
        setImportFile(null)
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal mengimpor data CSV.')
      },
    })
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      {/* Header section */}
      <div className="min-w-0">
        <div className="min-w-0">
          <h1 className="break-words text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Daftar Konsultasi
          </h1>
          <p className="max-w-2xl text-xs text-muted-foreground mt-1">
            Kelola dan pantau seluruh data pipeline lead konsultasi klien secara real-time.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={cn('consultation-toolbar max-w-full px-3 py-3 sm:px-4', softActionSurfaceClass)}>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">

          {/* Search — full width on mobile, constrained on desktop */}
          <SearchField
            containerClassName="w-full xl:min-w-[180px] xl:flex-1 xl:max-w-[260px]"
            pageSearch
            showShortcut
            placeholder="Cari nama, telepon, ID, atau akun..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            className={cn(
              filterControlSurfaceClass,
              'h-10 border-[color:color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-transparent text-xs',
              'hover:border-[color:color-mix(in_srgb,var(--primary-theme)_38%,var(--border))]',
              'focus-visible:border-[color:color-mix(in_srgb,var(--primary-theme)_60%,var(--border))] focus-visible:bg-transparent',
              'focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_18%,transparent)]',
            )}
          />

          {/* Icons + Reset row — full width on mobile so ml-auto works */}
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 xl:w-auto xl:flex-nowrap">

          <div className="hidden md:block h-5 w-px bg-border mr-0.5 dark:bg-zinc-800/60" />

          {/* Lead sudah di tahap Request Survey tapi belum diajukan ke manager.
              Hanya muncul bila memang ada, supaya tidak jadi hiasan mati. */}
          {(pendingSurveyCount > 0 || pendingSurveyOnly) && (
            <button
              type="button"
              onClick={() => setPendingSurveyOnly((v) => !v)}
              title="Lead yang belum diajukan survey ke Manager Surveyor"
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors',
                pendingSurveyOnly
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400',
              )}
            >
              <MapPinned className="h-3.5 w-3.5" />
              Belum diajukan
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {pendingSurveyCount}
              </span>
            </button>
          )}

          {/* Status filter icon */}
          <Popover open={barStatusOpen} onOpenChange={setBarStatusOpen}>
            <PopoverTrigger
              title="Filter Status"
              className={cn(
                filterIconButtonClass,
                statusFilter && activeFilterControlClass,
              )}
            >
              <ListFilter className="h-4 w-4" />
              {statusFilter && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border-2 border-background" />
              )}
            </PopoverTrigger>
            <PopoverContent className="p-2 min-w-[200px]" align="start">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 pt-1 pb-1.5">Filter Status</p>
              <button
                onClick={() => { setStatusFilter(''); setPage(1); setBarStatusOpen(false) }}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors duration-100",
                  !statusFilter ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                )}
              >
                Semua Status
              </button>
              {(statuses || []).map((st) => {
                const color = getStatusColor(st.name, (st as any).css_class)
                const isActive = statusFilter === st.id.toString()
                return (
                  <button
                    key={st.id}
                    onClick={() => { setStatusFilter(st.id.toString()); setPage(1); setBarStatusOpen(false) }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-2 transition-colors duration-100",
                      isActive ? "bg-amber-500/10 text-amber-300" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {st.name}
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>

          {/* Akun filter icon — super admin only */}
          {isSuperAdmin && (
            <Popover open={barAkunOpen} onOpenChange={setBarAkunOpen}>
              <PopoverTrigger
                title="Filter Akun"
                className={cn(
                  filterIconButtonClass,
                  accountFilter && activeFilterControlClass,
                )}
              >
                <Building2 className="h-4 w-4" />
                {accountFilter && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border-2 border-background" />
                )}
              </PopoverTrigger>
              <PopoverContent className="p-2 min-w-[190px] max-h-[280px] overflow-y-auto" align="start">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 pt-1 pb-1.5">Filter Akun</p>
                <button
                  onClick={() => { setAccountFilter(''); setPage(1); setBarAkunOpen(false) }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors duration-100",
                    !accountFilter ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                  )}
                >
                  Semua Akun
                </button>
                {(accounts || []).map((account: any) => {
                  const isActive = accountFilter === account.id.toString()
                  return (
                    <button
                      key={account.id}
                      onClick={() => { setAccountFilter(account.id.toString()); setPage(1); setBarAkunOpen(false) }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors duration-100",
                        isActive ? "bg-amber-500/10 text-amber-300" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                      )}
                    >
                      {account.name}
                    </button>
                  )
                })}
              </PopoverContent>
            </Popover>
          )}

          {/* Bulan / Tahun filter icon */}
          <Popover open={barPeriodOpen} onOpenChange={setBarPeriodOpen}>
            <PopoverTrigger
              title="Filter Bulan & Tahun"
              className={cn(
                filterIconButtonClass,
                (monthFilter || yearFilter) && activeFilterControlClass,
              )}
            >
              <CalendarDays className="h-4 w-4" />
              {(monthFilter || yearFilter) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border-2 border-background" />
              )}
            </PopoverTrigger>
            <PopoverContent className="p-3 min-w-[248px]" align="start">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5">Filter Bulan & Tahun</p>
              {/* Month grid */}
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Bulan</p>
              <div className="grid grid-cols-4 gap-1 mb-3">
                {monthOptions.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => { setMonthFilter(monthFilter === m.value ? '' : m.value); setPage(1) }}
                    disabled={!!startDate || !!endDate}
                    className={cn(
                      "rounded-lg py-1.5 text-[10px] font-medium transition-all duration-100",
                      monthFilter === m.value
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-muted/40 text-muted-foreground border border-border hover:border-border/80 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                    )}
                  >
                    {m.label.slice(0, 3)}
                  </button>
                ))}
              </div>
              {/* Year grid */}
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1.5">Tahun</p>
              <div className="grid grid-cols-4 gap-1">
                {yearOptions.map((y) => (
                  <button
                    key={y}
                    onClick={() => { setYearFilter(yearFilter === y.toString() ? '' : y.toString()); setPage(1) }}
                    disabled={!!startDate || !!endDate}
                    className={cn(
                      "rounded-lg py-1.5 text-[10px] font-medium transition-all duration-100",
                      yearFilter === y.toString()
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-muted/40 text-muted-foreground border border-border hover:border-border/80 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {(startDate || endDate) && (
                <p className="text-[9px] text-zinc-600 mt-2.5">Nonaktif saat rentang tanggal dipilih.</p>
              )}
            </PopoverContent>
          </Popover>

          {/* Rentang Tanggal filter icon */}
          <Popover open={barDateOpen} onOpenChange={setBarDateOpen}>
            <PopoverTrigger
              title="Filter Rentang Tanggal"
              className={cn(
                filterIconButtonClass,
                (startDate || endDate) && activeFilterControlClass,
              )}
            >
              <CalendarRange className="h-4 w-4" />
              {(startDate || endDate) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border-2 border-background" />
              )}
            </PopoverTrigger>
            <PopoverContent className="p-3 min-w-[210px]" align="start">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5">Rentang Tanggal</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Dari Tanggal</label>
                  <Popover>
                    <PopoverTrigger
                      type="button"
                      className="w-full h-8 justify-between text-left font-normal border border-border bg-background hover:bg-muted/40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/40 text-foreground text-[11px] rounded-lg px-2.5 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden flex items-center"
                    >
                      {startDate ? format(parseISO(startDate), 'dd/MM/yyyy') : <span className="text-muted-foreground/50">Pilih Tanggal</span>}
                      <CalendarIcon className="h-3 w-3 text-muted-foreground/70" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate ? parseISO(startDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const yyyy = date.getFullYear()
                            const mm = String(date.getMonth() + 1).padStart(2, '0')
                            const dd = String(date.getDate()).padStart(2, '0')
                            setStartDate(`${yyyy}-${mm}-${dd}`)
                          } else {
                            setStartDate('')
                          }
                          setMonthFilter('')
                          setYearFilter('')
                          setPage(1)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Sampai Tanggal</label>
                  <Popover>
                    <PopoverTrigger
                      type="button"
                      className="w-full h-8 justify-between text-left font-normal border border-border bg-background hover:bg-muted/40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/40 text-foreground text-[11px] rounded-lg px-2.5 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden flex items-center"
                    >
                      {endDate ? format(parseISO(endDate), 'dd/MM/yyyy') : <span className="text-muted-foreground/50">Pilih Tanggal</span>}
                      <CalendarIcon className="h-3 w-3 text-muted-foreground/70" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate ? parseISO(endDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const yyyy = date.getFullYear()
                            const mm = String(date.getMonth() + 1).padStart(2, '0')
                            const dd = String(date.getDate()).padStart(2, '0')
                            setEndDate(`${yyyy}-${mm}-${dd}`)
                          } else {
                            setEndDate('')
                          }
                          setMonthFilter('')
                          setYearFilter('')
                          setPage(1)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
                    className="text-[10px] text-red-400/70 hover:text-red-300 transition-colors w-full text-left mt-0.5"
                  >
                    Hapus Filter Tanggal
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Reset & Refresh — pushed to the right */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchTerm(''); setStatusFilter(''); setAccountFilter(''); setMonthFilter(''); setYearFilter(''); setStartDate(''); setEndDate(''); setPage(1) }}
              className={cn('h-10 rounded-xl border px-3.5 text-xs', filterControlSurfaceClass)}
            >
              Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              title="Perbarui data"
              aria-label="Perbarui data konsultasi"
              className={cn('size-10 rounded-xl border p-0', filterControlSurfaceClass)}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
            </Button>
          </div>

          </div>{/* end icons row */}
          <div className="flex min-w-0 flex-col gap-2 w-full xl:ml-auto xl:w-auto xl:flex-row xl:items-center">
            <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-2 xl:flex xl:w-auto xl:items-center">
              {/* CSV Import Dialog */}
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger
                  render={
                    <Button variant="ghost" size="sm" className={cn(secondaryFileActionClass, 'w-full xl:w-auto')}>
                      <FileSpreadsheet className="size-3.5 shrink-0 text-amber-600/75 transition-colors group-hover:text-amber-600 dark:text-amber-400/75 dark:group-hover:text-amber-300" />
                      Import CSV
                    </Button>
                  }
                />
                <DialogContent className="border-border bg-card text-foreground rounded-2xl shadow-2xl max-w-md dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:backdrop-blur-xl">
                  <form onSubmit={handleImportSubmit}>
                    <DialogHeader>
                      <DialogTitle className="text-foreground font-bold text-lg">Import Konsultasi via CSV</DialogTitle>
                      <DialogDescription className="text-muted-foreground text-xs mt-1">
                        Unggah file CSV dengan kolom sesuai format template. Proses import dilakukan di latar belakang (queue).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <a
                        href={isMounted ? buildExportUrl('/api/v1/consultations/import/template') : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Template CSV
                      </a>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-amber-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300 bg-muted/40 hover:bg-muted/60 relative group dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:bg-zinc-950/80">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="h-8 w-8 text-muted-foreground/50 group-hover:text-amber-500 group-hover:scale-110 transition-all duration-350 mb-2" />
                        <p className="text-xs font-semibold text-foreground/80">
                          {importFile ? importFile.name : 'Pilih file atau seret file CSV ke sini'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">Maksimal ukuran file 10MB</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setImportOpen(false)}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl dark:hover:bg-zinc-800/50"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={importMutation.isPending}
                        className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold shadow-[0_0_15px_color-mix(in_srgb,var(--primary-theme)_20%,transparent)] rounded-xl"
                      >
                        {importMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Mengunggah...
                          </>
                        ) : (
                          'Mulai Import'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Export Buttons */}
              <a
                href={isMounted ? buildExportUrl('/api/v1/export/leads/excel', {
                  search: debouncedSearch || undefined,
                  status: statusFilter || undefined,
                  account: accountFilter || undefined,
                  month: monthFilter || undefined,
                  year: yearFilter || undefined,
                  start_date: startDate || undefined,
                  end_date: endDate || undefined,
                }) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryFileActionClass}
              >
                <FileSpreadsheet className="size-3.5 shrink-0 text-amber-600/75 transition-colors group-hover:text-amber-600 dark:text-amber-400/75 dark:group-hover:text-amber-300" />
                Excel
              </a>
              <a
                href={isMounted ? buildExportUrl('/api/v1/export/leads/pdf', {
                  search: debouncedSearch || undefined,
                  status: statusFilter || undefined,
                  account: accountFilter || undefined,
                  month: monthFilter || undefined,
                  year: yearFilter || undefined,
                  start_date: startDate || undefined,
                  end_date: endDate || undefined,
                }) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryFileActionClass}
              >
                <Download className="size-3.5 shrink-0 text-amber-600/75 transition-colors group-hover:text-amber-600 dark:text-amber-400/75 dark:group-hover:text-amber-300" />
                PDF
              </a>
            </div>
            <Link
              href="/consultations/create"
              className="inline-flex items-center justify-center h-10 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl transition-all duration-200 shadow-[0_0_16px_color-mix(in_srgb,var(--primary-theme)_30%,transparent)] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary-theme)_45%,transparent)] gap-1.5 w-full xl:w-auto shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Lead Baru
            </Link>
          </div>
        </div>{/* end flex-col */}
      </div>

      {/* Main Grid table */}
      {selectedConsultationIds.size > 0 && (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-[linear-gradient(135deg,color-mix(in_srgb,#ef4444_8%,var(--card))_0%,color-mix(in_srgb,var(--primary-theme)_4%,var(--background))_100%)] px-4 py-3 shadow-[0_12px_28px_-24px_rgba(239,68,68,0.7)] sm:flex-row sm:items-center sm:justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500">
              <ListChecks className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{selectedConsultationIds.size} data dipilih</p>
              <p className="text-[10px] text-muted-foreground">Pilih data lain atau hapus semua data yang sudah ditandai.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBulkDeleting}
              onClick={() => setSelectedConsultationIds(new Set())}
              className="h-9 rounded-xl border-border/80 bg-background/45 px-3 text-[11px]"
            >
              Batal pilih
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBulkDeleting}
              onClick={handleBulkDelete}
              className="h-9 rounded-xl px-3 text-[11px] shadow-[0_8px_18px_-12px_rgba(239,68,68,0.75)]"
            >
              {isBulkDeleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
              {isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedConsultationIds.size} data`}
            </Button>
          </div>
        </div>
      )}

      <div className="data-table-shell">
        {/* Refetching visual feedback overlay */}
        {isRefetching && (
          <div className="absolute inset-0 bg-background/25 backdrop-blur-[1px] z-30 flex items-center justify-center transition-all duration-300">
            <div className="flex items-center gap-2.5 rounded-2xl bg-zinc-950/90 px-4 py-2.5 text-xs font-semibold text-amber-500 shadow-xl border border-zinc-800/80 backdrop-blur-md" style={{ borderColor: 'color-mix(in srgb, var(--primary-theme) 20%, transparent)', color: 'var(--primary-theme)' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memperbarui data...</span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className={cn(softActionGradientClass, '[&_th]:!bg-transparent')}>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="w-[52px] border-b border-border bg-muted/60 px-4 py-3.5 text-center dark:border-zinc-700/60 dark:bg-zinc-800/80">
                  <Checkbox
                    checked={areAllVisibleSelected}
                    indeterminate={areSomeVisibleSelected}
                    disabled={visibleConsultationIds.length === 0 || isBulkDeleting}
                    onCheckedChange={toggleAllVisibleConsultations}
                    aria-label="Pilih semua data konsultasi pada halaman ini"
                    title="Pilih semua pada halaman ini"
                    className="mx-auto size-[18px] rounded-md border-[color:color-mix(in_srgb,var(--primary-theme)_48%,var(--border))] bg-background/55 hover:border-[color:color-mix(in_srgb,var(--primary-theme)_72%,var(--border))] data-checked:border-[color:var(--primary-theme)] data-checked:bg-[var(--primary-theme)] data-checked:text-zinc-950 data-indeterminate:border-[color:var(--primary-theme)] data-indeterminate:bg-[var(--primary-theme)] data-indeterminate:text-zinc-950"
                  />
                </TableHead>

                {/* ID Lead */}
                <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em] py-3.5 px-5 bg-muted/60 border-b border-border whitespace-nowrap dark:text-zinc-300 dark:bg-zinc-800/80 dark:border-zinc-700/60 w-[130px]">
                  ID Lead
                </TableHead>

                {/* Klien */}
                <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em] py-3.5 px-5 bg-muted/60 border-b border-border whitespace-nowrap dark:text-zinc-300 dark:bg-zinc-800/80 dark:border-zinc-700/60">
                  Klien
                </TableHead>

                {/* Kota / Wilayah */}
                <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em] py-3.5 px-5 bg-muted/60 border-b border-border whitespace-nowrap dark:text-zinc-300 dark:bg-zinc-800/80 dark:border-zinc-700/60">
                  Kota / Wilayah
                </TableHead>

                {/* Kebutuhan */}
                <TableHead className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em] py-3.5 px-5 bg-muted/60 border-b border-border whitespace-nowrap dark:text-zinc-300 dark:bg-zinc-800/80 dark:border-zinc-700/60">
                  Kebutuhan
                </TableHead>

                {/* Tgl Konsul — date range popover filter */}
                <TableHead className="bg-muted/60 border-b border-border whitespace-nowrap py-3.5 px-5 dark:bg-zinc-800/80 dark:border-zinc-700/60">
                  <Popover open={konsulDatePopOpen} onOpenChange={setKonsulDatePopOpen}>
                    <PopoverTrigger className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 cursor-pointer select-none",
                      (startDate || endDate) ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300"
                    )}>
                      Tgl Konsul
                      {(startDate || endDate)
                        ? <CalendarIcon className="h-3 w-3" />
                        : <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", konsulDatePopOpen && "rotate-180")} />
                      }
                    </PopoverTrigger>
                    <PopoverContent className="p-3 min-w-[210px]" align="start">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Filter Tgl Konsul</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1">Dari Tanggal</label>
                          <Popover>
                            <PopoverTrigger
                              type="button"
                              className="w-full h-8 justify-between text-left font-normal border border-border bg-background hover:bg-muted/40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/40 text-foreground text-[11px] rounded-lg px-2.5 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden flex items-center"
                            >
                              {startDate ? format(parseISO(startDate), 'dd/MM/yyyy') : <span className="text-muted-foreground/50">Pilih Tanggal</span>}
                              <CalendarIcon className="h-3 w-3 text-muted-foreground/70" />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={startDate ? parseISO(startDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const yyyy = date.getFullYear()
                                    const mm = String(date.getMonth() + 1).padStart(2, '0')
                                    const dd = String(date.getDate()).padStart(2, '0')
                                    setStartDate(`${yyyy}-${mm}-${dd}`)
                                  } else {
                                    setStartDate('')
                                  }
                                  setMonthFilter('')
                                  setPage(1)
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-1">Sampai Tanggal</label>
                          <Popover>
                            <PopoverTrigger
                              type="button"
                              className="w-full h-8 justify-between text-left font-normal border border-border bg-background hover:bg-muted/40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/40 text-foreground text-[11px] rounded-lg px-2.5 focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden flex items-center"
                            >
                              {endDate ? format(parseISO(endDate), 'dd/MM/yyyy') : <span className="text-muted-foreground/50">Pilih Tanggal</span>}
                              <CalendarIcon className="h-3 w-3 text-muted-foreground/70" />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={endDate ? parseISO(endDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const yyyy = date.getFullYear()
                                    const mm = String(date.getMonth() + 1).padStart(2, '0')
                                    const dd = String(date.getDate()).padStart(2, '0')
                                    setEndDate(`${yyyy}-${mm}-${dd}`)
                                  } else {
                                    setEndDate('')
                                  }
                                  setMonthFilter('')
                                  setPage(1)
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        {(startDate || endDate) && (
                          <button
                            onClick={() => { setStartDate(''); setEndDate(''); setPage(1); setKonsulDatePopOpen(false) }}
                            className="text-[10px] text-red-400/70 hover:text-red-300 transition-colors w-full text-left mt-1"
                          >
                            Hapus Filter Tanggal
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableHead>

                {/* Tgl Update — sortable */}
                <TableHead className="bg-muted/60 border-b border-border whitespace-nowrap py-3.5 px-5 dark:bg-zinc-800/80 dark:border-zinc-700/60">
                  <button
                    onClick={() => setUpdateSortDir((prev) => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 cursor-pointer select-none",
                      updateSortDir ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300"
                    )}
                  >
                    Tgl Update
                    {updateSortDir === 'desc'
                      ? <ArrowDown className="h-3 w-3" />
                      : updateSortDir === 'asc'
                      ? <ArrowUp className="h-3 w-3" />
                      : <ArrowUpDown className="h-3 w-3 opacity-50" />
                    }
                  </button>
                </TableHead>

                {/* Status — popover filter */}
                <TableHead className="bg-muted/60 border-b border-border whitespace-nowrap py-3.5 px-5 dark:bg-zinc-800/80 dark:border-zinc-700/60 text-center">
                  <Popover open={statusPopOpen} onOpenChange={setStatusPopOpen}>
                    <PopoverTrigger className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 cursor-pointer select-none",
                      statusFilter ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300"
                    )}>
                      Status
                      <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", statusPopOpen && "rotate-180")} />
                    </PopoverTrigger>
                    <PopoverContent className="p-2 min-w-[190px]" align="center">
                      <button
                        onClick={() => { setStatusFilter(''); setPage(1); setStatusPopOpen(false) }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors duration-100",
                          !statusFilter ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                        )}
                      >
                        Semua Status
                      </button>
                      {(statuses || []).map((st) => {
                        const color = getStatusColor(st.name, (st as any).css_class)
                        const isActive = statusFilter === st.id.toString()
                        return (
                          <button
                            key={st.id}
                            onClick={() => { setStatusFilter(st.id.toString()); setPage(1); setStatusPopOpen(false) }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-2 transition-colors duration-100",
                              isActive ? "bg-amber-500/10 text-amber-300" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 flex-none" style={{ backgroundColor: color }} />
                            {st.name}
                          </button>
                        )
                      })}
                    </PopoverContent>
                  </Popover>
                </TableHead>

                {/* Akun (super admin) — popover filter */}
                {isSuperAdmin && (
                  <TableHead className="bg-muted/60 border-b border-border whitespace-nowrap py-3.5 px-5 dark:bg-zinc-800/80 dark:border-zinc-700/60">
                    <Popover open={akunPopOpen} onOpenChange={setAkunPopOpen}>
                      <PopoverTrigger className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 cursor-pointer select-none",
                        accountFilter ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300"
                      )}>
                        Akun
                        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", akunPopOpen && "rotate-180")} />
                      </PopoverTrigger>
                      <PopoverContent className="p-2 min-w-[180px] max-h-[240px] overflow-y-auto" align="start">
                        <button
                          onClick={() => { setAccountFilter(''); setPage(1); setAkunPopOpen(false) }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors duration-100",
                            !accountFilter ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                          )}
                        >
                          Semua Akun
                        </button>
                        {(accounts || []).map((account: any) => {
                          const isActive = accountFilter === account.id.toString()
                          return (
                            <button
                              key={account.id}
                              onClick={() => { setAccountFilter(account.id.toString()); setPage(1); setAkunPopOpen(false) }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors duration-100",
                                isActive ? "bg-amber-500/10 text-amber-300" : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                              )}
                            >
                              {account.name}
                            </button>
                          )
                        })}
                      </PopoverContent>
                    </Popover>
                  </TableHead>
                )}

                {/* Aksi */}
                <TableHead className="w-[132px] whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 10 : 9} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                      <span className="text-xs font-medium tracking-wide">Memuat data konsultasi...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : consultations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 10 : 9} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                      <Search className="h-7 w-7" />
                      <span className="text-xs">Tidak ditemukan data konsultasi yang sesuai filter.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedConsultations.map((lead, idx) => (
                  <TableRow
                    key={lead.id}
                    data-state={selectedConsultationIds.has(lead.id) ? 'selected' : undefined}
                    className={cn(
                      'border-b border-border/30 transition-all duration-150 group dark:border-zinc-700/30',
                      selectedConsultationIds.has(lead.id)
                        ? 'bg-[color-mix(in_srgb,var(--primary-theme)_8%,transparent)] shadow-[inset_3px_0_0_color-mix(in_srgb,var(--primary-theme)_80%,transparent)] dark:bg-[color-mix(in_srgb,var(--primary-theme)_10%,transparent)]'
                        : idx % 2 !== 0 ? 'bg-muted/20 dark:bg-zinc-700/20' : 'bg-transparent dark:bg-zinc-800/10',
                      'hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--primary-theme)_7%,transparent)]'
                    )}
                  >
                    {/* ID Lead — left border accent on hover */}
                    <TableCell className="w-[52px] px-4 py-3.5 text-center">
                      <Checkbox
                        checked={selectedConsultationIds.has(lead.id)}
                        disabled={isBulkDeleting}
                        onCheckedChange={(checked) => toggleConsultationSelection(lead.id, checked)}
                        aria-label={`Pilih konsultasi ${lead.client_name}`}
                        className="mx-auto size-[18px] rounded-md border-[color:color-mix(in_srgb,var(--primary-theme)_48%,var(--border))] bg-background/55 hover:border-[color:color-mix(in_srgb,var(--primary-theme)_72%,var(--border))] data-checked:border-[color:var(--primary-theme)] data-checked:bg-[var(--primary-theme)] data-checked:text-zinc-950"
                      />
                    </TableCell>

                    <TableCell className="py-3.5 px-5 transition-colors duration-150">
                      <span className="font-mono text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-[color:color-mix(in_srgb,var(--primary-theme)_85%,var(--foreground))] dark:text-zinc-400">
                        {lead.consultation_id}
                      </span>
                    </TableCell>

                    {/* Klien */}
                    <TableCell className="py-3.5 px-5">
                      <div>
                        <p className="text-[12.5px] font-semibold text-foreground transition-colors leading-tight group-hover:text-[color:color-mix(in_srgb,var(--primary-theme)_82%,var(--foreground))] dark:text-zinc-100">
                          {lead.client_name}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                          {lead.phone || '—'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Kota */}
                    <TableCell className="py-3.5 px-5 max-w-[140px]">
                      <span className="text-[11px] text-muted-foreground truncate block dark:text-zinc-400">{lead.city || 'Luar Kota'}</span>
                    </TableCell>

                    {/* Kebutuhan — sel dijaga ringkas; daftar lengkap lewat tooltip */}
                    <TableCell className="py-3.5 px-5">
                      {(() => {
                        const categories = productCategoryNames(lead)

                        if (categories.length === 0) {
                          return <span className="text-[11px] text-foreground/80 font-medium dark:text-zinc-300">—</span>
                        }

                        const summary = (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80 font-medium dark:text-zinc-300">
                            <span className="truncate">{categories[0]}</span>
                            {categories.length > 1 && (
                              <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                +{categories.length - 1}
                              </span>
                            )}
                          </span>
                        )

                        // Satu kategori tidak perlu tooltip.
                        if (categories.length === 1) {
                          return summary
                        }

                        return (
                          <Tooltip>
                            <TooltipTrigger className="cursor-default text-left">{summary}</TooltipTrigger>
                            <TooltipContent className="flex-col items-start gap-1">
                              {categories.map((name) => (
                                <span key={name}>{name}</span>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        )
                      })()}
                    </TableCell>

                    {/* Tgl Konsul */}
                    <TableCell className="py-3.5 px-5 whitespace-nowrap">
                      <span className="text-[11px] text-muted-foreground dark:text-zinc-400">
                        {lead.consultation_date
                          ? new Date(lead.consultation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </span>
                    </TableCell>

                    {/* Tgl Update */}
                    <TableCell className="py-3.5 px-5 whitespace-nowrap">
                      <p className="text-[11px] text-muted-foreground dark:text-zinc-400">
                        {lead.updated_at
                          ? new Date(lead.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                        {lead.updated_at
                          ? new Date(lead.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </p>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5 px-5 text-center">
                      {lead.status_category && (() => {
                        const color = getStatusColor(lead.status_category.name, lead.status_category.css_class)
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 text-[9.5px] rounded-full font-bold uppercase tracking-wider px-2.5 py-[3px] border whitespace-nowrap"
                            style={{
                              color,
                              backgroundColor: `${color}14`,
                              borderColor: `${color}45`,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            {lead.status_category.name}
                          </span>
                        )
                      })()}
                    </TableCell>

                    {/* Akun (super admin only) */}
                    {isSuperAdmin && (
                      <TableCell className="py-3.5 px-5">
                        <span className="text-[11px] text-foreground/80 font-medium dark:text-zinc-300">
                          {lead.account?.name || '—'}
                        </span>
                      </TableCell>
                    )}

                    {/* Aksi */}
                    <TableCell className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 transition-opacity duration-150 group-hover:opacity-100">
                        <Link
                          href={`/consultations/${lead.id}`}
                          aria-label={`Lihat detail ${lead.client_name}`}
                          title="Lihat detail"
                          className={cn(
                            buttonVariants({ size: "icon-xs", variant: "ghost" }),
                            "h-9 w-9 rounded-xl border border-black/30 bg-[color-mix(in_srgb,var(--primary-theme)_6%,var(--background))] text-[color:var(--primary-theme)] shadow-none transition-[border-color,background-color,color,transform] duration-150 hover:border-black/45 hover:bg-[color-mix(in_srgb,var(--primary-theme)_12%,var(--background))] focus-visible:ring-1 focus-visible:ring-black/30 active:translate-y-px dark:border-white/20 dark:bg-[color-mix(in_srgb,var(--primary-theme)_8%,var(--background))] dark:hover:border-white/35 dark:focus-visible:ring-white/30"
                          )}
                        >
                          <Eye className="h-4 w-4" strokeWidth={2.25} />
                        </Link>
                        <Link
                          href={`/consultations/${lead.id}/edit`}
                          aria-label={`Edit ${lead.client_name}`}
                          title="Edit konsultasi"
                          className={cn(
                            buttonVariants({ size: "icon-xs", variant: "ghost" }),
                            "h-9 w-9 rounded-xl border border-black/30 bg-[color-mix(in_srgb,var(--primary-theme)_6%,var(--background))] text-[color:var(--primary-theme)] shadow-none transition-[border-color,background-color,color,transform] duration-150 hover:border-black/45 hover:bg-[color-mix(in_srgb,var(--primary-theme)_12%,var(--background))] focus-visible:ring-1 focus-visible:ring-black/30 active:translate-y-px dark:border-white/20 dark:bg-[color-mix(in_srgb,var(--primary-theme)_8%,var(--background))] dark:hover:border-white/35 dark:focus-visible:ring-white/30"
                          )}
                        >
                          <Edit2 className="h-4 w-4" strokeWidth={2.25} />
                        </Link>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleDelete(lead.id)}
                          aria-label={`Hapus ${lead.client_name}`}
                          title="Hapus konsultasi"
                          className="h-9 w-9 rounded-xl border border-black/30 bg-red-500/[0.055] text-red-500/90 shadow-none transition-[border-color,background-color,color,transform] duration-150 hover:border-black/45 hover:bg-red-500/[0.12] hover:text-red-400 focus-visible:ring-1 focus-visible:ring-black/30 active:translate-y-px dark:border-white/20 dark:bg-red-500/[0.07] dark:hover:border-white/35 dark:focus-visible:ring-white/30"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination controls */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-muted-foreground/70">
            Menampilkan <span className="font-semibold text-muted-foreground">{consultations.length}</span> dari <span className="font-semibold text-muted-foreground">{meta.total}</span> leads terdaftar.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:opacity-30 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50 dark:text-zinc-300"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Sebelumnya
            </Button>
            <span className="text-xs font-semibold text-muted-foreground px-2">
              Halaman {meta.current_page} dari {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="xs"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:opacity-30 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50 dark:text-zinc-300"
            >
              Selanjutnya
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
