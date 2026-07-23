'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { useLogin } from '@/lib/hooks/useAuth'
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Send,
  X,
  User,
  AtSign,
  MessageSquare,
  ShieldCheck,
  ClipboardCheck,
  MapPinned,
  FileBarChart,
  LogIn,
} from 'lucide-react'
import Logo from '@/components/brand/logo'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import LoginBackground from '@/components/login/login-background'
import BugReportWidget from '@/components/bug-report/bug-report-widget'

const loginSchema = zod.object({
  email: zod.string().email({ message: 'Alamat email tidak valid.' }),
  password: zod.string().min(8, { message: 'Password minimal 8 karakter.' }),
  remember: zod.boolean().optional(),
})

type LoginFormValues = zod.infer<typeof loginSchema>

// Nomor WhatsApp developer untuk permohonan reset password (E.164 tanpa "+")
const DEV_WHATSAPP = '6285168112098'

const forgotSchema = zod.object({
  adminName: zod.string().min(2, { message: 'Nama admin minimal 2 karakter.' }),
  accountName: zod.string().min(2, { message: 'Nama akun minimal 2 karakter.' }),
  note: zod.string().max(500, { message: 'Catatan maksimal 500 karakter.' }).optional(),
})

type ForgotFormValues = zod.infer<typeof forgotSchema>

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0 } },
}

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
}

