'use client'

import { useState, useEffect } from 'react'
import {
  useCategoriesList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useStatusesList,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
  useUsersList,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  useAccounts,
  UserItem
} from '@/lib/hooks/useMasterData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Key,
  ShieldCheck,
  Tag,
  Kanban,
  Users,
  Settings,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/components/ui/confirm-dialog'

export default function MasterDataPage() {
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState<'categories' | 'statuses' | 'users'>('categories')

  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch] = useDebounce(userSearch, 400)
  const [categoriesPage, setCategoriesPage] = useState(1)
  const [statusesPage, setStatusesPage] = useState(1)
  const [usersPage, setUsersPage] = useState(1)

  // Reset to first page when search changes
  useEffect(() => {
    setUsersPage(1)
  }, [debouncedUserSearch])

  const { data: catResponse, isLoading: catLoading } = useCategoriesList({ page: categoriesPage })
  const { data: statResponse, isLoading: statLoading } = useStatusesList({ page: statusesPage })
  const { data: userResponse, isLoading: userLoading, refetch: refetchUsers } = useUsersList({
    search: debouncedUserSearch,
    page: usersPage,
  })

  const { data: accountsResponse } = useAccounts()
  const accountsList = accountsResponse || []

  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory(0)
  const deleteCat = useDeleteCategory()

  const createStat = useCreateStatus()
  const deleteStat = useDeleteStatus()

  const createUser = useCreateUser()
  const deleteUser = useDeleteUser()
  const resetUserPass = useResetUserPassword()

  const [openModal, setOpenModal] = useState(false)
  const [modalType, setModalType] = useState<'cat' | 'stat' | 'user' | 'reset-pass'>('cat')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [color, setColor] = useState('#f59e0b')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin')
  const [accountId, setAccountId] = useState('')

  const updateCatMutation = useUpdateCategory(editingId || 0)
  const updateStatMutation = useUpdateStatus(editingId || 0)
  const updateUserMutation = useUpdateUser(editingId || 0)

  const handleOpenCatCreate = () => {
    setModalType('cat')
    setEditingId(null)
    setName('')
    setOpenModal(true)
  }

  const handleOpenCatEdit = (id: number, currentName: string) => {
    setModalType('cat')
    setEditingId(id)
    setName(currentName)
    setOpenModal(true)
  }

  const handleOpenStatCreate = () => {
    setModalType('stat')
    setEditingId(null)
    setName('')
    setColor('#f59e0b')
    setOpenModal(true)
  }

  const handleOpenStatEdit = (id: number, currentName: string, currentColor: string | null) => {
    setModalType('stat')
    setEditingId(id)
    setName(currentName)
    setColor(currentColor || '#f59e0b')
    setOpenModal(true)
  }

  const handleOpenUserCreate = () => {
    setModalType('user')
    setEditingId(null)
    setName('')
    setEmail('')
    setPassword('')
    setPasswordConfirm('')
    setRole('admin')
    setAccountId('')
    setOpenModal(true)
  }

  const handleOpenUserEdit = (usr: UserItem) => {
    setModalType('user')
    setEditingId(usr.id)
    setName(usr.name)
    setEmail(usr.email)
    setPassword('')
    setPasswordConfirm('')
    setRole(usr.role)
    setAccountId(usr.account_id ? String(usr.account_id) : '')
    setOpenModal(true)
  }

  const handleOpenResetPass = (id: number) => {
    setModalType('reset-pass')
    setEditingId(id)
    setPassword('')
    setOpenModal(true)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (modalType === 'cat') {
      if (!name.trim()) return
      if (editingId) {
        updateCatMutation.mutate(
          { name },
          {
            onSuccess: (res) => {
              toast.success(res.message || 'Kategori kebutuhan berhasil diperbarui.')
              setOpenModal(false)
            },
            onError: (err: any) => toast.error(err.message || 'Gagal mengubah kategori.'),
          }
        )
      } else {
        createCat.mutate(
          { name },
          {
            onSuccess: (res) => {
              toast.success(res.message || 'Kategori kebutuhan berhasil ditambahkan.')
              setOpenModal(false)
            },
            onError: (err: any) => toast.error(err.message || 'Gagal menambahkan kategori.'),
          }
        )
      }
    } else if (modalType === 'stat') {
      if (!name.trim() || !color.trim()) return
      if (editingId) {
        updateStatMutation.mutate(
          { name, color },
          {
            onSuccess: (res) => {
              toast.success(res.message || 'Status pipeline berhasil diperbarui.')
              setOpenModal(false)
            },
            onError: (err: any) => toast.error(err.message || 'Gagal mengubah status.'),
          }
        )
      } else {
        createStat.mutate(
          { name, color },
          {
            onSuccess: (res) => {
              toast.success(res.message || 'Status pipeline berhasil ditambahkan.')
              setOpenModal(false)
            },
            onError: (err: any) => toast.error(err.message || 'Gagal menambahkan status.'),
          }
        )
      }
    } else if (modalType === 'user') {
      if (!name.trim() || !email.trim()) return
      const payload: any = { name, email, role }
      if (role === 'admin' && accountId) {
        payload.account_id = parseInt(accountId, 10)
      }

      if (editingId) {
        updateUserMutation.mutate(payload, {
          onSuccess: (res) => {
            toast.success(res.message || 'User berhasil diperbarui.')
            setOpenModal(false)
            refetchUsers()
          },
          onError: (err: any) => toast.error(err.message || 'Gagal memperbarui user.'),
        })
      } else {
        if (!password || password.length < 8) {
          toast.error('Password minimal 8 karakter.')
          return
        }
        if (password !== passwordConfirm) {
          toast.error('Konfirmasi password tidak cocok.')
          return
        }
        payload.password = password
        payload.password_confirmation = passwordConfirm

        createUser.mutate(payload, {
          onSuccess: (res) => {
            toast.success(res.message || 'User berhasil dibuat.')
            setOpenModal(false)
            refetchUsers()
          },
          onError: (err: any) => toast.error(err.message || 'Gagal membuat user baru.'),
        })
      }
    } else if (modalType === 'reset-pass') {
      if (!password || password.length < 8) {
        toast.error('Password minimal 8 karakter.')
        return
      }
      resetUserPass.mutate(
        { id: editingId || 0, data: { password } },
        {
          onSuccess: (res) => {
            toast.success(res.message || 'Password user berhasil direset.')
            setOpenModal(false)
          },
          onError: (err: any) => toast.error(err.message || 'Gagal mereset password.'),
        }
      )
    }
  }

  const handleDeleteCat = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Kategori?',
      description: 'Hapus kategori kebutuhan ini? Kategori yang masih digunakan tidak dapat dihapus.',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
      deleteCat.mutate(id, {
        onSuccess: (res) => toast.success(res.message || 'Kategori kebutuhan berhasil dihapus.'),
        onError: (err: any) => toast.error(err.message || 'Kategori ini masih digunakan.'),
      })
    }
  }

  const handleDeleteStat = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Status?',
      description: 'Hapus status pipeline ini? Status yang masih digunakan tidak dapat dihapus.',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
      deleteStat.mutate(id, {
        onSuccess: (res) => toast.success(res.message || 'Status berhasil dihapus.'),
        onError: (err: any) => toast.error(err.message || 'Status ini masih digunakan.'),
      })
    }
  }

  const handleDeleteUser = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus User?',
      description: 'Hapus akun pengguna admin ini? Seluruh riwayat audit log operator akan tetap dipertahankan.',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
      deleteUser.mutate(id, {
        onSuccess: (res) => {
          toast.success(res.message || 'User berhasil dihapus.')
          refetchUsers()
        },
        onError: (err: any) => toast.error(err.message || 'Gagal menghapus user.'),
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-amber-500" />
            Konfigurasi Master Data
          </h1>
          <p className="text-xs text-muted-foreground">
            Halaman pengaturan sistem untuk kebutuhan produk interior, pipeline status deal, dan pendaftaran user operator.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'categories' && (
            <Button onClick={handleOpenCatCreate} size="sm" className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              Kategori Baru
            </Button>
          )}
          {activeTab === 'statuses' && (
            <Button onClick={handleOpenStatCreate} size="sm" className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              Status Baru
            </Button>
          )}
          {activeTab === 'users' && (
            <Button onClick={handleOpenUserCreate} size="sm" className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              User Baru
            </Button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-1.5 border-b border-border pb-px overflow-x-auto dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            "px-4 py-2 text-xs font-semibold focus:outline-none border-b-2 transition-all flex items-center gap-2 shrink-0",
            activeTab === 'categories'
              ? "border-amber-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground/80"
          )}
        >
          <Tag className="h-3.5 w-3.5" />
          Kategori Kebutuhan
        </button>
        <button
          onClick={() => setActiveTab('statuses')}
          className={cn(
            "px-4 py-2 text-xs font-semibold focus:outline-none border-b-2 transition-all flex items-center gap-2 shrink-0",
            activeTab === 'statuses'
              ? "border-amber-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground/80"
          )}
        >
          <Kanban className="h-3.5 w-3.5" />
          Status Pipeline
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-4 py-2 text-xs font-semibold focus:outline-none border-b-2 transition-all flex items-center gap-2 shrink-0",
            activeTab === 'users'
              ? "border-amber-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground/80"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Akun Pengguna Admin
        </button>
      </div>

      {/* ── Categories Tab ───────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <Card className="border-border bg-card shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900/40">
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
              <TableHeader className="bg-muted/20 border-b border-border dark:bg-zinc-950/20 dark:border-zinc-800">
                <TableRow className="border-border dark:border-zinc-800">
                  <TableHead className="text-muted-foreground text-xs font-semibold">Nama Kategori</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold w-[150px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : catResponse?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground text-xs">
                      Tidak ada kategori terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  catResponse?.data?.map((cat) => (
                    <TableRow key={cat.id} className="border-border/60 hover:bg-muted/10 dark:border-zinc-800/60 dark:hover:bg-zinc-800/10">
                      <TableCell className="text-xs font-semibold text-foreground/80">
                        {cat.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleOpenCatEdit(cat.id, cat.name)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleDeleteCat(cat.id)}
                            className="text-muted-foreground/70 hover:text-red-500 hover:bg-muted dark:hover:bg-zinc-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Statuses Tab ─────────────────────────────────────────── */}
      {activeTab === 'statuses' && (
        <Card className="border-border bg-card shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900/40">
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
              <TableHeader className="bg-muted/20 border-b border-border dark:bg-zinc-950/20 dark:border-zinc-800">
                <TableRow className="border-border dark:border-zinc-800">
                  <TableHead className="text-muted-foreground text-xs font-semibold w-[80px]">Urutan</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold">Nama Tahap Pipeline</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold">Warna Aksen</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-semibold w-[150px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : statResponse?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                      Tidak ada status terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  statResponse?.data?.map((st) => (
                    <TableRow key={st.id} className="border-border/60 hover:bg-muted/10 dark:border-zinc-800/60 dark:hover:bg-zinc-800/10">
                      <TableCell className="text-xs text-muted-foreground/70 font-bold">
                        #{st.sort_order}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground/80">
                        {st.name.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: st.color || '#71717a' }}
                          />
                          <span className="text-[10px] text-muted-foreground/70 font-mono font-semibold">
                            {st.color || '#71717a'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleOpenStatEdit(st.id, st.name, st.color)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleDeleteStat(st.id)}
                            className="text-muted-foreground/70 hover:text-red-500 hover:bg-muted dark:hover:bg-zinc-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Users Tab ────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Cari user admin..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9 border-border bg-muted/40 placeholder:text-muted-foreground/40 focus-visible:ring-amber-500/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:placeholder:text-zinc-600"
            />
          </div>

          <Card className="border-border bg-card shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                <TableHeader className="bg-muted/20 border-b border-border dark:bg-zinc-950/20 dark:border-zinc-800">
                  <TableRow className="border-border dark:border-zinc-800">
                    <TableHead className="text-muted-foreground text-xs font-semibold">Nama Lengkap</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold">Role</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold">Tautan Cabang</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold w-[150px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : userResponse?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                        Tidak ada user terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    userResponse?.data?.map((usr) => (
                      <TableRow key={usr.id} className="border-border/60 hover:bg-muted/10 dark:border-zinc-800/60 dark:hover:bg-zinc-800/10">
                        <TableCell className="text-xs font-semibold text-foreground/90">
                          {usr.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {usr.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] rounded-lg font-bold uppercase",
                              usr.role === 'super_admin'
                                ? "border-amber-500/20 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20"
                                : "border-border text-muted-foreground dark:border-zinc-800"
                            )}
                          >
                            {usr.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {usr.account?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleOpenResetPass(usr.id)}
                              title="Reset Password"
                              className="text-muted-foreground hover:text-amber-500 hover:bg-muted dark:hover:bg-zinc-800"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleOpenUserEdit(usr)}
                              className="text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleDeleteUser(usr.id)}
                              className="text-muted-foreground/70 hover:text-red-500 hover:bg-muted dark:hover:bg-zinc-800"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Dialog Modals ────────────────────────────────────────── */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="border-border bg-card text-foreground max-w-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {modalType === 'cat' && (editingId ? 'Edit Kategori Kebutuhan' : 'Kategori Kebutuhan Baru')}
                {modalType === 'stat' && (editingId ? 'Edit Status Pipeline' : 'Status Pipeline Baru')}
                {modalType === 'user' && (editingId ? 'Edit Akun Pengguna' : 'Buat Akun Pengguna Baru')}
                {modalType === 'reset-pass' && 'Reset Password User'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Masukkan nilai parameter yang sesuai pada form di bawah.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Category form */}
              {modalType === 'cat' && (
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name" className="text-xs font-semibold text-muted-foreground">Nama Kategori</Label>
                  <Input
                    id="cat-name"
                    placeholder="Contoh: Renovasi Rumah, Lemari Pakaian"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  />
                </div>
              )}

              {/* Status form */}
              {modalType === 'stat' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="stat-name" className="text-xs font-semibold text-muted-foreground">Nama Status Pipeline</Label>
                    <Input
                      id="stat-name"
                      placeholder="Contoh: Survey, Deal, Terkirim"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stat-color" className="text-xs font-semibold text-muted-foreground block">Warna Aksen</Label>
                    <div className="flex gap-2">
                      <Input
                        id="stat-color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-8 w-12 p-0 border-border bg-background cursor-pointer dark:border-zinc-800 dark:bg-zinc-950"
                      />
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="border-border bg-background text-xs text-foreground/80 flex-1 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* User Account CRUD form */}
              {modalType === 'user' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-name" className="text-xs font-semibold text-muted-foreground">Nama Lengkap</Label>
                    <Input
                      id="usr-name"
                      placeholder="Nama asli user..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="usr-email" className="text-xs font-semibold text-muted-foreground">Email Login</Label>
                    <Input
                      id="usr-email"
                      type="email"
                      placeholder="operator@putrainterior.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    />
                  </div>

                  {!editingId && (
                    <div className="grid gap-2 grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="usr-pass" className="text-xs font-semibold text-muted-foreground">Password</Label>
                        <Input
                          id="usr-pass"
                          type="password"
                          placeholder="Min. 8 karakter"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="usr-pass-conf" className="text-xs font-semibold text-muted-foreground">Konfirmasi</Label>
                        <Input
                          id="usr-pass-conf"
                          type="password"
                          placeholder="Ulangi password"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          className="border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="usr-role" className="text-xs font-semibold text-muted-foreground">Role Pengguna</Label>
                      <select
                        id="usr-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                      >
                        <option value="admin">Admin Cabang</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>

                    {role === 'admin' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="usr-account" className="text-xs font-semibold text-muted-foreground">Tautan Cabang</Label>
                        <select
                          id="usr-account"
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                        >
                          <option value="">-- Pilih Cabang --</option>
                          {accountsList.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Reset Password Form */}
              {modalType === 'reset-pass' && (
                <div className="space-y-1.5">
                  <Label htmlFor="reset-pass-input" className="text-xs font-semibold text-muted-foreground">Password Baru</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="reset-pass-input"
                      type="password"
                      placeholder="Masukkan password baru..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border/80 pt-4 dark:border-zinc-800/80">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenModal(false)}
                className="text-muted-foreground hover:bg-muted text-xs dark:hover:bg-zinc-800"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  createCat.isPending ||
                  updateCatMutation.isPending ||
                  createStat.isPending ||
                  updateStatMutation.isPending ||
                  createUser.isPending ||
                  updateUserMutation.isPending ||
                  resetUserPass.isPending
                }
                className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold text-xs"
              >
                {createCat.isPending ||
                updateCatMutation.isPending ||
                createStat.isPending ||
                updateStatMutation.isPending ||
                createUser.isPending ||
                updateUserMutation.isPending ||
                resetUserPass.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  'Simpan'
                ) : (
                  'Buat Baru'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
