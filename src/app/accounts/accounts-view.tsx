'use client'

import { useState, useEffect } from 'react'
import {
  useAccountsList,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  AccountItem
} from '@/lib/hooks/useAccounts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [page, setPage] = useState(1)

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  // API query
  const { data: response, isLoading, refetch } = useAccountsList({
    search: debouncedSearch,
    page,
    per_page: 8,
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

      {/* Search Filter */}
      <div className="relative w-full max-w-md">
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

      {/* Main Grid View */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 text-center py-12">Tidak ada akun terdaftar.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {accounts.map((acc) => (
            <Card key={acc.id} className="border-border bg-card shadow-sm hover:border-border/80 transition-all flex flex-col justify-between group dark:border-zinc-800 dark:bg-zinc-900/40">
              <CardHeader className="p-3 pb-2 relative">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-muted flex items-center justify-center border border-border shrink-0 overflow-hidden relative dark:bg-zinc-950 dark:border-zinc-800">
                    {acc.logo_path ? (
                      <img
                        src={buildExportUrl(`/storage/${acc.logo_path}`)}
                        alt={acc.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-8">
                    <CardTitle className="text-[11px] sm:text-sm font-bold text-foreground truncate leading-tight">{acc.name}</CardTitle>
                    <CardDescription className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold truncate uppercase">
                      {acc.description || 'Umum'}
                    </CardDescription>
                  </div>
                </div>

                <div className="absolute top-2.5 right-2.5 flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleOpenEdit(acc)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted h-6 w-6 rounded-lg dark:hover:bg-zinc-800"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleDelete(acc.id)}
                    className="text-muted-foreground/70 hover:text-red-500 hover:bg-muted h-6 w-6 rounded-lg dark:hover:bg-zinc-800"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 pt-2 pb-3 space-y-2.5 border-t border-border/50 mt-1 dark:border-zinc-800/50">
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="border border-border/80 bg-muted/20 p-1.5 rounded-lg dark:border-zinc-800/80 dark:bg-zinc-950/20">
                    <p className="font-semibold text-muted-foreground/70 uppercase text-[7px] sm:text-[8px]">Total Leads</p>
                    <p className="text-foreground/80 font-bold mt-0.5 text-xs">{acc.consultations_count || 0}</p>
                  </div>
                  <div className="border border-border/80 bg-muted/20 p-1.5 rounded-lg dark:border-zinc-800/80 dark:bg-zinc-950/20">
                    <p className="font-semibold text-muted-foreground/70 uppercase text-[7px] sm:text-[8px]">Deal</p>
                    <p className="text-amber-500 font-bold mt-0.5 text-xs">{acc.deals_count || 0}</p>
                  </div>
                </div>

                {acc.target_leads && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] sm:text-[9px] font-semibold text-muted-foreground">
                      <span>Target</span>
                      <span>{acc.consultations_count || 0}/{acc.target_leads}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden dark:bg-zinc-950">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            ((acc.consultations_count || 0) / acc.target_leads) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-border/50 pt-2 dark:border-zinc-800/50">
                  <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground/70 uppercase mb-1 flex items-center gap-1">
                    <UserCheck className="h-2.5 w-2.5" />
                    Admin ({acc.admins?.length || 0})
                  </p>
                  {acc.admins && acc.admins.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {acc.admins.map((adm) => (
                        <span key={adm.id} className="text-[8px] sm:text-[9px] font-semibold bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 truncate max-w-full">
                          {adm.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[8px] text-muted-foreground/50 italic">Belum ada admin.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground/70">
            Menampilkan <span className="font-semibold text-muted-foreground">{accounts.length}</span> dari <span className="font-semibold text-muted-foreground">{meta.total}</span> akun.
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