export default function LoginPage() {
  const loginMutation = useLogin()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [, setBlockedUntil] = useState<number | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  })

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    reset: resetForgot,
    formState: { errors: forgotErrors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { adminName: '', accountName: '', note: '' },
  })

  const closeForgot = () => {
    setForgotOpen(false)
    resetForgot()
  }

  const onSubmitForgot = (data: ForgotFormValues) => {
    const lines = [
      '*Permohonan Reset Password — E-Report*',
      '',
      `Nama Admin : ${data.adminName}`,
      `Nama Akun  : ${data.accountName}`,
      `Catatan    : ${data.note?.trim() || '-'}`,
      '',
      'Mohon dibantu untuk mereset password akun di atas. Terima kasih.',
    ]
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${DEV_WHATSAPP}?text=${text}`, '_blank', 'noopener,noreferrer')
    closeForgot()
  }

  useEffect(() => {
    // Keep login aligned with the default application accent.
    const root = document.documentElement
    root.style.setProperty('--primary-theme', '#f59e0b')
  }, [])

  // Auto-hide error or blocked alert after 3 seconds so it doesn't block other users
  useEffect(() => {
    if (authError || isBlocked) {
      const timer = setTimeout(() => {
        setAuthError(null)
        setIsBlocked(false)
        setBlockedUntil(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [authError, isBlocked])

  const onSubmit = (data: LoginFormValues) => {
    setAuthError(null)
    setIsBlocked(false)
    setBlockedUntil(null)
    loginMutation.mutate(data, {
      onError: (err: unknown) => {
        // err is ApiError { message, errors } thrown by api client, not Error instance
        const apiErr = err as { message?: string; errors?: Record<string, string[]> } | null
        const msg = apiErr?.message || 'Email atau password tidak sesuai.'

        // Check if account is temporarily blocked (429 Too Many Requests)
        const isAccountBlocked = msg.includes('Terlalu banyak percobaan login')

        if (isAccountBlocked) {
          setIsBlocked(true)
          // Set blocked until 15 minutes from now
          setBlockedUntil(Date.now() + 15 * 60 * 1000)
          setAuthError(null)
        } else {
          setAuthError(msg)
        }

        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 560)
      },
    })
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-6">

      {/* Animated background */}
      <LoginBackground />

      {/* Floating bug report action */}
      <BugReportWidget />

      {/* Login card */}
      <motion.div
        className={cn('relative z-10 w-full max-w-[980px]', isShaking && 'animate-shake')}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Outer ambient glow ring */}
        {/* Card surface — Solid sleek design for performance */}
        <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/65 shadow-[0_16px_32px_-4px_rgba(15,23,42,0.25)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.16] dark:bg-slate-900/70 dark:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.55)]">

          {/* Theme hairline */}
          {/* Inner top reflection (light mode only) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/20 to-transparent dark:from-white/[0.035]" />

          {/* Bottom hairline */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-border/60" />

          <div className="grid min-h-[600px] min-w-0 lg:grid-cols-[1.04fr_0.96fr]">
            <aside className="relative hidden overflow-hidden border-r border-slate-900/10 bg-slate-950/[0.035] px-12 py-12 text-slate-950 lg:flex lg:flex-col lg:justify-between dark:border-white/[0.08] dark:bg-black/15 dark:text-white">
              <div className="absolute inset-0 opacity-[0.14] dark:opacity-[0.16]" style={{ backgroundImage: 'linear-gradient(rgba(245,158,11,.18) 1px, transparent 1px), linear-gradient(90deg,rgba(245,158,11,.18) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
              <div className="relative">
                <div className="relative mb-10 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-amber-400/30 bg-amber-400/10 shadow-[0_12px_30px_-18px_rgba(245,158,11,0.9)] backdrop-blur-md">
                  <div className="absolute inset-x-2 top-0 h-px bg-white/70" />
                  <Logo className="relative h-12 w-12 text-amber-500 drop-shadow-[0_6px_12px_rgba(245,158,11,0.25)]" />
                </div>
                <p className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">Putra Corporation</p>
                {/* Yang konkret dinaikkan jadi headline; sub-headline dulu
                    lebih jelas daripada judulnya sendiri. */}
                <h1 className="mt-4 max-w-sm text-3xl font-bold leading-tight">Konsultasi, survey, dan laporan dalam satu alur.</h1>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">Dari lead masuk sampai rekap dikirim, tercatat di satu tempat dan bisa ditelusuri kapan saja.</p>
              </div>
              <div className="relative space-y-3 border-t border-slate-900/10 pt-6 text-xs text-slate-600 dark:border-white/[0.08] dark:text-slate-400">
                {/* "Data operasional terpusat" dibuang: mengulang "satu tempat"
                    di sub-headline. Diganti hal yang belum disebut di layar. */}
                <div className="flex items-center gap-3"><ClipboardCheck className="h-4 w-4 text-amber-500" />Riwayat lead tidak tercecer</div>
                <div className="flex items-center gap-3"><MapPinned className="h-4 w-4 text-amber-500" />Jadwal surveyor tanpa bentrok</div>
                <div className="flex items-center gap-3"><FileBarChart className="h-4 w-4 text-amber-500" />Rekap siap dibagikan</div>
              </div>
            </aside>

          <motion.div
            className="relative min-w-0 flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="mb-7" variants={itemVariants}>
              <div className="mb-5 flex lg:hidden">
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-400/10 shadow-[0_10px_24px_-16px_rgba(245,158,11,0.9)] backdrop-blur-md">
                  <div className="absolute inset-x-2 top-0 h-px bg-white/70" />
                  <Logo className="relative h-11 w-11 text-[var(--primary-theme)]" />
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase text-[var(--primary-theme)] lg:hidden">
                Putra Corporation
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-50">
                Selamat datang kembali
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Masuk untuk mengelola laporan dan aktivitas tim.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Blocked alert - shows for 3 seconds only */}
              <AnimatePresence>
                {isBlocked && (
                  <motion.div
                    key="blocked-alert"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 rounded-xl border border-orange-400/40 bg-orange-50/60 px-4 py-3.5 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400">
                      <div className="shrink-0 pt-0.5">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-bold">Akun Anda Diblokir Sementara</div>
                        <div className="text-xs font-medium opacity-90">Terlalu banyak percobaan login gagal. Silakan coba lagi dalam 15 menit atau hubungi administrator.</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Auth error */}
              <AnimatePresence>
                {authError && !isBlocked && (
                  <motion.div
                    key="auth-error"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 rounded-xl border border-red-400/25 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/8 dark:text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {authError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Email
                </label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[var(--primary-theme)] transition-colors group-focus-within:text-amber-300">
                    <AtSign aria-hidden="true" strokeWidth={2.5} className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    // Alat internal yang dibuka tiap hari: kursor langsung siap
                    // di field pertama, tidak perlu klik dulu.
                    autoFocus
                    placeholder="nama@perusahaan.com"
                    {...register('email')}
                    className={cn(
                      'login-field h-12 w-full rounded-lg border py-3 pl-11 pr-4 text-sm outline-none transition-[border-color,background-color,box-shadow] duration-200',
                      'bg-white/80 text-slate-900 placeholder:text-slate-500 backdrop-blur-md dark:bg-[#26354c] dark:text-white dark:placeholder:text-slate-300',
                      errors.email
                        ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                        : 'border-slate-900/10 hover:border-amber-500/40 focus:border-[var(--primary-theme)] focus:ring-2 focus:ring-amber-500/20 dark:border-white/[0.12] dark:hover:border-amber-400/40'
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 pl-1">{errors.email.message}</p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Password
                </label>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[var(--primary-theme)] transition-colors group-focus-within:text-amber-300">
                    <KeyRound aria-hidden="true" strokeWidth={2.5} className="h-5 w-5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    {...register('password')}
                    className={cn(
                      'login-field h-12 w-full rounded-lg border py-3 pl-11 pr-11 text-sm outline-none transition-[border-color,background-color,box-shadow] duration-200',
                      'bg-white/80 text-slate-900 placeholder:text-slate-500 backdrop-blur-md dark:bg-[#26354c] dark:text-white dark:placeholder:text-slate-300',
                      errors.password
                        ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                        : [
                            'border-slate-900/10 hover:border-amber-500/40 focus:border-[var(--primary-theme)] focus:ring-2 focus:ring-amber-500/20',
                            'dark:border-white/[0.12] dark:hover:border-amber-400/40',
                          ]
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-amber-500/10 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 dark:text-slate-300 dark:hover:text-amber-400"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 pl-1">{errors.password.message}</p>
                )}
              </motion.div>

              {/* Remember + Forgot */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                <label className="flex cursor-pointer items-center gap-2.5 select-none">
                  <input
                    type="checkbox"
                    {...register('remember')}
                    className="h-4 w-4 cursor-pointer rounded border-slate-400 bg-white accent-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-slate-600 dark:bg-slate-900"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Ingat perangkat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="cursor-pointer rounded-md text-xs font-semibold text-amber-700 transition-colors hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Lupa password?
                </button>
              </motion.div>

              {/* Submit */}
              <motion.div variants={itemVariants} className="pt-2">
                <motion.button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className={cn(
                    'relative h-12 w-full cursor-pointer rounded-lg bg-[var(--primary-theme)] px-4 text-sm font-bold text-slate-950',
                    'shadow-[0_10px_24px_-14px_rgba(245,158,11,0.95)] transition-[filter,transform,box-shadow] duration-200',
                    'hover:brightness-105 hover:shadow-[0_14px_30px_-15px_rgba(245,158,11,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                    'active:scale-[0.985]',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md'
                  )}
                  whileTap={{ scale: 0.985 }}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sedang masuk...
                      </>
                    ) : (
                      <><LogIn aria-hidden="true" strokeWidth={2.25} className="h-4 w-4 shrink-0" />Masuk ke E-Report</>
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </form>

            {/* Footer */}
            <motion.div variants={itemVariants} className="mt-7 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Akses aman untuk pengguna terdaftar
              </div>
              {/* Kontras: slate-400/slate-600 sebelumnya hanya ~2.1:1 di dark mode
                  (WCAG AA butuh 4.5:1 untuk teks sekecil ini). */}
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                &copy; {new Date().getFullYear()} Putra Corporation &middot; E-Report
              </p>
            </motion.div>
          </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Forgot password modal */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            key="forgot-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
              onClick={closeForgot}
            />

            {/* Dialog */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-title"
              className="relative w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-[0_16px_32px_-4px_rgba(15,23,42,0.28)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.16] dark:bg-slate-900/75 dark:shadow-black/60"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            >
              <div className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-[color-mix(in_srgb,var(--primary-theme)_50%,transparent)]" />

              {/* Close */}
              <button
                type="button"
                onClick={closeForgot}
                aria-label="Tutup"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-900/[0.06] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 dark:text-slate-500 dark:hover:bg-white/[0.08] dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-7 pt-8 pb-7">
                {/* Header */}
                <div className="mb-6 pr-8">
                  <div className="relative mb-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-400/10 shadow-[0_10px_24px_-16px_rgba(245,158,11,0.9)]">
                    <div className="absolute inset-x-2 top-0 h-px bg-white/70" />
                    <KeyRound className="relative h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2
                    id="forgot-title"
                    className="text-xl font-bold text-slate-950 dark:text-white"
                  >
                    Bantuan akses akun
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    Kirim detail akun ke tim dukungan melalui WhatsApp untuk proses reset password.
                  </p>
                </div>

                <form onSubmit={handleSubmitForgot(onSubmitForgot)} className="space-y-4">
                  {/* Nama Admin */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Nama Admin
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[var(--primary-theme)]">
                        <User aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Nama lengkap admin"
                        {...registerForgot('adminName')}
                        className={cn(
                          'h-12 w-full rounded-lg border py-3 pl-10 pr-4 text-sm outline-none transition-[border-color,background-color,box-shadow] duration-200',
                          'bg-white/80 text-slate-900 placeholder:text-slate-500 backdrop-blur-md dark:bg-[#26354c] dark:text-white dark:placeholder:text-slate-300',
                          forgotErrors.adminName
                            ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                            : [
                                'border-slate-900/10 hover:border-amber-500/40 focus:border-[var(--primary-theme)] focus:ring-2 focus:ring-amber-500/20',
                                'dark:border-white/[0.12] dark:hover:border-amber-400/40',
                              ]
                        )}
                      />
                    </div>
                    {forgotErrors.adminName && (
                      <p className="pl-1 text-[11px] text-red-500 dark:text-red-400">
                        {forgotErrors.adminName.message}
                      </p>
                    )}
                  </div>

                  {/* Nama Akun */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Nama Akun
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[var(--primary-theme)]">
                        <AtSign aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Email / username akun"
                        {...registerForgot('accountName')}
                        className={cn(
                          'h-12 w-full rounded-lg border py-3 pl-10 pr-4 text-sm outline-none transition-[border-color,background-color,box-shadow] duration-200',
                          'bg-white/80 text-slate-900 placeholder:text-slate-500 backdrop-blur-md dark:bg-[#26354c] dark:text-white dark:placeholder:text-slate-300',
                          forgotErrors.accountName
                            ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                            : [
                                'border-slate-900/10 hover:border-amber-500/40 focus:border-[var(--primary-theme)] focus:ring-2 focus:ring-amber-500/20',
                                'dark:border-white/[0.12] dark:hover:border-amber-400/40',
                              ]
                        )}
                      />
                    </div>
                    {forgotErrors.accountName && (
                      <p className="pl-1 text-[11px] text-red-500 dark:text-red-400">
                        {forgotErrors.accountName.message}
                      </p>
                    )}
                  </div>

                  {/* Note */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Catatan <span className="font-medium normal-case tracking-normal text-zinc-400/70">(opsional)</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-3.5 z-10 flex h-5 w-5 items-center justify-center text-[var(--primary-theme)]">
                        <MessageSquare aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <textarea
                        rows={3}
                        placeholder="Contoh: lupa password setelah ganti perangkat"
                        {...registerForgot('note')}
                        className={cn(
                          'w-full resize-none rounded-lg border py-3 pl-10 pr-4 text-sm outline-none transition-[border-color,background-color,box-shadow] duration-200',
                          'bg-white/80 text-slate-900 placeholder:text-slate-500 backdrop-blur-md dark:bg-[#26354c] dark:text-white dark:placeholder:text-slate-300',
                          forgotErrors.note
                            ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                            : [
                                'border-slate-900/10 hover:border-amber-500/40 focus:border-[var(--primary-theme)] focus:ring-2 focus:ring-amber-500/20',
                                'dark:border-white/[0.12] dark:hover:border-amber-400/40',
                              ]
                        )}
                      />
                    </div>
                    {forgotErrors.note && (
                      <p className="pl-1 text-[11px] text-red-500 dark:text-red-400">
                        {forgotErrors.note.message}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-stretch sm:gap-3">
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="h-11 w-full cursor-pointer rounded-lg border border-slate-900/10 bg-white/45 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1] sm:flex-1"
                    >
                      Batal
                    </button>
                    <motion.button
                      type="submit"
                      className={cn(
                        'relative flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-theme)] px-4 text-sm font-bold text-slate-950 sm:flex-[1.5]',
                        'shadow-[0_10px_24px_-14px_rgba(245,158,11,0.95)] transition-[filter,transform] duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
                      )}
                      whileTap={{ scale: 0.985 }}
                    >
                      <Send className="h-4 w-4" />
                      Kirim permintaan
                    </motion.button>
                  </div>
                </form>
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
