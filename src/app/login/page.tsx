'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { useLogin } from '@/lib/hooks/useAuth'
import { Loader2, Eye, EyeOff, AlertCircle, Home } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import LoginBackground from '@/components/login/login-background'

const loginSchema = zod.object({
  email: zod.string().email({ message: 'Alamat email tidak valid.' }),
  password: zod.string().min(8, { message: 'Password minimal 8 karakter.' }),
  remember: zod.boolean().optional(),
})

type LoginFormValues = zod.infer<typeof loginSchema>

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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  })

  const emailValue = watch('email')

  useEffect(() => {
    if (!emailValue) {
      const root = document.documentElement
      root.style.setProperty('--primary-theme', '#f59e0b')
      return
    }

    const delay = setTimeout(async () => {
      if (emailValue.includes('@') && emailValue.includes('.')) {
        try {
          const res = await fetch(`/api/v1/auth/color-lookup?email=${encodeURIComponent(emailValue)}`)
          const data = await res.json()
          if (data && data.primary_color) {
            const root = document.documentElement
            root.style.setProperty('--primary-theme', data.primary_color)
          }
        } catch (e) {
          // Ignore lookup errors
        }
      } else {
        const root = document.documentElement
        root.style.setProperty('--primary-theme', '#f59e0b')
      }
    }, 200)

    return () => clearTimeout(delay)
  }, [emailValue])

  const onSubmit = (data: LoginFormValues) => {
    setAuthError(null)
    loginMutation.mutate(data, {
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Email atau password tidak sesuai.'
        setAuthError(msg)
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 560)
      },
    })
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8">

      {/* ─── Animated Background ─── */}
      <LoginBackground />

      {/* ─── Login Card ─── */}
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
            {/* ─── Logo + Heading ─── */}
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
                    <Home className="h-7 w-7 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.55)]" />
                  </motion.div>
                </div>
              </div>
              <h1 className="text-[22px] font-black uppercase tracking-widest text-gradient-amber leading-tight">
                Putra Corporation
              </h1>
              <p className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-500">
                Masuk untuk mengakses sistem E-Report
              </p>
            </motion.div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Auth error */}
              <AnimatePresence>
                {authError && (
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
                <a
                  href="#"
                  className="text-xs font-medium text-amber-600 hover:text-amber-500 dark:text-amber-500/70 dark:hover:text-amber-400 transition-colors"
                >
                  Lupa password?
                </a>
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
    </div>
  )
}
