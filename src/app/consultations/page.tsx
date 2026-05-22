'use client'

import { useState, useEffect } from 'react'
import { useConsultations, useDeleteConsultation, useImportConsultations } from '@/lib/hooks/useConsultations'
import { useAccounts, useStatusCategories } from '@/lib/hooks/useMasterData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Calendar,
  Trash2,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDebounce } from 'use-debounce'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { CustomSelect } from '@/components/ui/custom-select'
import { buildExportUrl } from '@/lib/api/client'

export default function ConsultationsPage() {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  // Filter state variables
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [statusFilter, setStatusFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  // Reset to first page when search filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, accountFilter, monthFilter, yearFilter, startDate, endDate])

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
    page,
    per_page: 10,
  })

  const { data: statuses } = useStatusCategories()
  const { data: accounts } = useAccounts()
  const deleteMutation = useDeleteConsultation()
  const importMutation = useImportConsultations()

  const consultations = response?.data || []
  const meta = response?.meta
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

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus data konsultasi ini?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Konsultasi berhasil dihapus')
        },
        onError: () => {
          toast.error('Gagal menghapus konsultasi')
        },
      })
    }
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
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-amber-200 dark:via-amber-400 dark:to-amber-100 dark:bg-clip-text dark:text-transparent">
            Daftar Konsultasi
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola dan pantau seluruh data pipeline lead konsultasi klien secara real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Import Dialog */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm" className="border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 hover:border-amber-500/30 transition-all duration-300 rounded-xl h-9 dark:bg-zinc-950/45 dark:border-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800/60">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
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
                    href={buildExportUrl('/api/v1/consultations/import/template')}
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
                    className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold shadow-[0_0_15px_rgba(245,158,11,0.2)] rounded-xl"
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
            href={buildExportUrl('/api/v1/export/leads/excel', {
              search: debouncedSearch || undefined,
              status: statusFilter || undefined,
              account: accountFilter || undefined,
              month: monthFilter || undefined,
              year: yearFilter || undefined,
              start_date: startDate || undefined,
              end_date: endDate || undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 hover:border-amber-500/30 transition-all duration-300 rounded-xl h-9 dark:bg-zinc-950/45 dark:border-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            )}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Excel
          </a>
          <a
            href={buildExportUrl('/api/v1/export/leads/pdf', {
              search: debouncedSearch || undefined,
              status: statusFilter || undefined,
              account: accountFilter || undefined,
              month: monthFilter || undefined,
              year: yearFilter || undefined,
              start_date: startDate || undefined,
              end_date: endDate || undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 hover:border-amber-500/30 transition-all duration-300 rounded-xl h-9 dark:bg-zinc-950/45 dark:border-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            )}
          >
            <Download className="h-4 w-4 mr-1.5" />
            PDF
          </a>

          <Link
            href="/consultations/create"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-xl h-9"
            )}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Lead Baru
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <div className="glass-panel p-5 border border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60 dark:shadow-black/25">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {/* Search Input */}
          <div className="relative sm:col-span-2 xl:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Cari nama atau telepon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-border bg-background/60 rounded-xl placeholder:text-muted-foreground/40 text-foreground focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
            />
          </div>

          {/* Status Select */}
          <div>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Semua Status"
              options={[
                { value: "", label: "Semua Status" },
                ...(statuses || []).map((st) => ({
                  value: st.id.toString(),
                  label: st.name
                }))
              ]}
              className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 hover:bg-muted/50 transition-all duration-300 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
            />
          </div>

          {/* Account Select */}
          {isSuperAdmin && (
            <div>
              <CustomSelect
                value={accountFilter}
                onChange={(val) => {
                  setAccountFilter(val)
                  setPage(1)
                }}
                placeholder="Semua Cabang"
                options={[
                  { value: "", label: "Semua Cabang" },
                  ...(accounts || []).map((account: any) => ({
                    value: account.id.toString(),
                    label: account.name
                  }))
                ]}
                className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 hover:bg-muted/50 transition-all duration-300 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
              />
            </div>
          )}

          {/* Month Select */}
          <div className={isSuperAdmin ? "" : "sm:col-span-2 xl:col-span-2"}>
            <CustomSelect
              value={monthFilter}
              onChange={(val) => {
                setMonthFilter(val)
                setPage(1)
              }}
              disabled={!!startDate || !!endDate}
              placeholder="Semua Bulan"
              options={[
                { value: "", label: "Semua Bulan" },
                ...monthOptions.map((month) => ({
                  value: month.value,
                  label: month.label
                }))
              ]}
              className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 hover:bg-muted/50 transition-all duration-300 disabled:opacity-40 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
            />
          </div>

          {/* Year Select */}
          <div>
            <CustomSelect
              value={yearFilter}
              onChange={(val) => {
                setYearFilter(val)
                setPage(1)
              }}
              disabled={!!startDate || !!endDate}
              placeholder="Semua Tahun"
              options={[
                { value: "", label: "Semua Tahun" },
                ...yearOptions.map((year) => ({
                  value: year.toString(),
                  label: year.toString()
                }))
              ]}
              className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 hover:bg-muted/50 transition-all duration-300 disabled:opacity-40 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
            />
          </div>

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setMonthFilter('')
                setPage(1)
              }}
              className="pl-9 h-10 border-border bg-background/60 rounded-xl text-xs text-foreground focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setMonthFilter('')
                setPage(1)
              }}
              className="pl-9 h-10 border-border bg-background/60 rounded-xl text-xs text-foreground focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
            />
          </div>

          {/* Actions / Reset */}
          <div className="flex gap-2 sm:col-span-2 md:col-span-1 xl:col-span-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setAccountFilter('')
                setMonthFilter('')
                setYearFilter('')
                setStartDate('')
                setEndDate('')
                setPage(1)
              }}
              className="flex-1 h-10 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted/60 rounded-xl transition-all duration-300 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
            >
              Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="px-3 h-10 border border-border hover:bg-muted/60 rounded-xl transition-all duration-300 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid table */}
      <div className="glass-panel border border-border/60 shadow-xl rounded-2xl overflow-hidden dark:border-zinc-800/60 dark:shadow-black/30">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border dark:bg-zinc-950/40 dark:border-zinc-800">
              <TableRow className="border-border/80 hover:bg-transparent dark:border-zinc-800/80">
                <TableHead className="w-[120px] text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6">ID Lead</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6">Klien</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6">Kota / Wilayah</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6">Kebutuhan</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6">Tgl Konsul</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6 text-center">Status</TableHead>
                {isSuperAdmin && <TableHead className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6">Cabang</TableHead>}
                <TableHead className="w-[100px] text-right text-muted-foreground text-[11px] font-bold uppercase tracking-wider py-4 px-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                      <span className="text-xs font-medium tracking-wide">Memuat data konsultasi...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : consultations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} className="h-40 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-6 w-6 text-muted-foreground/40" />
                      <span>Tidak ditemukan data konsultasi yang sesuai filter.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                consultations.map((lead) => (
                  <TableRow key={lead.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-200 dark:border-zinc-800/40 dark:hover:bg-zinc-800/15">
                    <TableCell className="font-semibold text-xs text-foreground/80 py-4 px-6">
                      {lead.consultation_id}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div>
                        <p className="text-xs font-semibold text-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer">{lead.client_name}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{lead.phone || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-4 px-6 truncate max-w-[150px]">
                      {lead.city || 'Luar Kota'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-4 px-6">
                      {lead.needs_category?.name || 'Kebutuhan Umum'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-4 px-6">
                      {lead.consultation_date ? new Date(lead.consultation_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : '-'}
                    </TableCell>
                    <TableCell className="text-center py-4 px-6">
                      {lead.status_category && (
                        <Badge
                          variant="outline"
                          className="text-[9px] rounded-lg font-bold uppercase tracking-wider px-2 py-0.5 border"
                          style={{
                            borderColor: lead.status_category.css_class || '#71717a',
                            color: lead.status_category.css_class || '#71717a',
                            backgroundColor: lead.status_category.css_class ? `${lead.status_category.css_class}15` : 'transparent',
                          }}
                        >
                          {lead.status_category.name}
                        </Badge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-xs text-muted-foreground font-medium py-4 px-6">
                        {lead.account?.name || '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/consultations/${lead.id}`}
                          className={cn(
                            buttonVariants({ size: "icon-xs", variant: "ghost" }),
                            "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all duration-200"
                          )}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleDelete(lead.id)}
                          className="text-muted-foreground/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
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
