'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Phone,
  User,
  MapPin,
  Tag,
  FileText,
  Building2,
  Lightbulb,
} from 'lucide-react'

type Props = {
  /** Super Admin memilih akun sendiri; Admin terkunci pada akunnya. */
  isSuperAdmin: boolean
  className?: string
}

type Section = {
  icon: React.ElementType
  title: string
  body: React.ReactNode
}

/**
 * Panduan pengisian lead konsultasi. Isinya mengikuti aturan yang benar-benar
 * dijalankan API (ConsultationRequest), jadi setiap perubahan aturan di sana
 * perlu diikutkan ke sini.
 */
export function PanduanPengisian({ isSuperAdmin, className }: Props) {
  const sections: Section[] = [
    {
      icon: Building2,
      title: 'Akun & Status Lead',
      body: isSuperAdmin ? (
        <>
          <p>
            Sebagai Super Admin, Anda mengisi lead untuk akun mana pun. Pilih akunnya lebih dulu, karena
            ID Lead dibuat mengikuti akun yang dipilih.
          </p>
          <p>
            Pemeriksaan nomor ganda juga hanya berlaku di dalam akun tersebut. Nomor yang sama boleh
            dipakai di akun lain, karena satu konsumen memang bisa menghubungi dua interior sekaligus.
          </p>
          <p>Status lead wajib dipilih. Kalau belum ada perkembangan, gunakan status awal seperti &ldquo;Baru&rdquo;.</p>
        </>
      ) : (
        <>
          <p>
            Akun sudah terisi otomatis dengan akun Anda dan tidak perlu diubah. Semua lead yang Anda buat
            masuk ke akun tersebut.
          </p>
          <p>Status lead wajib dipilih. Kalau belum ada perkembangan, gunakan status awal seperti &ldquo;Baru&rdquo;.</p>
        </>
      ),
    },
    {
      icon: User,
      title: 'Nama Klien - boleh dikosongkan',
      body: (
        <>
          <p>
            Tidak semua konsumen mau menyebutkan namanya. Kalau begitu, biarkan kosong saja. Sistem akan
            mengisinya sebagai &ldquo;Tidak ada nama&rdquo;, dan Anda bisa melengkapinya nanti lewat tombol Edit.
          </p>
          <p>
            Nama yang sama antar lead diperbolehkan. Dua konsumen bernama Budi tetap tercatat sebagai dua
            lead terpisah.
          </p>
          <p className="text-muted-foreground">
            Maksimal 100 karakter. Gunakan huruf, angka, dan tanda baca biasa saja.
          </p>
        </>
      ),
    },
    {
      icon: Phone,
      title: 'Nomor Telepon / WhatsApp - wajib & tidak boleh kembar',
      body: (
        <>
          <p>
            Nomor inilah penanda utama sebuah lead, jadi wajib diisi. Dalam satu akun, satu nomor hanya
            boleh dipakai satu lead.
          </p>
          <p>
            Kalau muncul peringatan nomor sudah terdaftar, artinya konsumen tersebut sudah pernah dicatat.
            Buka lead lamanya dan perbarui di sana - jangan membuat lead baru, supaya riwayatnya tidak terpecah.
          </p>
          <p className="text-muted-foreground">
            Nomor Indonesia diawali 08. Nomor luar negeri diawali tanda + dan kode negara, misalnya +60 atau +65.
          </p>
        </>
      ),
    },
    {
      icon: MapPin,
      title: 'Wilayah - isi seadanya',
      body: (
        <>
          <p>
            Isi sesuai yang disebutkan konsumen. Kalau dia hanya menyebut provinsi, isi provinsi saja. Kalau
            menyebut provinsi dan kota, isi keduanya. Tidak perlu menebak-nebak yang belum jelas.
          </p>
          <p>
            Bagian yang dikosongkan tercatat sebagai &ldquo;Belum ada konfirmasi&rdquo;, dan bisa dilengkapi kapan saja
            setelah konsumen memberi kejelasan.
          </p>
          <p>
            Kecamatan boleh diketik manual bila tidak ada di daftar. Namun bila nama kecamatannya dikenali
            berada di kota lain, sistem akan mengingatkan - biasanya itu tandanya kota yang dipilih keliru.
          </p>
          <p className="text-muted-foreground">
            Alamat lengkap sifatnya opsional, minimal 5 karakter bila diisi.
          </p>
        </>
      ),
    },
    {
      icon: Tag,
      title: 'Kategori Kebutuhan - minimal satu',
      body: (
        <>
          <p>
            Centang semua kebutuhan yang disebutkan konsumen; boleh lebih dari satu. Gunakan kolom pencarian
            di atas daftar untuk menemukan kategori dengan cepat.
          </p>
          <p>
            Belum tahu kebutuhannya? Pilih &ldquo;Belum ada konfirmasi&rdquo;. Jangan dibiarkan kosong, dan jangan asal
            centang - data ini yang nanti dibaca di laporan.
          </p>
          <p>
            Bila memilih &ldquo;Lain-lain&rdquo;, jelaskan kebutuhannya di kolom Detail Proyek. Tanpa itu, lead belum bisa
            disimpan.
          </p>
        </>
      ),
    },
    {
      icon: FileText,
      title: 'Detail Proyek & Keterangan',
      body: (
        <>
          <p>
            Detail Proyek untuk hal teknis: model, bahan, ukuran ruangan, dan perkiraan anggaran. Keterangan
            Tambahan untuk catatan bebas, misalnya jam yang enak dihubungi atau sumber konsumen.
          </p>
          <p>
            Keduanya opsional, kecuali Anda memilih kategori &ldquo;Lain-lain&rdquo;. Tapi semakin lengkap catatannya,
            semakin gampang tim melanjutkan follow up.
          </p>
          <p className="text-muted-foreground">Hindari tanda &lt; dan &gt; karena tidak diterima sistem.</p>
        </>
      ),
    },
  ]

  return (
    <Dialog>
      <DialogTrigger
        aria-label="Buka panduan pengisian data konsultasi"
        className={cn(
          'flex shrink-0 items-center gap-2.5 rounded-xl border border-border/70 bg-card p-2 text-left transition-colors hover:border-amber-500/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:px-3 dark:border-white/[0.07] dark:hover:bg-zinc-800/40',
          className,
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
          <BookOpen className="size-3.5" />
        </span>
        {/* Di layar kecil tombol tampil sebagai ikon saja agar header tetap ringkas. */}
        <span className="hidden text-right sm:block">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Butuh bantuan?
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-foreground">Panduan pengisian</span>
        </span>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-20">
          <DialogTitle className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-foreground/90">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
              <BookOpen className="size-4" />
            </span>
            Panduan Pengisian Data Konsultasi
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed">
            {isSuperAdmin ? 'Versi Super Admin. ' : 'Versi Admin. '}
            Isi apa adanya sesuai yang disampaikan konsumen. Data yang belum jelas tidak perlu ditebak -
            biarkan kosong, sistem sudah menyiapkan penandanya, dan Anda bisa melengkapi kapan saja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 border-t border-border/60 pt-4 dark:border-zinc-800/60">
          {sections.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800/70">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-bold text-foreground/90">{title}</h4>
                <div className="mt-1 space-y-1.5 text-[11px] leading-relaxed text-foreground/70 [&_p]:m-0">
                  {body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <p className="text-[11px] leading-relaxed text-foreground/75">
            <span className="font-bold text-foreground/90">Ringkasnya:</span> yang benar-benar wajib hanya{' '}
            {isSuperAdmin ? 'akun, ' : ''}status lead, nomor telepon, dan minimal satu kategori kebutuhan.
            Selebihnya boleh menyusul.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
