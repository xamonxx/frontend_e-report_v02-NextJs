'use client'

import { useState, useEffect, useRef } from 'react'
import {
  useAccountsList,
  useAccountCategories,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  AccountItem
} from '@/lib/hooks/useAccounts'
import { CustomSelect } from '@/components/ui/custom-select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Building,
  Upload,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  SearchX,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'
import { api } from '@/lib/api/client'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Ringkasan progress target satu akun, dipakai tabel maupun kartu mobile. */
function accountProgress(acc: AccountItem) {
  const total = acc.consultations_count || 0
  const target = acc.target_leads || 0
  return {
    total,
    target,
    percent: target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0,
  }
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(percent >= 100 ? 'text-emerald-500' : 'text-amber-500')}>{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted dark:bg-zinc-950"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', percent >= 100 ? 'bg-emerald-500' : 'bg-amber-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

// Logo dibaca langsung dari disk publik Laravel: aset statis, tidak lewat
// /api/v1 dan tidak butuh auth, jadi cukup disambung ke base URL.
function AccountLogo({ acc, className }: { acc: AccountItem; className?: string }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted dark:border-zinc-700 dark:bg-zinc-900', className)}>
      {acc.logo_path ? (
        <img src={`${api.baseUrl}/storage/${acc.logo_path}`} alt={acc.name} className="h-full w-full object-cover" />
      ) : (
        <Building className="h-5 w-5 text-muted-foreground/50" />
      )}
    </div>
  )
}

function GroupBadge({ value }: { value?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 shadow-sm dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.65)]" />
      {value || 'Umum'}
    </span>
  )
}

/**
 * Input grup akun dengan auto-suggest: menampilkan grup yang sudah ada
 * (kolom `description` akun lain) sambil tetap mengizinkan ketik grup baru.
 */
