'use client'

import { useState, useEffect } from 'react'
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
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'
import { buildExportUrl } from '@/lib/api/client'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building className="h-6 w-6 text-amber-500" />
            Kelola Akun / Interior
          </h1>
          <p className="text-xs text-muted-foreground">
            Daftar akun interior yang terdaftar di sistem. Super admin dapat menambah, mengedit, atau menghapus akun.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button onClick={handleOpenCreate} size="sm" className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold">
                <Plus className="h-4 w-4 mr-1.5" />
                Akun Baru
              </Button>
            }
          />
          <DialogContent className="border-border bg-card text-foreground max-w-md dark:border-zinc-800 dark:bg-zinc-900">
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editAccount ? 'Edit Detail Akun' : 'Tambah Akun Baru'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Lengkapi form berikut untuk mengonfigurasi detail akun interior.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-name" className="text-xs font-semibold text-muted-foreground">Nama Akun</Label>
                  <Input
                    id="acc-name"
                    placeholder="Contoh: Putra Interior Surabaya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acc-desc" className="text-xs font-semibold text-muted-foreground">Kategori / Tagline</Label>
                  <Input
                    id="acc-desc"
                    placeholder="Contoh: PC, NPP"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
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
                    className="border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>

                {/* Upload Logo File */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground block">Logo Akun</Label>
                  <div className="flex flex-col gap-2">
                    {editAccount?.logo_path && !removeLogo && (
                      <div className="flex items-center gap-2 border border-border bg-muted/20 p-2 rounded-xl dark:border-zinc-800 dark:bg-zinc-950/40">
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
                    <div className="flex items-center justify-center border-2 border-dashed border-border hover:border-amber-500/50 rounded-xl p-4 cursor-pointer bg-muted/20 relative dark:border-zinc-800 dark:bg-zinc-950/40">
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

      {/* Search + Category Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50 transition-colors",
            searchTerm && "text-amber-500"
          )} />
          <Input
            placeholder="Cari nama akun, kategori, atau admin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 rounded-xl border-border/60 bg-muted/40 pl-10 pr-10 text-sm shadow-none placeholder:text-muted-foreground/50 focus-visible:border-amber-500/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-amber-500/15 dark:border-zinc-800 dark:bg-zinc-900/60 dark:focus-visible:bg-zinc-900"
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
            placeholder="Semua Kategori"
            options={[
              { value: '', label: 'Semua Kategori' },
              ...(categoryOptions || []).map((cat) => ({ value: cat, label: cat })),
            ]}
            className="h-11 w-full sm:w-56 rounded-xl border border-border/60 bg-muted/40 px-3 text-sm text-foreground focus:outline-none focus-visible:border-amber-500/50 focus-visible:ring-2 focus-visible:ring-amber-500/15 dark:border-zinc-800 dark:bg-zinc-900/60"
          />
          {category && (
            <button
              type="button"
              onClick={() => setCategory('')}
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800 cursor-pointer"
              title="Bersihkan filter kategori"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Accounts table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 text-center py-12">Tidak ada akun terdaftar.</p>
      ) : (
        <div className="relative max-w-full overflow-hidden rounded-2xl border border-border bg-card/50 shadow-2xl backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-800/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  {['Akun / Interior', 'Kategori', 'Total Leads', 'Deal', 'Progress Target', 'Admin', 'Aksi'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap border-b border-border bg-muted/60 px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/65 dark:divide-white/10">
                {accounts.map((acc) => {
                  const totalLeads = acc.consultations_count || 0
                  const targetLeads = acc.target_leads || 0
                  const progress = targetLeads > 0
                    ? Math.min(100, Math.round((totalLeads / targetLeads) * 100))
                    : 0

                  return (
                    <tr key={acc.id} className="group border-b border-border border-l-2 border-transparent odd:bg-card even:bg-muted/[0.18] transition-colors hover:border-l-amber-500/60 hover:bg-amber-500/[0.06] dark:border-zinc-800">
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted dark:border-zinc-700 dark:bg-zinc-900">
                            {acc.logo_path ? (
                              <img
                                src={buildExportUrl(`/storage/${acc.logo_path}`)}
                                alt={acc.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Building className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-semibold text-foreground">{acc.name}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">ID #{acc.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 shadow-sm dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.65)]" />
                          {acc.description || 'Umum'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle font-semibold text-foreground/90">{totalLeads}</td>
                      <td className="px-5 py-3.5 align-middle font-bold text-amber-500">{acc.deals_count || 0}</td>
                      <td className="w-[250px] px-5 py-3.5 align-middle">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span className="text-muted-foreground">{targetLeads > 0 ? `${totalLeads} / ${targetLeads}` : 'Target belum diatur'}</span>
                            <span className={cn(progress >= 100 ? 'text-emerald-500' : 'text-amber-500', targetLeads === 0 && 'text-muted-foreground')}>{progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted dark:bg-zinc-950" role="progressbar" aria-label={`Progress target ${acc.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                            <div className={cn('h-full rounded-full transition-[width] duration-500', progress >= 100 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        {acc.admins && acc.admins.length > 0 ? (
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {acc.admins.map((adm) => (
                              <span key={adm.id} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-cyan-700 shadow-sm dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300">
                                <UserCheck className="h-3 w-3" />
                                {adm.name}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-[10px] italic text-muted-foreground/60">Belum ada admin</span>}
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
      )}

      {meta && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-[10px] text-muted-foreground/70">
            Menampilkan <span className="font-semibold text-muted-foreground">{accounts.length}</span> dari <span className="font-semibold text-muted-foreground">{meta.total}</span> akun.
          </p>
          <nav aria-label="Pagination akun" className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="xs"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:cursor-not-allowed disabled:opacity-40 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50 dark:text-zinc-300"
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
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:cursor-not-allowed disabled:opacity-40 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50 dark:text-zinc-300"
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
