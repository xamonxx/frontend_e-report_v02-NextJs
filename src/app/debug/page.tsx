'use client'

import { useState } from 'react'
import { useDebugStats, useGenerateDummy, useClearDummy, useClearLogs } from '@/lib/hooks/useDebug'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useConsultations } from '@/lib/hooks/useConsultations'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Wrench,
  Loader2,
  Activity,
  Database,
  Sparkles,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Zap,
  ShieldAlert
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function DebugPage() {
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats, isRefetching: isStatsRefetching } = useDebugStats()
  const generateMutation = useGenerateDummy()
  const clearMutation = useClearDummy()
  const clearLogsMutation = useClearLogs()

  // State to test bulk filters/searches inside the debug page
  const [dummySearch, setDummySearch] = useState('')
  const [dummyPage, setDummyPage] = useState(1)

  // Fetch consultation list to show dynamic preview of seeded dummy data
  const { data: response, isLoading: isConsultationsLoading, refetch: refetchConsultations } = useConsultations({
    search: '[DUMMY]', // Only fetch dummy data by searching for our tag
    page: dummyPage,
    per_page: 5,
  })

  const dummyLeadsList = response?.data || []
  const meta = response?.meta

  const handleGenerate = (count: number) => {
    toast.promise(
      new Promise((resolve, reject) => {
        generateMutation.mutate(count, {
          onSuccess: (data) => {
            refetchStats()
            refetchConsultations()
            resolve(data)
          },
          onError: (err) => reject(err)
        })
      }),
      {
        loading: `Menghasilkan ${count} data lead dummy...`,
        success: (data: any) => data.message || `Berhasil menghasilkan ${count} data dummy!`,
        error: 'Gagal membuat data dummy.'
      }
    )
  }

  const handleClear = () => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua data dummy? Tindakan ini permanen.')) {
      return
    }

    toast.promise(
      new Promise((resolve, reject) => {
        clearMutation.mutate(undefined, {
          onSuccess: (data) => {
            refetchStats()
            refetchConsultations()
            resolve(data)
          },
          onError: (err) => reject(err)
        })
      }),
      {
        loading: 'Membersihkan data lead dummy...',
        success: (data: any) => data.message || 'Semua data dummy berhasil dibersihkan!',
        error: 'Gagal membersihkan data dummy.'
      }
    )
  }

  const handleClearLogs = () => {
    if (!confirm('Apakah Anda yakin ingin membersihkan seluruh log sistem (log file Laravel & audit log database)? Tindakan ini permanen.')) {
      return
    }

    toast.promise(
      new Promise((resolve, reject) => {
        clearLogsMutation.mutate(undefined, {
          onSuccess: (data) => {
            refetchStats()
            resolve(data)
          },
          onError: (err) => reject(err)
        })
      }),
      {
        loading: 'Membersihkan log sistem...',
        success: (data: any) => data.message || 'Log sistem berhasil dibersihkan!',
        error: (err: any) => err?.response?.data?.message || 'Gagal membersihkan log sistem.'
      }
    )
  }

  const handleManualRefresh = () => {
    refetchStats()
    refetchConsultations()
    toast.success('Data diagnostik berhasil diperbarui!')
  }

  // Latency styling helpers
  const getLatencyColor = (ms?: number) => {
    if (!ms) return 'text-zinc-400'
    if (ms < 15) return 'text-green-500'
    if (ms < 50) return 'text-amber-500'
    return 'text-red-500'
  }

  const getLatencyBadge = (ms?: number) => {
    if (!ms) return 'Unknown'
    if (ms < 15) return 'Sangat Cepat (Optimal)'
    if (ms < 50) return 'Cukup Cepat'
    return 'Lambat (Butuh Optimasi)'
  }

  const getLatencyBg = (ms?: number) => {
    if (!ms) return 'bg-zinc-500/10'
    if (ms < 15) return 'bg-green-500/10 border-green-500/20 text-green-400'
    if (ms < 50) return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    return 'bg-red-500/10 border-red-500/20 text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-amber-200 dark:via-amber-400 dark:to-amber-100 dark:bg-clip-text dark:text-transparent">
            Debug & Diagnostic Panel
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gunakan panel ini untuk menguji performa, paginasi, dan fungsionalitas sistem di bawah beban data tinggi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isStatsLoading || isStatsRefetching}
            className="border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 hover:border-amber-500/30 transition-all duration-300 rounded-xl h-9 dark:bg-zinc-950/45 dark:border-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", (isStatsLoading || isStatsRefetching) && "animate-spin")} />
            Perbarui Status
          </Button>
        </div>
      </div>

      {/* Overview Metric Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric Card 1: Latency */}
        <Card className="glass-panel border-border/50 bg-card/40 shadow-md rounded-2xl dark:border-zinc-800/60 dark:bg-zinc-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">DB Latency</CardTitle>
            <Activity className={cn("h-4 w-4", getLatencyColor(stats?.latency_ms))} />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            ) : (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{stats?.latency_ms ?? 0}</span>
                  <span className="text-xs font-medium text-muted-foreground">ms</span>
                </div>
                <Badge variant="outline" className={cn("mt-2 text-[9px] font-bold py-0.5 rounded-lg border", getLatencyBg(stats?.latency_ms))}>
                  {getLatencyBadge(stats?.latency_ms)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric Card 2: Total Leads */}
        <Card className="glass-panel border-border/50 bg-card/40 shadow-md rounded-2xl dark:border-zinc-800/60 dark:bg-zinc-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Total Leads</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            ) : (
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground">{stats?.total_leads ?? 0}</span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Klien asli: <span className="font-semibold text-foreground/80">{stats?.real_leads ?? 0}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric Card 3: Dummy Leads */}
        <Card className="glass-panel border-border/50 bg-card/40 shadow-md rounded-2xl dark:border-zinc-800/60 dark:bg-zinc-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Dummy Leads</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            ) : (
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground">{stats?.dummy_leads ?? 0}</span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Porsi dummy: <span className="font-semibold text-foreground/80">{stats?.total_leads ? Math.round((stats.dummy_leads / stats.total_leads) * 100) : 0}%</span> dari total
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric Card 4: Potential Duplicates */}
        <Card className="glass-panel border-border/50 bg-card/40 shadow-md rounded-2xl dark:border-zinc-800/60 dark:bg-zinc-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Potensi Duplikat</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", (stats?.duplicate_leads ?? 0) > 0 ? "text-red-500 animate-pulse" : "text-green-500")} />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            ) : (
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground">{stats?.duplicate_leads ?? 0}</span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {(stats?.duplicate_leads ?? 0) > 0 ? 'Ditemukan bentrokan data nomor telepon.' : 'Integritas database optimal.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Control Panel */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Seeding Controls Card */}
        <Card className="glass-panel border-border/60 shadow-lg rounded-2xl md:col-span-2 dark:border-zinc-800/60">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Generator Data Dummy
            </CardTitle>
            <CardDescription className="text-xs">
              Buat data konsultasi dummy dari wilayah Indonesia random, nomor telepon random, kategori random, dan bulan acak dalam 12 bulan terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={generateMutation.isPending || clearMutation.isPending}
                onClick={() => handleGenerate(100)}
                className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 font-bold rounded-xl h-10 px-4 flex-1 shadow-sm transition-all duration-300"
              >
                {generateMutation.isPending && generateMutation.variables === 100 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyemai...
                  </>
                ) : (
                  'Semaikan 100 Leads'
                )}
              </Button>
              <Button
                disabled={generateMutation.isPending || clearMutation.isPending}
                onClick={() => handleGenerate(500)}
                className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold rounded-xl h-10 px-4 flex-1 shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300"
              >
                {generateMutation.isPending && generateMutation.variables === 500 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyemai...
                  </>
                ) : (
                  'Semaikan 500 Leads'
                )}
              </Button>
              <Button
                disabled={generateMutation.isPending || clearMutation.isPending}
                onClick={() => handleGenerate(1000)}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 text-zinc-950 hover:from-amber-400 hover:to-yellow-500 font-bold rounded-xl h-10 px-5 flex-1 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all duration-300"
              >
                {generateMutation.isPending && generateMutation.variables === 1000 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyemai...
                  </>
                ) : (
                  'Semaikan 1000 Leads'
                )}
              </Button>
            </div>

            <div className="bg-muted/40 p-4 border border-border/80 rounded-2xl space-y-2 dark:bg-zinc-950/40 dark:border-zinc-800/80">
              <h4 className="text-xs font-bold text-foreground">💡 Rincian Pengacakan & Penandaan:</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
                <li>Kolom <strong>client_name</strong> diisi dengan kombinasi random dari 100+ nama depan dan belakang khas Indonesia.</li>
                <li>Kolom <strong>phone</strong> diisi dengan nomor seluler Indonesia acak dengan kode provider lokal (0812, 0857, 0878, dll).</li>
                <li>Kolom <strong>consultation_date</strong> didistribusikan secara acak di rentang 12 bulan terakhir.</li>
                <li>Kolom <strong>consultation_id</strong> (ID unik leads) secara otomatis disinkronkan dengan bulan pendaftaran leads bersangkutan.</li>
                <li>Kolom <strong>notes</strong> selalu ditandai dengan awalan <code className="bg-muted px-1.5 py-0.5 rounded border dark:bg-zinc-900 dark:border-zinc-800 text-amber-500 font-mono font-semibold">[DUMMY]</code> untuk keselamatan agar dapat dibersihkan kapan saja.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Panel (Clear dummy & Clear logs) */}
        <div className="space-y-6 md:col-span-1">
          {/* Clear Data Panel */}
          <Card className="glass-panel border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-500">
                <Trash2 className="h-5 w-5" />
                Pembersihan Sistem
              </CardTitle>
              <CardDescription className="text-xs">
                Kosongkan dan bersihkan data leads buatan dari database agar kembali seperti semula.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tindakan ini hanya akan menghapus leads yang memiliki awalan <code className="bg-muted px-1 py-0.5 rounded border dark:bg-zinc-900 dark:border-zinc-800 text-amber-500 font-mono">[DUMMY]</code> pada bagian catatan. Data leads asli buatan pengguna tidak akan terpengaruh.
              </p>
              <Button
                variant="destructive"
                disabled={clearMutation.isPending || generateMutation.isPending || !stats?.dummy_leads}
                onClick={handleClear}
                className="w-full font-bold rounded-xl h-10 shadow-sm border border-red-500/20 bg-red-500 hover:bg-red-600 transition-all duration-300 disabled:opacity-30 disabled:hover:bg-red-500"
              >
                {clearMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Membersihkan...
                  </>
                ) : (
                  'Bersihkan Seluruh Data Dummy'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Clear Logs Panel */}
          <Card className="glass-panel border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-500">
                <ShieldAlert className="h-5 w-5" />
                Pembersihan Log Sistem
              </CardTitle>
              <CardDescription className="text-xs">
                Hapus seluruh berkas log aplikasi dan tabel audit log untuk mengosongkan ruang penyimpanan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tindakan ini akan mengosongkan berkas log Laravel (<code className="bg-muted px-1.5 py-0.5 rounded border dark:bg-zinc-900 dark:border-zinc-800 text-amber-500 font-mono text-[10px]">storage/logs/*.log</code>) serta tabel <code className="bg-muted px-1.5 py-0.5 rounded border dark:bg-zinc-900 dark:border-zinc-800 text-amber-500 font-mono text-[10px]">audit_logs</code>. Hanya untuk **Super Admin**.
              </p>
              <Button
                variant="destructive"
                disabled={clearLogsMutation.isPending || generateMutation.isPending}
                onClick={handleClearLogs}
                className="w-full font-bold rounded-xl h-10 shadow-sm border border-red-500/20 bg-red-500 hover:bg-red-650 transition-all duration-300 disabled:opacity-30 disabled:hover:bg-red-500"
              >
                {clearLogsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Membersihkan...
                  </>
                ) : (
                  'Bersihkan Seluruh Log Sistem'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Distribution Analysis */}
      <Card className="glass-panel border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Distribusi Data Berdasarkan Bulan
          </CardTitle>
          <CardDescription className="text-xs">
            Visualisasi persebaran volume leads per bulan untuk melihat kecocokan performa grafik/analitik.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isStatsLoading ? (
            <div className="flex h-28 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
              {stats?.monthly_distribution.map((dist, idx) => {
                // Find max count to set height percentage
                const counts = stats.monthly_distribution.map(d => d.count);
                const maxCount = Math.max(...counts, 1);
                const heightPercentage = Math.max((dist.count / maxCount) * 100, 4);

                return (
                  <div key={idx} className="flex flex-col items-center justify-end bg-muted/20 border border-border/40 p-3 rounded-2xl dark:bg-zinc-950/20 dark:border-zinc-900 h-36 relative group hover:border-amber-500/30 transition-all duration-200">
                    <div 
                      className="w-4 bg-gradient-to-t from-amber-500 to-yellow-400 rounded-full transition-all duration-500 group-hover:from-amber-400 group-hover:to-yellow-300"
                      style={{ height: `${heightPercentage}%` }}
                    />
                    <span className="text-[10px] font-bold text-foreground mt-2 text-center truncate w-full">{dist.count}</span>
                    <span className="text-[9px] text-muted-foreground/80 font-medium text-center truncate w-full mt-1">{dist.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Checker / Integrity Inspector */}
      <Card className="glass-panel border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-amber-500" />
              Dummy Leads Inspector
            </CardTitle>
            <CardDescription className="text-xs">
              Pratinjau langsung leads dummy hasil sebaran untuk memastikan pemformatan data, pagination, dan scroll table.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Total terdaftar: <span className="font-semibold text-foreground">{meta?.total ?? 0} dummy leads</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border border-border/60 rounded-xl bg-background/30 dark:border-zinc-900">
            <Table>
              <TableHeader className="bg-muted/40 dark:bg-zinc-950/40">
                <TableRow className="border-border hover:bg-transparent dark:border-zinc-850">
                  <TableHead className="w-[130px] text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3 px-4">ID Lead</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3 px-4">Klien</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3 px-4">No. Telp</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3 px-4">Domisili</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3 px-4">Kategori Kebutuhan</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3 px-4">Tgl Konsul</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3 px-4">Cabang</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isConsultationsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-xs text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Memuat pratinjau leads dummy...
                    </TableCell>
                  </TableRow>
                ) : dummyLeadsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                      Tidak ada data dummy. Klik salah satu tombol di atas untuk menyemai data dummy pertama Anda.
                    </TableCell>
                  </TableRow>
                ) : (
                  dummyLeadsList.map((lead) => (
                    <TableRow key={lead.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-150 dark:border-zinc-900/60 dark:hover:bg-zinc-800/10">
                      <TableCell className="font-mono text-[11px] font-bold text-foreground/80 py-3 px-4">
                        {lead.consultation_id}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground py-3 px-4">
                        {lead.client_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3 px-4">
                        {lead.phone || '-'}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-3 px-4 truncate max-w-[130px]">
                        {lead.district ? `${lead.district}, ` : ''}{lead.city || 'Luar Kota'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3 px-4">
                        {lead.needs_category?.name || 'Umum'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3 px-4">
                        {lead.consultation_date ? new Date(lead.consultation_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3 px-4">
                        {lead.account?.name || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Simple table pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] text-muted-foreground">
                Menampilkan {dummyLeadsList.length} dari {meta.total} records dummy
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={dummyPage <= 1}
                  onClick={() => setDummyPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-[10px] rounded-lg border-border bg-card dark:border-zinc-800"
                >
                  Sebelumnya
                </Button>
                <span className="text-[10px] font-semibold text-muted-foreground px-1">
                  {meta.current_page} / {meta.last_page}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={dummyPage >= meta.last_page}
                  onClick={() => setDummyPage((p) => Math.min(meta.last_page, p + 1))}
                  className="h-7 text-[10px] rounded-lg border-border bg-card dark:border-zinc-800"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
