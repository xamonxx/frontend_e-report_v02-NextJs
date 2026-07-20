'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { useLogin } from '@/lib/hooks/useAuth'
import { Loader2, Eye, EyeOff, AlertCircle, KeyRound, Send, X, User, AtSign, MessageSquare } from 'lucide-react'
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
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export default function LoginPage() {
  const loginMutation = useLogin()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
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
    // Reset to default primary theme orange on login page mount
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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8">

      {/* Animated background */}
      <LoginBackground />

      {/* Floating bug report action */}
      <BugReportWidget />

      {/* Login card */}
      <motion.div
        className={cn('relative w-full max-w-[420px] z-10', isShaking && 'animate-shake')}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Outer ambient glow ring */}
        <div className="absolute -inset-[1.5px] rounded-[28px] opacity-70 dark:opacity-50">
          <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-amber-400/20 via-transparent to-indigo-500/15 blur-[3px] dark:from-amber-500/25 dark:to-violet-500/15" />
        </div>

        {/* Card surface — Solid sleek design for performance */}
        <div className="relative rounded-[26px] border border-zinc-200 bg-white shadow-2xl shadow-black/[0.06] overflow-hidden dark:border-zinc-800 dark:bg-[#12121a] dark:shadow-black/60">

          {/* Top amber hairline */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent dark:via-amber-500/50" />

          {/* Inner top reflection (light mode only) */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/50 to-transparent pointer-events-none dark:from-white/[0.015]" />

          {/* Bottom hairline */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.03]" />

          <motion.div
            className="relative px-8 pt-9 pb-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Logo and heading */}
            <motion.div className="mb-8 text-center" variants={itemVariants}>
              <div className="mb-5 flex justify-center">
                <div className="relative">
                  {/* Glow behind icon */}
                  <div className="absolute inset-0 rounded-2xl bg-amber-500/25 blur-xl dark:bg-amber-500/30" />
                  <motion.div
                    className="relative flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/18 to-amber-600/8 dark:border-amber-500/20 dark:from-amber-500/15 dark:to-amber-600/5"
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Logo className="h-14 w-14 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.55)]" />
                  </motion.div>
                </div>
              </div>
              <h1 className="text-[22px] font-black uppercase tracking-widest text-amber-500 leading-tight">
                Putra Corporation
              </h1>
              <p className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-500">
                Masuk untuk mengakses sistem E-Report
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
                        <div className="font-bold">🔒 Akun Anda Diblokir Sementara</div>
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
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@putracorporation.com"
                  {...register('email')}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200',
                    'bg-white/60 text-zinc-800 placeholder:text-zinc-400',
                    'dark:bg-white/[0.045] dark:text-zinc-100 dark:placeholder:text-zinc-600',
                    errors.email
                      ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                      : [
                          'border-zinc-200/80 hover:border-zinc-300',
                          'focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                          'dark:border-white/[0.08] dark:hover:border-white/[0.13]',
                          'dark:focus:border-amber-500/55 dark:focus:shadow-[0_0_0_3px_rgba(245,158,11,0.09)]',
                        ]
                  )}
                />
                {errors.email && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 pl-1">{errors.email.message}</p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition-all duration-200',
                      'bg-white/60 text-zinc-800 placeholder:text-zinc-400',
                      'dark:bg-white/[0.045] dark:text-zinc-100 dark:placeholder:text-zinc-600',
                      errors.password
                        ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                        : [
                            'border-zinc-200/80 hover:border-zinc-300',
                            'focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                            'dark:border-white/[0.08] dark:hover:border-white/[0.13]',
                            'dark:focus:border-amber-500/55 dark:focus:shadow-[0_0_0_3px_rgba(245,158,11,0.09)]',
                          ]
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 pl-1">{errors.password.message}</p>
                )}
              </motion.div>

              {/* Remember + Forgot */}
              <motion.div variants={itemVariants} className="flex items-center justify-between pt-0.5">
                <label className="flex cursor-pointer items-center gap-2.5 select-none">
                  <input
                    type="checkbox"
                    {...register('remember')}
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 bg-white accent-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">Ingat perangkat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs font-medium text-amber-600 hover:text-amber-500 dark:text-amber-500/70 dark:hover:text-amber-400 transition-colors cursor-pointer"
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
                    'relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-bold text-zinc-950 cursor-pointer',
                    'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600',
                    'shadow-md shadow-amber-500/20 dark:shadow-amber-500/15',
                    'transition-all duration-250',
                    'hover:shadow-lg hover:shadow-amber-500/30',
                    'active:scale-[0.985]',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md'
                  )}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                >
                  {/* Shimmer sweep */}
                  {!loginMutation.isPending && (
                    <motion.span
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/22 to-transparent"
                      animate={{ x: ['-100%', '220%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mengautentikasi...
                      </>
                    ) : (
                      'Masuk'
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </form>

            {/* Footer */}
            <motion.p
              variants={itemVariants}
              className="mt-7 text-center text-[10px] text-zinc-400/60 dark:text-zinc-600"
            >
              © {new Date().getFullYear()} Putra Corporation · E-Report System
            </motion.p>
          </motion.div>
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
              className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm"
              onClick={closeForgot}
            />

            {/* Dialog */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-title"
              className="relative w-full max-w-[440px] rounded-[26px] p-px bg-gradient-to-b from-amber-400/60 via-amber-500/15 to-white/10 shadow-2xl shadow-black/40 dark:from-amber-400/50 dark:via-amber-500/10 dark:to-white/[0.06] dark:shadow-black/70"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            >
              {/* Inner surface (sits inside the 1px gradient border frame) */}
              <div className="relative overflow-hidden rounded-[25px] bg-white dark:bg-[#0e0e16]">
              {/* Ambient amber gradient wash + top glow */}
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/[0.09] via-transparent to-transparent" />
              <div aria-hidden className="pointer-events-none absolute -top-28 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-amber-500/25 blur-[80px] dark:bg-amber-500/20" />

              {/* Top amber hairline */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent dark:via-amber-500/60" />

              {/* Close */}
              <button
                type="button"
                onClick={closeForgot}
                aria-label="Tutup"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-7 pt-8 pb-7">
                {/* Header */}
                <div className="mb-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-[18px] bg-amber-500/35 blur-2xl" />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 ring-1 ring-inset ring-white/30">
                        <KeyRound className="h-6 w-6 text-zinc-950 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
                      </div>
                    </div>
                  </div>
                  <h2
                    id="forgot-title"
                    className="text-[18px] font-extrabold tracking-tight text-zinc-900 dark:text-white"
                  >
                    Permohonan Reset Password
                  </h2>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-500">
                    Isi data berikut. Permintaan akan dikirim ke developer
                    melalui WhatsApp untuk diproses.
                  </p>
                </div>

                <form onSubmit={handleSubmitForgot(onSubmitForgot)} className="space-y-4">
                  {/* Nama Admin */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Nama Admin
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
                      <input
                        type="text"
                        placeholder="Nama lengkap admin"
                        {...registerForgot('adminName')}
                        className={cn(
                          'w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all duration-200',
                          'bg-white/60 text-zinc-800 placeholder:text-zinc-400',
                          'dark:bg-white/[0.045] dark:text-zinc-100 dark:placeholder:text-zinc-600',
                          forgotErrors.adminName
                            ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                            : [
                                'border-zinc-200/80 hover:border-zinc-300',
                                'focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                                'dark:border-white/[0.08] dark:hover:border-white/[0.13]',
                                'dark:focus:border-amber-500/55 dark:focus:shadow-[0_0_0_3px_rgba(245,158,11,0.09)]',
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
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Nama Akun
                    </label>
                    <div className="relative">
                      <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
                      <input
                        type="text"
                        placeholder="Email / username akun"
                        {...registerForgot('accountName')}
                        className={cn(
                          'w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all duration-200',
                          'bg-white/60 text-zinc-800 placeholder:text-zinc-400',
                          'dark:bg-white/[0.045] dark:text-zinc-100 dark:placeholder:text-zinc-600',
                          forgotErrors.accountName
                            ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                            : [
                                'border-zinc-200/80 hover:border-zinc-300',
                                'focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                                'dark:border-white/[0.08] dark:hover:border-white/[0.13]',
                                'dark:focus:border-amber-500/55 dark:focus:shadow-[0_0_0_3px_rgba(245,158,11,0.09)]',
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
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Catatan <span className="font-medium normal-case tracking-normal text-zinc-400/70">(opsional)</span>
                    </label>
                    <div className="relative">
                      <MessageSquare className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                      <textarea
                        rows={3}
                        placeholder="Mis. lupa password setelah ganti perangkat…"
                        {...registerForgot('note')}
                        className={cn(
                          'w-full resize-none rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all duration-200',
                          'bg-white/60 text-zinc-800 placeholder:text-zinc-400',
                          'dark:bg-white/[0.045] dark:text-zinc-100 dark:placeholder:text-zinc-600',
                          forgotErrors.note
                            ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                            : [
                                'border-zinc-200/80 hover:border-zinc-300',
                                'focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                                'dark:border-white/[0.08] dark:hover:border-white/[0.13]',
                                'dark:focus:border-amber-500/55 dark:focus:shadow-[0_0_0_3px_rgba(245,158,11,0.09)]',
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
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-600 whitespace-nowrap transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/[0.05] cursor-pointer sm:flex-1"
                    >
                      Batal
                    </button>
                    <motion.button
                      type="submit"
                      className={cn(
                        'relative flex w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold text-zinc-950 cursor-pointer sm:flex-[1.5]',
                        'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600',
                        'shadow-md shadow-amber-500/25 ring-1 ring-inset ring-white/25 dark:shadow-amber-500/20',
                        'transition-all duration-250 hover:shadow-lg hover:shadow-amber-500/35'
                      )}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                    >
                      <Send className="h-4 w-4" />
                      Kirim ke Developer
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
