'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useUpdateProfile, useUpdateTheme } from '@/lib/hooks/useSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Palette, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Zinc', hex: '#71717a' },
]

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const updateProfileMutation = useUpdateProfile()
  const updateThemeMutation = useUpdateTheme()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#f59e0b')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formErrors, setFormErrors] = useState<{
    currentPassword?: string
    password?: string
    passwordConfirm?: string
  }>({})

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      if (user.primary_color) {
        setPrimaryColor(user.primary_color)
      }
    }
  }, [user])

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    if (!name.trim() || !email.trim()) {
      toast.error('Nama dan email wajib diisi.')
      return
    }

    const payload: any = { name, email }
    if (currentPassword || password || passwordConfirm) {
      const errors: typeof formErrors = {}

      if (!currentPassword) {
        errors.currentPassword = 'Password lama wajib diisi.'
      }
      if (!password) {
        errors.password = 'Password baru wajib diisi.'
      } else if (password.length < 8) {
        errors.password = 'Password baru minimal harus 8 karakter.'
      }
      if (!passwordConfirm) {
        errors.passwordConfirm = 'Konfirmasi password baru wajib diisi.'
      } else if (password !== passwordConfirm) {
        errors.passwordConfirm = 'Konfirmasi password baru tidak cocok.'
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors)
        toast.error('Silakan perbaiki kesalahan pada formulir password.')
        return
      }

      payload.current_password = currentPassword;
      payload.password = password;
      payload.password_confirmation = passwordConfirm;
    }

    updateProfileMutation.mutate(payload, {
      onSuccess: (res) => {
        toast.success(res.message || 'Profil berhasil diperbarui!')
        setCurrentPassword('')
        setPassword('')
        setPasswordConfirm('')
        setFormErrors({})
      },
      onError: (err: any) => {
        if (err.errors) {
          const errors: typeof formErrors = {}
          if (err.errors.current_password) {
            errors.currentPassword = err.errors.current_password[0]
          }
          if (err.errors.password) {
            errors.password = err.errors.password[0]
          }
          if (err.errors.password_confirmation) {
            errors.passwordConfirm = err.errors.password_confirmation[0]
          }
          setFormErrors(errors)
        }
        toast.error(err.message || 'Gagal memperbarui profil.')
      },
    })
  }

  const handleThemeSubmit = (hex: string) => {
    setPrimaryColor(hex)
    updateThemeMutation.mutate(hex, {
      onSuccess: (res) => {
        toast.success(res.message || 'Tema warna utama berhasil diperbarui!')
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal memperbarui tema.')
      },
    })
  }

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500 mr-2" />
        <span className="text-xs font-semibold">Memuat preferensi pengguna...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan</h1>
        <p className="text-xs text-muted-foreground">
          Ubah konfigurasi profil, password, dan visual tema e-report Anda.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile and Password edit form */}
        <div className="md:col-span-2">
          <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Informasi Akun & Keamanan</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Perbarui detail nama, email login, atau ganti password secara berkala.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-border bg-background text-xs text-foreground focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>
                </div>

                <div className="border-t border-border/80 pt-4 mt-2 dark:border-zinc-800/80">
                  <h3 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" />
                    Ganti Password (Opsional)
                  </h3>
                  <p className="text-[10px] text-muted-foreground/70 mb-4 leading-relaxed">
                    Kosongkan kolom di bawah jika Anda tidak berniat mengganti password.
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="curr-pass" className="text-xs font-semibold text-muted-foreground">Password Lama</Label>
                      <div className="relative">
                        <Input
                          id="curr-pass"
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value)
                            setFormErrors(prev => ({ ...prev, currentPassword: undefined }))
                          }}
                          className={cn(
                            "border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-700 pr-10",
                            formErrors.currentPassword && "border-red-500 focus-visible:ring-red-500/50 dark:border-red-500/60"
                          )}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowCurrentPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {formErrors.currentPassword && (
                        <p className="text-[10px] text-red-500 pl-0.5">{formErrors.currentPassword}</p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-pass" className="text-xs font-semibold text-muted-foreground">Password Baru</Label>
                        <div className="relative">
                          <Input
                            id="new-pass"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="Minimal 8 karakter"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value)
                              setFormErrors(prev => ({ ...prev, password: undefined }))
                            }}
                            className={cn(
                              "border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-700 pr-10",
                              formErrors.password && "border-red-500 focus-visible:ring-red-500/50 dark:border-red-500/60"
                            )}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowNewPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {formErrors.password && (
                          <p className="text-[10px] text-red-500 pl-0.5">{formErrors.password}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="new-pass-confirm" className="text-xs font-semibold text-muted-foreground">Konfirmasi Password Baru</Label>
                        <div className="relative">
                          <Input
                            id="new-pass-confirm"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Ulangi password baru"
                            value={passwordConfirm}
                            onChange={(e) => {
                              setPasswordConfirm(e.target.value)
                              setFormErrors(prev => ({ ...prev, passwordConfirm: undefined }))
                            }}
                            className={cn(
                              "border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-700 pr-10",
                              formErrors.passwordConfirm && "border-red-500 focus-visible:ring-red-500/50 dark:border-red-500/60"
                            )}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {formErrors.passwordConfirm && (
                          <p className="text-[10px] text-red-500 pl-0.5">{formErrors.passwordConfirm}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold text-xs"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Profil
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Theme Visual Palette Settings */}
        <div>
          <Card className="border-border bg-card shadow-sm h-full dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-500" />
                Tema Visual
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Pilih aksen warna antarmuka dashboard personal Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Aksen Warna Utama</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleThemeSubmit(color.hex)}
                      disabled={updateThemeMutation.isPending}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-all gap-1.5 focus:outline-none relative group dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/30"
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-[10px] text-muted-foreground font-semibold">{color.name}</span>
                      {primaryColor.toLowerCase() === color.hex.toLowerCase() && (
                        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-green-500 ring-2 ring-card dark:ring-zinc-950" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-3 dark:border-zinc-800">
                <Label htmlFor="custom-color" className="text-xs font-semibold text-muted-foreground block mb-1.5">Warna Kustom</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-8 w-12 p-0 border-border bg-background cursor-pointer dark:border-zinc-800 dark:bg-zinc-950"
                  />
                  <Button
                    onClick={() => handleThemeSubmit(primaryColor)}
                    disabled={updateThemeMutation.isPending}
                    size="xs"
                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground/80 text-xs dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
                  >
                    {updateThemeMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Terapkan'
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 mt-4 text-[10px] text-muted-foreground leading-relaxed dark:border-zinc-800/60 dark:bg-zinc-950/40">
                <p>
                  Perubahan tema warna visual bersifat personal dan akan langsung diaktifkan di seluruh elemen dashboard Anda.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
