"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 rounded-full bg-zinc-800 p-6">
        <WifiOff className="h-12 w-12 text-amber-400" />
      </div>

      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Tidak Ada Koneksi</h1>
      <p className="text-zinc-400 text-sm mb-8 max-w-xs">
        Periksa koneksi internet Anda, lalu coba lagi.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400 active:scale-95 transition-all"
      >
        <RefreshCw className="h-4 w-4" />
        Coba Lagi
      </button>

      <div className="mt-12 text-xs text-zinc-600">
        E-Report — Putra Corporation
      </div>
    </div>
  );
}
