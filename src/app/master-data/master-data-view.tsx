'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, Reorder, useDragControls } from 'framer-motion'
import type { StatusCategory, SurveyStatusItem } from '@/types'
import {
  useCategoriesList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useStatusesList,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
  useReorderStatuses,
  useSurveyStatusesList,
  useCreateSurveyStatus,
  useUpdateSurveyStatus,
  useDeleteSurveyStatus,
  useReorderSurveyStatuses,
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
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Lock,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/components/ui/confirm-dialog'

export default function MasterDataPage() {
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState<'categories' | 'statuses' | 'survey-statuses' | 'users'>('categories')

  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch] = useDebounce(userSearch, 400)
  const [catSearch, setCatSearch] = useState('')
  const [debouncedCatSearch] = useDebounce(catSearch, 400)
  const [categoriesPage, setCategoriesPage] = useState(1)
  const [statusesPage, setStatusesPage] = useState(1)
  const [usersPage, setUsersPage] = useState(1)

  // Reset to first page when search changes
  useEffect(() => {
    setUsersPage(1)
  }, [debouncedUserSearch])
  useEffect(() => {
    setCategoriesPage(1)
  }, [debouncedCatSearch])

  // Categories: paginated 10/page with server-side search.
  const { data: catResponse, isLoading: catLoading } = useCategoriesList({
    page: categoriesPage,
    per_page: 10,
    search: debouncedCatSearch,
  })
  const catMeta = catResponse?.meta
  // Statuses: load all in one page so drag-reorder covers every row.
  const { data: statResponse, isLoading: statLoading } = useStatusesList({ page: statusesPage, per_page: 500 })
  const { data: surveyStatusesResponse, isLoading: surveyStatusesLoading } = useSurveyStatusesList()
  const { data: userResponse, isLoading: userLoading, refetch: refetchUsers } = useUsersList({
    search: debouncedUserSearch,
    page: usersPage,
  })

  const { data: accountsResponse } = useAccounts()
  const accountOptions = useMemo<AutocompleteOption[]>(() => {
    const accounts = accountsResponse || []
    return [
      { label: '-- Pilih Akun --', value: 'none' },
      ...accounts.map((acc: any) => ({ label: acc.name, value: String(acc.id) })),
    ]
  }, [accountsResponse])

  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory(0)
  const deleteCat = useDeleteCategory()

  const createStat = useCreateStatus()
  const deleteStat = useDeleteStatus()
  const reorderStat = useReorderStatuses()
  const createSurveyStat = useCreateSurveyStatus()
  const deleteSurveyStat = useDeleteSurveyStatus()
  const reorderSurveyStat = useReorderSurveyStatuses()

  // Local drag order for pipeline stages (mouse + touch via framer-motion).
  // Synced from the server list; updated live while dragging and persisted on drop.
  const [orderedStatuses, setOrderedStatuses] = useState<StatusCategory[]>([])
  const orderRef = useRef<StatusCategory[]>([])
  // Constrains each row's drag to the list bounds (no flying off the container).
  const statusListRef = useRef<HTMLUListElement>(null)
  const [orderedSurveyStatuses, setOrderedSurveyStatuses] = useState<SurveyStatusItem[]>([])
  const surveyOrderRef = useRef<SurveyStatusItem[]>([])
  const surveyStatusListRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (statResponse?.data) {
      setOrderedStatuses(statResponse.data)
      orderRef.current = statResponse.data
    }
  }, [statResponse?.data])

  useEffect(() => {
    if (surveyStatusesResponse?.data) {
      setOrderedSurveyStatuses(surveyStatusesResponse.data)
      surveyOrderRef.current = surveyStatusesResponse.data
    }
  }, [surveyStatusesResponse?.data])

  const handleStatusReorder = (next: StatusCategory[]) => {
    setOrderedStatuses(next)
    orderRef.current = next
  }

  const commitStatusOrder = () => {
    const ids = orderRef.current.map((s) => s.id)
    const original = statResponse?.data?.map((s) => s.id) ?? []
    if (ids.length === original.length && ids.every((id, i) => id === original[i])) return
    reorderStat.mutate(ids, {
      onSuccess: () => toast.success('Urutan tahap pipeline diperbarui.'),
      onError: () => toast.error('Gagal menyimpan urutan. Coba lagi.'),
    })
  }

  const createUser = useCreateUser()
  const deleteUser = useDeleteUser()
  const resetUserPass = useResetUserPassword()

  const [openModal, setOpenModal] = useState(false)
  const [modalType, setModalType] = useState<'cat' | 'stat' | 'survey-stat' | 'user' | 'reset-pass'>('cat')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [color, setColor] = useState('#f59e0b')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [role, setRole] = useState<'admin' | 'super_admin' | 'surveyor' | 'manager_surveyor'>('admin')
  const [accountId, setAccountId] = useState('')

  const updateCatMutation = useUpdateCategory(editingId || 0)
  const updateStatMutation = useUpdateStatus(editingId || 0)
  const updateSurveyStatMutation = useUpdateSurveyStatus(editingId || 0)
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

  const handleSurveyStatusReorder = (next: SurveyStatusItem[]) => {
    setOrderedSurveyStatuses(next)
    surveyOrderRef.current = next
  }

  const commitSurveyStatusOrder = () => {
    const ids = surveyOrderRef.current.map((status) => status.id)
    const original = surveyStatusesResponse?.data?.map((status) => status.id) ?? []
    if (ids.length === original.length && ids.every((id, index) => id === original[index])) return

    reorderSurveyStat.mutate(ids, {
      onSuccess: () => toast.success('Urutan status hasil survey diperbarui.'),
      onError: () => toast.error('Gagal menyimpan urutan status survey.'),
    })
  }

  const handleOpenSurveyStatCreate = () => {
    setModalType('survey-stat')
    setEditingId(null)
    setName('')
    setColor('#0ea5e9')
    setOpenModal(true)
  }

  const handleOpenSurveyStatEdit = (status: SurveyStatusItem) => {
    setModalType('survey-stat')
    setEditingId(status.id)
    setName(status.name)
    setColor(status.color || '#0ea5e9')
    setOpenModal(true)
  }

  const handleOpenUserCreate = () => {
    setModalType('user')
    setEditingId(null)
    setName('')
    setEmail('')
    setPassword('')
    setPasswordConfirm('')
    setShowPassword(false)
    setShowPasswordConfirm(false)
    setRole('admin')
    setAccountId('')
    setOpenModal(true)
  }

  const [exportingUsers, setExportingUsers] = useState(false)
  const handleExportUsers = async () => {
    if (exportingUsers) return
    setExportingUsers(true)
    try {
      // Ekspor menghormati filter pencarian aktif agar cocok dengan tampilan.
      await api.downloadFile('/master-data/users/export', { search: debouncedUserSearch || undefined })
      toast.success('Excel daftar user berhasil diunduh.')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengekspor daftar user.')
    } finally {
      setExportingUsers(false)
    }
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
    setShowPassword(false)
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
    } else if (modalType === 'survey-stat') {
      if (!name.trim() || !color.trim()) return
      const mutation = editingId ? updateSurveyStatMutation : createSurveyStat
      mutation.mutate(
        { name, color },
        {
          onSuccess: (res) => {
            toast.success(res.message || 'Status survey berhasil disimpan.')
            setOpenModal(false)
          },
          onError: (err: any) => toast.error(err.message || 'Gagal menyimpan status survey.'),
        }
      )
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

  const handleDeleteSurveyStat = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Status Survey?',
      description: 'Status hasil survey yang masih digunakan tidak dapat dihapus.',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
      deleteSurveyStat.mutate(id, {
        onSuccess: (res) => toast.success(res.message || 'Status survey berhasil dihapus.'),
        onError: (err: any) => toast.error(err.message || 'Status survey ini masih digunakan.'),
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
    <div className="min-w-0 space-y-5 pb-8">
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--primary-theme)]">
            <span className="h-1.5 w-1.5 bg-[var(--primary-theme)]" />
            Pengaturan sistem - data referensi
          </div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground sm:text-[28px]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_12%,transparent)] text-[var(--primary-theme)] ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_28%,transparent)]">
              <Settings className="h-5 w-5" />
            </span>
            Konfigurasi Master Data
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Halaman pengaturan sistem untuk kebutuhan produk interior, pipeline status deal, dan pendaftaran user operator.
          </p>
        </div>

        <div className="flex w-full sm:w-auto gap-2">
          {activeTab === 'categories' && (
            <Button onClick={handleOpenCatCreate} size="sm" className="h-10 w-full rounded-lg bg-[var(--primary-theme)] px-4 font-semibold text-white shadow-none hover:brightness-110 sm:w-auto">
              <Plus className="h-4 w-4 mr-1.5" />
              Kategori Baru
            </Button>
          )}
          {activeTab === 'statuses' && (
            <Button onClick={handleOpenStatCreate} size="sm" className="h-10 w-full rounded-lg bg-[var(--primary-theme)] px-4 font-semibold text-white shadow-none hover:brightness-110 sm:w-auto">
              <Plus className="h-4 w-4 mr-1.5" />
              Status Baru
            </Button>
          )}
          {activeTab === 'survey-statuses' && (
            <Button onClick={handleOpenSurveyStatCreate} size="sm" className="h-10 w-full rounded-lg bg-[var(--primary-theme)] px-4 font-semibold text-white shadow-none hover:brightness-110 sm:w-auto">
              <Plus className="h-4 w-4 mr-1.5" />
              Status Survey Baru
            </Button>
          )}
          {activeTab === 'users' && (
            <>
              <Button
                onClick={handleExportUsers}
                disabled={exportingUsers}
                size="sm"
                variant="outline"
                className="h-10 w-full rounded-lg px-4 font-semibold shadow-none sm:w-auto"
              >
                {exportingUsers ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                Export Excel
              </Button>
              <Button onClick={handleOpenUserCreate} size="sm" className="h-10 w-full rounded-lg bg-[var(--primary-theme)] px-4 font-semibold text-white shadow-none hover:brightness-110 sm:w-auto">
                <Plus className="h-4 w-4 mr-1.5" />
                User Baru
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div role="tablist" aria-label="Kelompok master data" className="grid w-full grid-cols-4 gap-1 overflow-hidden rounded-xl border border-white/10 bg-card/45 p-1 shadow-sm backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-border/35 lg:w-fit">
        {([
          { key: 'categories', label: 'Kategori Kebutuhan', mobileLabel: 'Kategori', icon: Tag },
          { key: 'statuses', label: 'Status Pipeline', mobileLabel: 'Pipeline', icon: Kanban },
          { key: 'survey-statuses', label: 'Status Hasil Survey', mobileLabel: 'Survey', icon: ClipboardCheck },
          { key: 'users', label: 'Akun Pengguna Admin', mobileLabel: 'User', icon: Users },
        ] as const).map((tab) => {
          const active = activeTab === tab.key
          const Icon = tab.icon

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative flex min-w-0 select-none items-center justify-center rounded-lg px-1 py-2.5 text-[10px] font-semibold transition-colors duration-150 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-theme)] sm:px-4 sm:text-xs',
                active ? 'text-[var(--primary-theme)]' : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="master-data-active-tab"
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.85 }}
                  className="pointer-events-none absolute inset-0 rounded-lg border border-white/15 bg-[color-mix(in_srgb,var(--primary-theme)_16%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(255,255,255,0.04),0_8px_22px_-16px_var(--primary-theme)] backdrop-blur-lg backdrop-saturate-150 ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_30%,transparent)]"
                />
              )}
              <span className="relative z-10 flex min-w-0 items-center justify-center gap-1 sm:gap-2">
                <motion.span
                  animate={{ y: active ? -1 : 0, scale: active ? 1.04 : 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.85 }}
                  className="flex shrink-0 items-center justify-center"
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </motion.span>
                <span className="min-w-0 truncate sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden min-w-0 truncate sm:inline">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Categories Tab ───────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
        <div className="relative w-full max-w-md">
          <Search className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50 transition-colors",
            catSearch && "text-amber-500"
          )} />
          <Input
            placeholder="Cari nama kategori..."
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            className="h-11 rounded-xl border-border/60 bg-muted/40 pl-10 pr-10 text-sm shadow-none placeholder:text-muted-foreground/50 focus-visible:border-amber-500/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-amber-500/15 dark:border-zinc-800 dark:bg-zinc-900/60 dark:focus-visible:bg-zinc-900"
          />
          {catSearch && (
            <button
              type="button"
              onClick={() => setCatSearch('')}
              className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800 cursor-pointer"
              title="Bersihkan pencarian"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Card className="glass-panel border border-border/50 shadow-md rounded-2xl dark:border-zinc-900/60 dark:shadow-none overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
              <TableHeader className="bg-muted/20 border-b border-border/40 dark:bg-zinc-950/40 dark:border-zinc-900/50">
                <TableRow className="border-border hover:bg-transparent dark:border-zinc-900">
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5 pl-5">Nama Kategori</TableHead>
                  <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5 pr-5 w-[150px] text-right">Aksi</TableHead>
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
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground text-xs font-semibold">
                      {catSearch ? `Kategori "${catSearch}" tidak ditemukan.` : 'Tidak ada kategori terdaftar.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  catResponse?.data?.map((cat) => (
                    <TableRow key={cat.id} className="border-border/40 hover:bg-muted/30 hover:shadow-[inset_3px_0_0_0_var(--primary-theme)] dark:hover:shadow-[inset_3px_0_0_0_var(--primary-theme)] transition-all duration-200 dark:border-zinc-900/40 dark:hover:bg-zinc-800/10">
                      <TableCell className="text-xs font-bold text-foreground/80 py-3.5 pl-5">
                        {cat.name}
                      </TableCell>
                      <TableCell className="text-right pr-5 py-3.5">
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

        {catMeta && catMeta.last_page > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground/70">
              Menampilkan <span className="font-semibold text-muted-foreground">{catResponse?.data?.length ?? 0}</span> dari <span className="font-semibold text-muted-foreground">{catMeta.total}</span> kategori.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                disabled={categoriesPage <= 1}
                onClick={() => setCategoriesPage((p) => Math.max(1, p - 1))}
                className="border-border bg-card hover:bg-muted text-foreground/80 disabled:opacity-30 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50 dark:text-zinc-300"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                Sebelumnya
              </Button>
              <span className="text-xs font-semibold text-muted-foreground px-2">
                Halaman {catMeta.current_page} dari {catMeta.last_page}
              </span>
              <Button
                variant="outline"
                size="xs"
                disabled={categoriesPage >= catMeta.last_page}
                onClick={() => setCategoriesPage((p) => Math.min(catMeta.last_page, p + 1))}
                className="border-border bg-card hover:bg-muted text-foreground/80 disabled:opacity-30 rounded-xl h-8 transition-all duration-250 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50 dark:text-zinc-300"
              >
                Selanjutnya
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* ── Statuses Tab ─────────────────────────────────────────── */}
      {activeTab === 'statuses' && (
        <Card className="glass-panel border border-border/50 shadow-md rounded-2xl dark:border-zinc-900/60 dark:shadow-none overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              {/* Column header (mirrors the old table layout) */}
              <div className="flex items-center bg-muted/20 border-b border-border/40 px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-zinc-950/40 dark:border-zinc-900/50 min-w-[640px]">
                <div className="w-[120px]">Urutan</div>
                <div className="flex-1">Nama Tahap Pipeline</div>
                <div className="w-[200px]">Warna Aksen</div>
                <div className="w-[110px] text-right">Aksi</div>
              </div>

              {statLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              ) : orderedStatuses.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground text-xs font-semibold">
                  Tidak ada status terdaftar.
                </div>
              ) : (
                <Reorder.Group
                  ref={statusListRef}
                  axis="y"
                  values={orderedStatuses}
                  onReorder={handleStatusReorder}
                  className="list-none min-w-[640px]"
                >
                  {orderedStatuses.map((st, index) => (
                    <SortableStatusRow
                      key={st.id}
                      status={st}
                      index={index}
                      constraintsRef={statusListRef}
                      onCommit={commitStatusOrder}
                      onEdit={() => handleOpenStatEdit(st.id, st.name, st.color)}
                      onDelete={() => handleDeleteStat(st.id)}
                    />
                  ))}
                </Reorder.Group>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Users Tab ────────────────────────────────────────────── */}
      {activeTab === 'survey-statuses' && (
        <Card className="glass-panel border border-border/50 shadow-md rounded-2xl dark:border-zinc-900/60 dark:shadow-none overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <div className="flex min-w-[640px] items-center border-b border-border/40 bg-muted/20 px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:border-zinc-900/50 dark:bg-zinc-950/40">
                <div className="w-[120px]">Urutan</div>
                <div className="flex-1">Status Hasil</div>
                <div className="w-[200px]">Warna</div>
                <div className="w-[110px] text-right">Aksi</div>
              </div>
              {surveyStatusesLoading ? (
                <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-amber-500" /></div>
              ) : orderedSurveyStatuses.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-xs font-semibold text-muted-foreground">Belum ada status hasil survey.</div>
              ) : (
                <Reorder.Group
                  ref={surveyStatusListRef}
                  axis="y"
                  values={orderedSurveyStatuses}
                  onReorder={handleSurveyStatusReorder}
                  className="min-w-[640px] list-none"
                >
                  {orderedSurveyStatuses.map((status, index) => (
                    <SortableStatusRow
                      key={status.id}
                      status={status}
                      index={index}
                      constraintsRef={surveyStatusListRef}
                      onCommit={commitSurveyStatusOrder}
                      onEdit={() => handleOpenSurveyStatEdit(status)}
                      onDelete={() => handleDeleteSurveyStat(status.id)}
                    />
                  ))}
                </Reorder.Group>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50 transition-colors",
              userSearch && "text-[var(--primary-theme)]"
            )} />
            <Input
              placeholder="Cari user admin..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-10 rounded-lg border-border/60 bg-card/65 pl-10 pr-10 text-sm shadow-none placeholder:text-muted-foreground/55 focus-visible:border-[var(--primary-theme)] focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_18%,transparent)]"
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => setUserSearch('')}
                className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800 cursor-pointer"
                title="Bersihkan pencarian"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-[var(--primary-theme)]" />
              <span><strong className="font-semibold text-foreground">{userResponse?.meta?.total ?? userResponse?.data?.length ?? 0}</strong> pengguna terdaftar</span>
            </div>
          </div>

          <Card className="overflow-hidden rounded-xl border-0 bg-card/75 py-0 shadow-none ring-1 ring-border/60">
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="min-w-[760px]">
                <TableHeader className="border-b border-border/45 bg-muted/25">
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5 pl-5">Nama Lengkap</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5">Email</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5">Role</TableHead>
                    <TableHead className="hidden py-3.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:table-cell">Tautan Akun</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5 pr-5 w-[150px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--primary-theme)]" />
                      </TableCell>
                    </TableRow>
                  ) : userResponse?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs font-semibold">
                        Tidak ada user terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    userResponse?.data?.map((usr) => (
                      <TableRow key={usr.id} className="border-border/35 odd:bg-background/10 transition-colors hover:bg-[color-mix(in_srgb,var(--primary-theme)_6%,transparent)] hover:shadow-[inset_2px_0_0_0_var(--primary-theme)]">
                        <TableCell className="py-3 pl-5 text-xs font-semibold text-foreground/90">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary-theme)_11%,transparent)] text-[10px] font-bold text-[var(--primary-theme)] ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_25%,transparent)]">
                              {usr.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[130px]">{usr.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3.5 font-semibold">
                          {usr.email}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[9px] font-bold uppercase shadow-none",
                              usr.role === 'super_admin'
                                ? "border-amber-500/20 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20"
                                : usr.role === 'admin'
                                ? "border-blue-500/20 text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20"
                                : usr.role === 'surveyor'
                                ? "border-emerald-500/20 text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20"
                                : "border-purple-500/20 text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/20"
                            )}
                          >
                            {usr.role === 'super_admin'
                              ? 'Super Admin'
                              : usr.role === 'admin'
                              ? 'Admin'
                              : usr.role === 'surveyor'
                              ? 'Surveyor'
                              : usr.role === 'manager_surveyor'
                              ? 'Manager Surveyor'
                              : usr.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden py-3 text-xs font-medium text-muted-foreground lg:table-cell">
                          {usr.account?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right pr-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleOpenResetPass(usr.id)}
                              title="Reset Password"
                              className="rounded-md bg-background/35 text-muted-foreground ring-1 ring-border/50 hover:bg-[color-mix(in_srgb,var(--primary-theme)_10%,transparent)] hover:text-[var(--primary-theme)]"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleOpenUserEdit(usr)}
                              title="Edit pengguna"
                              className="rounded-md bg-background/35 text-muted-foreground ring-1 ring-border/50 hover:bg-muted hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleDeleteUser(usr.id)}
                              title="Hapus pengguna"
                              className="rounded-md bg-background/35 text-muted-foreground/70 ring-1 ring-border/50 hover:bg-red-500/10 hover:text-red-500"
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
        <DialogContent className={cn(
          "border-border/60 bg-card text-foreground",
          modalType === 'user'
            ? "max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-x-hidden overflow-y-auto rounded-xl p-0 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.18),0_2px_4px_-2px_rgba(0,0,0,0.16)] sm:max-w-2xl"
            : "max-w-sm rounded-xl"
        )}>
          <form onSubmit={handleFormSubmit} className={cn("space-y-4", modalType === 'user' && "min-w-0")}>
            <DialogHeader className={cn(modalType === 'user' && "border-b border-border/50 bg-muted/15 px-5 py-5 pr-12 sm:px-6")}>
              <DialogTitle className="text-base font-bold text-foreground sm:text-lg">
                {modalType === 'cat' && (editingId ? 'Edit Kategori Kebutuhan' : 'Kategori Kebutuhan Baru')}
                {modalType === 'stat' && (editingId ? 'Edit Status Pipeline' : 'Status Pipeline Baru')}
                {modalType === 'survey-stat' && (editingId ? 'Edit Status Hasil Survey' : 'Status Hasil Survey Baru')}
                {modalType === 'user' && (editingId ? 'Edit Akun Pengguna' : 'Buat Akun Pengguna Baru')}
                {modalType === 'reset-pass' && 'Reset Password User'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                {modalType === 'user' ? 'Atur identitas, keamanan, dan cakupan akses pengguna.' : 'Masukkan nilai parameter yang sesuai pada form di bawah.'}
              </DialogDescription>
            </DialogHeader>

            <div className={cn("space-y-3 py-2", modalType === 'user' && "space-y-6 px-5 pb-5 sm:px-6 sm:pb-6")}>
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

              {modalType === 'survey-stat' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="survey-stat-name" className="text-xs font-semibold text-muted-foreground">Nama Status Hasil Survey</Label>
                    <Input id="survey-stat-name" placeholder="Contoh: Hold Up Desain, Deal" value={name} onChange={(e) => setName(e.target.value)} className="border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="survey-stat-color" className="text-xs font-semibold text-muted-foreground block">Warna Aksen</Label>
                    <div className="flex gap-2">
                      <Input id="survey-stat-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 p-0 border-border bg-background cursor-pointer dark:border-zinc-800 dark:bg-zinc-950" />
                      <Input value={color} onChange={(e) => setColor(e.target.value)} className="border-border bg-background text-xs text-foreground/80 flex-1 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300" />
                    </div>
                  </div>
                </>
              )}

              {/* User Account CRUD form */}
              {modalType === 'user' && (
                <div className="space-y-5">
                  <section className="space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary-theme)_11%,transparent)] text-[var(--primary-theme)]"><Users className="h-3.5 w-3.5" /></span>
                      <div><h3 className="text-xs font-bold uppercase text-foreground">Identitas</h3><p className="text-[10px] text-muted-foreground">Informasi dasar untuk mengenali pengguna.</p></div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-name" className="text-xs font-semibold text-muted-foreground">Nama Lengkap</Label>
                    <Input
                      id="usr-name"
                      placeholder="Nama asli user..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                       className="h-10 rounded-lg border-border/60 bg-background/50 text-sm text-foreground focus-visible:border-[var(--primary-theme)] focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_18%,transparent)]"
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
                       className="h-10 rounded-lg border-border/60 bg-background/50 text-sm text-foreground focus-visible:border-[var(--primary-theme)] focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_18%,transparent)]"
                    />
                  </div>
                    </div>
                  </section>

                  {!editingId && (
                    <section className="space-y-3.5 border-t border-border/50 pt-5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary-theme)_11%,transparent)] text-[var(--primary-theme)]"><Lock className="h-3.5 w-3.5" /></span>
                        <div><h3 className="text-xs font-bold uppercase text-foreground">Keamanan</h3><p className="text-[10px] text-muted-foreground">Gunakan minimal delapan karakter.</p></div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Password field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="usr-pass" className="text-xs font-semibold text-muted-foreground">Password</Label>
                        <div className="relative">
                          <Input
                            id="usr-pass"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 8 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={cn(
                              "h-10 rounded-lg border-border/60 bg-background/50 pr-10 text-sm text-foreground focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_18%,transparent)]",
                              password.length > 0 && password.length < 8 && "border-amber-500/60 focus-visible:ring-amber-500/40"
                            )}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {password.length > 0 && password.length < 8 && (
                          <p className="text-[10px] text-amber-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            Minimal 8 karakter
                          </p>
                        )}
                      </div>

                      {/* Confirm Password field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="usr-pass-conf" className="text-xs font-semibold text-muted-foreground">Konfirmasi Password</Label>
                        <div className="relative">
                          <Input
                            id="usr-pass-conf"
                            type={showPasswordConfirm ? 'text' : 'password'}
                            placeholder="Ulangi password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            className={cn(
                              "h-10 rounded-lg border-border/60 bg-background/50 pr-10 text-sm text-foreground focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_18%,transparent)]",
                              passwordConfirm.length > 0 && password !== passwordConfirm && "border-red-500/60 focus-visible:ring-red-500/40",
                              passwordConfirm.length > 0 && password === passwordConfirm && "border-emerald-500/60 focus-visible:ring-emerald-500/40"
                            )}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPasswordConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPasswordConfirm ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                          >
                            {showPasswordConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {/* Real-time mismatch validation */}
                        {passwordConfirm.length > 0 && password !== passwordConfirm && (
                          <p className="text-[10px] text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            Password tidak cocok
                          </p>
                        )}
                        {passwordConfirm.length > 0 && password === passwordConfirm && password.length >= 8 && (
                          <p className="text-[10px] text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            Password cocok
                          </p>
                        )}
                      </div>
                      </div>
                    </section>
                  )}

                  <section className="space-y-3.5 border-t border-border/50 pt-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary-theme)_11%,transparent)] text-[var(--primary-theme)]"><ShieldCheck className="h-3.5 w-3.5" /></span>
                      <div><h3 className="text-xs font-bold uppercase text-foreground">Cakupan Akses</h3><p className="text-[10px] text-muted-foreground">Tentukan role dan akun yang dapat dikelola.</p></div>
                    </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="usr-role" className="text-xs font-semibold text-muted-foreground">Role Pengguna</Label>
                      <Select
                        value={role}
                        onValueChange={(v) => setRole(v as any)}
                      >
                        <SelectTrigger id="usr-role" className="h-10 rounded-lg border-border/60 bg-background/50 text-sm text-foreground focus:ring-1 focus:ring-[var(--primary-theme)]">
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin Akun</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="surveyor">Surveyor</SelectItem>
                          <SelectItem value="manager_surveyor">Manager Surveyor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {role === 'admin' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="usr-account" className="text-xs font-semibold text-muted-foreground">Tautan Akun</Label>
                        <Autocomplete
                          id="usr-account"
                          value={accountId || 'none'}
                          onChange={(v) => setAccountId(v && v !== 'none' ? v : '')}
                          options={accountOptions}
                          placeholder="Cari/Pilih Akun..."
                          onlyChangeOnSelect
                          clearOnFocus
                          className="h-10 rounded-lg border-border/60 bg-background/50 text-sm text-foreground focus:border-[var(--primary-theme)] focus:ring-1 focus:ring-[var(--primary-theme)]"
                        />
                      </div>
                    )}
                  </div>
                  </section>
                </div>
              )}

              {/* Reset Password Form */}
              {modalType === 'reset-pass' && (
                <div className="space-y-1.5">
                  <Label htmlFor="reset-pass-input" className="text-xs font-semibold text-muted-foreground">Password Baru</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="reset-pass-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password baru..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 border-border bg-background text-xs text-foreground/80 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={cn(
              "flex justify-end gap-2 border-t border-border/60 pt-4",
              modalType === 'user' && "sticky bottom-0 bg-card/95 px-5 pb-5 pt-4 backdrop-blur-md sm:px-6 sm:pb-6"
            )}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenModal(false)}
                className="h-9 rounded-lg bg-muted/35 px-4 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  createSurveyStat.isPending ||
                  updateSurveyStatMutation.isPending ||
                  createUser.isPending ||
                  updateUserMutation.isPending ||
                  resetUserPass.isPending
                }
                className="h-9 rounded-lg bg-[var(--primary-theme)] px-5 text-xs font-semibold text-white shadow-none hover:brightness-110"
              >
                {createCat.isPending ||
                updateCatMutation.isPending ||
                createStat.isPending ||
                updateStatMutation.isPending ||
                createSurveyStat.isPending ||
                updateSurveyStatMutation.isPending ||
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

/**
 * A single draggable pipeline-stage row. Dragging is started only from the grip
 * handle (dragListener=false + dragControls) so the edit/delete buttons and
 * horizontal scrolling keep working. `touch-none` on the handle lets touch
 * devices drag without the page scrolling. The new order is persisted on drop.
 */
function SortableStatusRow({
  status,
  index,
  constraintsRef,
  onCommit,
  onEdit,
  onDelete,
}: {
  status: StatusCategory | SurveyStatusItem
  index: number
  constraintsRef: React.RefObject<HTMLUListElement | null>
  onCommit: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={status}
      dragListener={false}
      dragControls={controls}
      dragConstraints={constraintsRef}
      dragElastic={0.05}
      dragMomentum={false}
      onDragEnd={onCommit}
      className="flex items-center border-b border-border/40 bg-card px-5 py-3 transition-colors hover:bg-muted/30 dark:border-zinc-900/40 dark:bg-transparent dark:hover:bg-zinc-800/10"
    >
      <div className="w-[120px] flex items-center gap-2">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="touch-none cursor-grab rounded-md p-1 -ml-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing dark:hover:bg-zinc-800"
          title="Seret untuk mengubah urutan"
          aria-label="Seret untuk mengubah urutan"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-muted-foreground/70">#{index + 1}</span>
      </div>
      <div className="flex-1 pr-3 text-xs font-bold text-foreground/80">
        {status.name.toUpperCase()}
      </div>
      <div className="w-[200px]">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: status.color || '#71717a' }}
          />
          <span className="font-mono text-[10px] font-semibold text-muted-foreground/70">
            {status.color || '#71717a'}
          </span>
        </div>
      </div>
      <div className="flex w-[110px] justify-end gap-1.5">
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onEdit}
          className="text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onDelete}
          className="text-muted-foreground/70 hover:bg-muted hover:text-red-500 dark:hover:bg-zinc-800"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Reorder.Item>
  )
}