function GroupCombobox({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const q = value.trim().toLowerCase()
  const filtered = options.filter((o) => o.toLowerCase().includes(q))
  const hasExact = options.some((o) => o.toLowerCase() === q)
  const showAdd = q.length > 0 && !hasExact

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id="acc-desc"
        placeholder="Ketik atau pilih grup, mis. PC, NPP"
        value={value}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="h-10 rounded-lg border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
      />
      {open && (filtered.length > 0 || showAdd) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.55)] dark:border-zinc-800 dark:bg-zinc-950">
          {filtered.map((o) => {
            const active = o.toLowerCase() === q
            return (
              <button
                key={o}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted dark:hover:bg-zinc-800/70',
                  active ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-foreground/90',
                )}
              >
                <span className="truncate">{o}</span>
              </button>
            )
          })}
          {showAdd && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(value.trim())}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Tambah &quot;{value.trim()}&quot; sebagai grup baru</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AdminBadges({ acc }: { acc: AccountItem }) {
  if (!acc.admins || acc.admins.length === 0) {
    return <span className="text-[10px] italic text-muted-foreground/60">Belum ada admin</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {acc.admins.map((adm) => (
        <span
          key={adm.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-cyan-700 shadow-sm dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300"
        >
          <UserCheck className="h-3 w-3" />
          {adm.name}
        </span>
      ))}
    </div>
  )
}

export default function AccountsPage() {
  const confirm = useConfirm()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  // Reset to first page when search or category filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category])

  // Category filter options (kolom description)
  const { data: categoryOptions } = useAccountCategories()

  // API query
  const { data: response, isLoading } = useAccountsList({
    search: debouncedSearch,
    category: category || undefined,
    page,
    per_page: 10,
  })
  const accounts = response?.data || []
  const meta = response?.meta
  const hasActiveFilter = debouncedSearch.trim() !== '' || category !== ''

  const clearFilters = () => {
    setSearchTerm('')
    setCategory('')
  }

  // Mutations
  const createMutation = useCreateAccount()
  const deleteMutation = useDeleteAccount()

  // Form modals state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<AccountItem | null>(null)

  // Form values state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetLeads, setTargetLeads] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)

  // Trigger mutations
  const updateMutation = useUpdateAccount(editAccount?.id || 0)

  const handleOpenCreate = () => {
    setEditAccount(null)
    setName('')
    setDescription('')
    setTargetLeads('')
    setLogoFile(null)
    setRemoveLogo(false)
    setDialogOpen(true)
  }

  const handleOpenEdit = (acc: AccountItem) => {
    setEditAccount(acc)
    setName(acc.name)
    setDescription(acc.description || '')
    setTargetLeads(acc.target_leads ? String(acc.target_leads) : '')
    setLogoFile(null)
    setRemoveLogo(false)
    setDialogOpen(true)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nama akun wajib diisi.')
      return
    }

    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    if (targetLeads) {
      formData.append('target_leads', targetLeads)
    }
    if (logoFile) {
      formData.append('logo', logoFile)
    }
    if (removeLogo) {
      formData.append('remove_logo', '1')
    }

    if (editAccount) {
      updateMutation.mutate(formData, {
        onSuccess: (res) => {
          toast.success(res.message || 'Akun berhasil diperbarui!')
          setDialogOpen(false)
        },
        onError: (err: any) => {
          toast.error(err.message || 'Gagal memperbarui data akun.')
        },
      })
    } else {
      createMutation.mutate(formData, {
        onSuccess: (res) => {
          toast.success(res.message || 'Akun baru berhasil ditambahkan!')
          setDialogOpen(false)
        },
        onError: (err: any) => {
          toast.error(err.message || 'Gagal menambahkan akun baru.')
        },
      })
    }
  }

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Akun?',
      description: 'Apakah Anda yakin ingin menghapus akun ini? Seluruh admin yang terhubung akan dilepaskan akunnya.',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
      deleteMutation.mutate(id, {
        onSuccess: (res) => {
          toast.success(res.message || 'Akun berhasil dihapus.')
        },
        onError: (err: any) => {
          toast.error(err.message || 'Gagal menghapus akun.')
        },
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-500">
            <Building className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Kelola Akun / Interior</h1>
              {/* Jumlah dinaikkan ke header supaya skala data terbaca tanpa
                  harus turun ke bar paginasi di bawah tabel. */}
              {!isLoading && meta && meta.total > 0 && (
                <span className="rounded-full border border-border/70 bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900">
                  {meta.total} akun
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Daftar akun interior yang terdaftar di sistem. Super admin dapat menambah, mengedit, atau menghapus akun.
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="h-10 w-full justify-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-semibold text-zinc-950 shadow-[0_10px_24px_-14px_rgba(245,158,11,0.9)] hover:bg-amber-400 lg:w-auto"
              >
                <Plus className="h-4 w-4" />
                Akun Baru
              </Button>
            }
          />
          <DialogContent className="border-border bg-card text-foreground max-w-md p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <form onSubmit={handleFormSubmit} className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editAccount ? 'Edit Detail Akun' : 'Tambah Akun Baru'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Lengkapi form berikut untuk mengonfigurasi detail akun interior.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-1">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-name" className="text-xs font-semibold text-muted-foreground">Nama Akun</Label>
                  <Input
                    id="acc-name"
                    placeholder="Contoh: Putra Interior Surabaya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-lg border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acc-desc" className="text-xs font-semibold text-muted-foreground">Grup / Tagline</Label>
                  <GroupCombobox
                    value={description}
                    onChange={setDescription}
                    options={categoryOptions ?? []}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acc-target" className="text-xs font-semibold text-muted-foreground">Target Bulanan (Leads)</Label>
                  <Input
                    id="acc-target"
                    type="number"
                    placeholder="Contoh: 150"
                    value={targetLeads}
                    onChange={(e) => setTargetLeads(e.target.value)}
                    className="h-10 rounded-lg border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                {/* Upload Logo File */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground block">Logo Akun</Label>
                  <div className="flex flex-col gap-2">
                    {editAccount?.logo_path && !removeLogo && (
                      <div className="flex items-center gap-2 border border-border bg-muted p-2 rounded-xl dark:border-zinc-800 dark:bg-zinc-950">
                        <Building className="h-6 w-6 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground truncate flex-1">Logo terunggah aktif</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => setRemoveLogo(true)}
                          className="text-red-500 hover:bg-muted text-[10px] dark:hover:bg-zinc-800"
                        >
                          Hapus
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center justify-center border-2 border-dashed border-border hover:border-amber-500/50 rounded-xl p-4 cursor-pointer bg-muted relative dark:border-zinc-800 dark:bg-zinc-950">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground/50 mr-2" />
                      <span className="text-xs font-semibold text-muted-foreground truncate">
                        {logoFile ? logoFile.name : 'Pilih file logo...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border/80 pt-4 dark:border-zinc-800/80">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="text-muted-foreground hover:bg-muted text-xs dark:hover:bg-zinc-800"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold text-xs"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editAccount ? (
                    'Perbarui'
                  ) : (
                    'Tambahkan'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar: pencarian + filter grup, dibungkus kartu supaya tidak
          mengambang lepas dari daftar yang dikendalikannya. */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative w-full sm:max-w-md">
          <Search className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50 transition-colors",
            searchTerm && "text-amber-500"
          )} />
          <Input
            placeholder="Cari nama akun, grup, atau admin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 rounded-xl border-border/60 bg-muted pl-10 pr-10 text-sm shadow-none placeholder:text-muted-foreground/50 focus-visible:border-amber-500/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-amber-500/15 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-visible:bg-zinc-900"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800 cursor-pointer"
              title="Bersihkan pencarian"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <CustomSelect
            value={category}
            onChange={setCategory}
            placeholder="Semua Grup"
            options={[
              { value: '', label: 'Semua Grup' },
              ...(categoryOptions || []).map((cat) => ({ value: cat, label: cat })),
            ]}
            className="h-11 w-full sm:w-56 rounded-xl border border-border/60 bg-muted px-3 text-sm text-foreground focus:outline-none focus-visible:border-amber-500/50 focus-visible:ring-2 focus-visible:ring-amber-500/15 dark:border-zinc-800 dark:bg-zinc-900"
          />
          {category && (
            <button
              type="button"
              onClick={() => setCategory('')}
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800 cursor-pointer"
              title="Bersihkan filter grup"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Daftar akun */}
      {isLoading ? (
        // Skeleton menyerupai bentuk tabel, bukan spinner kosong: tinggi
        // halaman tidak melompat saat data akhirnya masuk.
        <div className="overflow-hidden rounded-2xl border border-border bg-card dark:border-zinc-700/60 dark:bg-zinc-800">
          <div className="border-b border-border bg-muted px-5 py-3.5 dark:border-zinc-700/60 dark:bg-zinc-800">
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="divide-y divide-border dark:divide-white/10">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-52 max-w-full" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="hidden h-2 w-40 rounded-full sm:block" />
              </div>
            ))}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        // Dua kondisi kosong yang berbeda: belum punya data sama sekali, atau
        // filter yang tidak menemukan apa pun. Jalan keluarnya juga berbeda.
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <span className="grid size-14 place-items-center rounded-2xl border border-border/70 bg-muted text-muted-foreground/60 dark:border-zinc-800 dark:bg-zinc-900">
            {hasActiveFilter ? <SearchX className="h-6 w-6" /> : <Building className="h-6 w-6" />}
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {hasActiveFilter ? 'Tidak ada akun yang cocok' : 'Belum ada akun terdaftar'}
            </p>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
              {hasActiveFilter
                ? 'Coba kata kunci lain atau lepas filter grup yang sedang aktif.'
                : 'Akun mewakili tiap unit interior. Buat satu akun dulu supaya lead dan target bisa dicatat per unit.'}
            </p>
          </div>
          {hasActiveFilter ? (
            <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Bersihkan filter
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="rounded-xl bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Buat Akun Pertama
            </Button>
          )}
        </div>
      ) : (
        <>
        {/* Kartu untuk layar sempit: tabel min-w 980px memaksa geser
            horizontal di ponsel, praktis tidak terbaca. */}
        <div className="space-y-3 lg:hidden">
          {accounts.map((acc) => {
            const { total, target, percent } = accountProgress(acc)
            return (
              <div key={acc.id} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start gap-3">
                  <AccountLogo acc={acc} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-foreground">{acc.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">ID #{acc.id}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon-xs" variant="ghost" onClick={() => handleOpenEdit(acc)} aria-label={`Edit ${acc.name}`} className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => handleDelete(acc.id)} aria-label={`Hapus ${acc.name}`} className="h-8 w-8 rounded-lg text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <GroupBadge value={acc.description} />

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Total Leads</p>
                    <p className="font-semibold text-foreground/90">{total}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground/70">Request Survey</p>
                    <p className="font-bold text-blue-500">{acc.surveys_count || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Deal</p>
                    <p className="font-bold text-amber-500">{acc.deals_count || 0}</p>
                  </div>
                </div>

                <ProgressBar percent={percent} label={target > 0 ? `${total} / ${target}` : 'Target belum diatur'} />
                <AdminBadges acc={acc} />
              </div>
            )
          })}
        </div>

        <div className="relative hidden max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:block dark:border-zinc-700/60 dark:bg-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['Akun / Interior', 'Grup', 'Total Leads', 'Request Survey', 'Deal', 'Progress Target', 'Admin', 'Aksi'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap border-b border-border bg-muted px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-300">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/65 dark:divide-white/10">
                {accounts.map((acc) => {
                  const { total, target, percent } = accountProgress(acc)

                  return (
                    <tr key={acc.id} className="group border-b border-border border-l-2 border-transparent odd:bg-card even:bg-muted/[0.18] transition-colors hover:border-l-amber-500/60 hover:bg-amber-500/[0.06] dark:border-zinc-800">
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <AccountLogo acc={acc} className="h-10 w-10" />
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-foreground">{acc.name}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">ID #{acc.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <GroupBadge value={acc.description} />
                      </td>
                      <td className="px-5 py-3.5 align-middle font-semibold text-foreground/90">{total}</td>
                      <td className="px-5 py-3.5 align-middle font-bold text-blue-500">{acc.surveys_count || 0}</td>
                      <td className="px-5 py-3.5 align-middle font-bold text-amber-500">{acc.deals_count || 0}</td>
                      <td className="w-[250px] px-5 py-3.5 align-middle">
                        <ProgressBar percent={percent} label={target > 0 ? `${total} / ${target}` : 'Target belum diatur'} />
                      </td>
                      <td className="max-w-[240px] px-5 py-3.5 align-middle">
                        <AdminBadges acc={acc} />
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-1">
                          <Button size="icon-xs" variant="ghost" onClick={() => handleOpenEdit(acc)} aria-label={`Edit ${acc.name}`} title="Edit akun" className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-xs" variant="ghost" onClick={() => handleDelete(acc.id)} aria-label={`Hapus ${acc.name}`} title="Hapus akun" className="h-7 w-7 rounded-lg text-muted-foreground/70 hover:bg-red-500/10 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Bar paginasi hanya muncul kalau memang ada yang bisa dipaginasi.
          Sebelumnya tetap tampil saat kosong dengan tombol mati dan teks
          "Menampilkan 0 dari 0 akun. Halaman 1 dari 1". */}
      {meta && meta.total > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] text-muted-foreground/70">
            Menampilkan <span className="font-semibold text-muted-foreground">{accounts.length}</span> dari <span className="font-semibold text-muted-foreground">{meta.total}</span> akun.
          </p>
          <nav aria-label="Pagination akun" className={cn('flex items-center justify-between gap-2 sm:justify-end', meta.last_page <= 1 && 'hidden')}>
            <Button
              variant="outline"
              size="xs"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:cursor-not-allowed disabled:opacity-40 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-300"
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
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:cursor-not-allowed disabled:opacity-40 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-300"
            >
              Selanjutnya
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </nav>
        </div>
      )}
    </div>
  )
}
