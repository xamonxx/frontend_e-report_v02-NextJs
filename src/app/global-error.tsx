'use client'

import { useEffect } from 'react'

/**
 * Root error boundary. Renders ONLY when the root layout (or a provider it
 * mounts) throws — it replaces the entire document, so it must render its own
 * <html>/<body> and cannot rely on globals.css. Styles are therefore inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          backgroundColor: '#020617',
          color: '#f8fafc',
          backgroundImage:
            'linear-gradient(to right, rgba(71,85,105,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(71,85,105,0.18) 1px, transparent 1px), radial-gradient(circle at 50% 42%, rgba(245,158,11,0.10) 0%, transparent 60%)',
          backgroundSize: '34px 34px, 34px 34px, 100% 100%',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <main style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(88px, 26vw, 140px)',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              backgroundImage: 'linear-gradient(135deg, #f59e0b, #fcd34d 55%, #b45309)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            500
          </div>
          <h1 style={{ marginTop: 14, fontSize: 22, fontWeight: 700 }}>
            Terjadi Kesalahan Sistem
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#94a3b8',
            }}
          >
            Aplikasi mengalami gangguan tak terduga. Silakan muat ulang halaman.
          </p>

          {error?.digest && (
            <p
              style={{
                marginTop: 14,
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #1e293b',
                background: 'rgba(30,41,59,0.4)',
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#94a3b8',
              }}
            >
              Ref: {error.digest}
            </p>
          )}

          <div style={{ marginTop: 28 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: '#f59e0b',
                color: '#0b0f19',
                fontSize: 14,
                fontWeight: 700,
                padding: '13px 28px',
                borderRadius: 14,
                boxShadow: '0 10px 28px -8px rgba(245,158,11,0.55)',
              }}
            >
              Coba Lagi
            </button>
          </div>

          <div style={{ marginTop: 44, fontSize: 12, color: '#475569' }}>
            E-Report — Putra Corporation
          </div>
        </main>
      </body>
    </html>
  )
}
