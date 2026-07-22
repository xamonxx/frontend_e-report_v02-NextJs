'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateConsultation, usePreviewConsultationId } from '@/lib/hooks/useConsultations'
import {
  useNeedsCategories,
  useStatusCategories,
  useProvinces,
  useAccounts,
  useAllDetailedCities,
  useAllDetailedDistricts
} from '@/lib/hooks/useMasterData'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatApiError, formatPhoneInput, isPhoneValid, normalizeRegionName } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, User, MapPin, ClipboardList, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/authStore'
import { CustomSelect } from '@/components/ui/custom-select'
import { PanduanPengisian } from '@/components/consultations/panduan-pengisian'
import { ConsultationFormActions } from '@/components/consultations/consultation-form-actions'
import { NeedsCategoryOption } from '@/components/consultations/needs-category-option'
import { SearchField } from '@/components/ui/search-field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, parseISO } from 'date-fns'

export default function CreateConsultationPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const { data: accounts } = useAccounts()
  const { data: needs } = useNeedsCategories()
  const { data: statuses } = useStatusCategories()

  const [clientName, setClientName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<number | undefined>(undefined)
  const [selectedNeeds, setSelectedNeeds] = useState<number[]>([])
  const [needsQuery, setNeedsQuery] = useState('')
  const [consultationDate, setConsultationDate] = useState(new Date().toISOString().split('T')[0])
  const [productDetails, setProductDetails] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')

  const { data: provinces, isLoading: isLoadingProvinces } = useProvinces()
  const { data: allDetailedCities, isLoading: isLoadingCities } = useAllDetailedCities()
  const { data: allDetailedDistricts, isLoading: isLoadingDistricts } = useAllDetailedDistricts()

  const handleProvinceChange = (newProv: string) => {
    setSelectedProvince(newProv)
    setSelectedCity('')
    setSelectedDistrict('')
  }

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity)
    setSelectedDistrict('')
    if (!newCity) {
      setSelectedProvince('')
    } else if (allDetailedCities) {
      const match = allDetailedCities.find(c => c.city.toLowerCase() === newCity.toLowerCase())
      if (match) setSelectedProvince(match.province)
    }
  }

  const handleDistrictChange = (newDist: string) => {
    setSelectedDistrict(newDist)
    if (!newDist) {
      setSelectedCity('')
      setSelectedProvince('')
    } else if (allDetailedDistricts) {
      const match = allDetailedDistricts.find(d => d.district.toLowerCase() === newDist.toLowerCase())
      if (match) { setSelectedCity(match.city); setSelectedProvince(match.province) }
    }
  }

  const provinceOptions = React.useMemo(() => provinces || [], [provinces])

  const cityOptions = React.useMemo(() => {
    if (!allDetailedCities) return []
    let list = allDetailedCities
    if (selectedProvince) list = allDetailedCities.filter(c => c.province.toLowerCase() === selectedProvince.toLowerCase())
    return list.map(c => ({ label: c.city, value: c.city, sublabel: selectedProvince ? undefined : c.province }))
  }, [allDetailedCities, selectedProvince])

  const districtOptions = React.useMemo(() => {
    if (!allDetailedDistricts) return []
    let list = allDetailedDistricts
    if (selectedCity) list = allDetailedDistricts.filter(d => d.city.toLowerCase() === selectedCity.toLowerCase())
    else if (selectedProvince) list = allDetailedDistricts.filter(d => d.province.toLowerCase() === selectedProvince.toLowerCase())
    return list.map(d => ({ label: d.district, value: d.district, sublabel: `${d.city}, ${d.province}` }))
  }, [allDetailedDistricts, selectedCity, selectedProvince])

  const { data: previewIdData } = usePreviewConsultationId(selectedAccount)

  useEffect(() => {
    if (user && !isSuperAdmin) setSelectedAccount(user.account_id ?? undefined)
  }, [user, isSuperAdmin])

  const createMutation = useCreateConsultation()
  const requiresProductDetails = selectedNeeds.some(id => needs?.find(item => item.id === id)?.name.toLowerCase().includes('lain'))
  const filteredNeeds = needs?.filter((need) =>
    need.name.toLowerCase().includes(needsQuery.trim().toLowerCase()),
  ) ?? []

  const handleNeedsToggle = (id: number) => {
    setSelectedNeeds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) { toast.error('Nomor telepon / WhatsApp wajib diisi'); return }
    if (!selectedAccount) { toast.error('Akun wajib dipilih'); return }
    if (!selectedStatus) { toast.error('Status awal lead wajib dipilih'); return }
    if (selectedNeeds.length === 0) { toast.error('Pilih minimal satu kategori kebutuhan'); return }
    if (requiresProductDetails && productDetails.trim().length < 3) {
      toast.error('Detail kebutuhan wajib diisi ketika memilih kategori Lain-lain'); return
    }
    if (!isPhoneValid(phone)) {
      toast.error('Nomor telepon / WhatsApp tidak valid'); return
    }

    createMutation.mutate({
      client_name: clientName,
      phone: phone || undefined,
      account_id: selectedAccount,
      status_category_id: selectedStatus,
      needs_category_ids: selectedNeeds,
      consultation_date: consultationDate,
      product_details: productDetails || undefined,
      address: address || undefined,
      province: selectedProvince || undefined,
      city: selectedCity || undefined,
      district: selectedDistrict || undefined,
      notes: notes || undefined,
    } as any, {
      onSuccess: () => { toast.success('Lead konsultasi baru berhasil didaftarkan!'); router.push('/consultations') },
      onError: (err: unknown) => { toast.error(formatApiError(err, 'Gagal mendaftarkan lead konsultasi.')) },
    })
  }

  const cardClassName = 'consultation-card overflow-hidden'

  return (
    <div className="consultation-page mx-auto w-full max-w-[1520px] space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/consultations"
          aria-label="Kembali ke daftar konsultasi"
          title="Kembali"
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-[10px] border border-[color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-card text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--primary-theme)_42%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_8%,var(--card))] hover:text-[var(--primary-theme)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_30%,transparent)]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Tambah Lead Baru</h1>
          <p className="text-xs text-muted-foreground/70">Mendaftarkan lead baru ke pipeline akun interior.</p>
        </div>
        <PanduanPengisian isSuperAdmin={isSuperAdmin} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8 min-[1440px]:grid-cols-[minmax(0,1fr)_460px]">

          {/* ── LEFT: Main Form ───────────────────────────── */}
          <div className="min-w-0 space-y-5">

            {/* Section 1: Lead Config */}
            <Card className={cardClassName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
                  <span className="grid size-6 place-items-center rounded-lg bg-amber-500/10 text-[10px] font-black text-amber-500">01</span>
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  Konfigurasi Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Akun (Super Admin) — full width so dropdown has room */}
                {isSuperAdmin && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Pilih Akun *</Label>
                    <Autocomplete
                      value={selectedAccount ? selectedAccount.toString() : ''}
                      onChange={(val) => setSelectedAccount(val ? parseInt(val, 10) : undefined)}
                      placeholder="Cari/Pilih Akun..."
                      options={(accounts || []).map(acc => ({ value: acc.id.toString(), label: acc.name }))}
                      onlyChangeOnSelect
                      className="h-10 rounded-xl border-border/70 bg-background/60 text-xs shadow-inner shadow-black/[0.03] focus:border-amber-500/55 focus:ring-2 focus:ring-amber-500/15 dark:border-white/10 dark:bg-zinc-950/60"
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Status Lead */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Status Lead *</Label>
                    <CustomSelect
                      value={selectedStatus ? selectedStatus.toString() : ''}
                      onChange={(val) => setSelectedStatus(val ? parseInt(val, 10) : undefined)}
                      placeholder="Pilih Status"
                      options={[
                        { value: '', label: 'Pilih Status Awal' },
                        ...(statuses || []).map(st => ({ value: st.id.toString(), label: st.name })),
                      ]}
                      className="h-10 w-full rounded-xl border border-border/70 bg-background/60 px-3 text-xs text-foreground shadow-inner shadow-black/[0.03] focus:outline-none focus:ring-2 focus:ring-amber-500/15 dark:border-white/10 dark:bg-zinc-950/60"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="cons-date" className="text-xs font-semibold text-muted-foreground">Tanggal Konsultasi</Label>
                    <Popover>
                      <PopoverTrigger
                        id="cons-date"
                        type="button"
                        className={cn(
                          "consultation-control flex h-11 w-full items-center justify-between px-3.5 text-left text-sm font-normal text-foreground/80 outline-none",
                          !consultationDate && "text-muted-foreground"
                        )}
                      >
                        {consultationDate ? (
                          format(parseISO(consultationDate), 'dd/MM/yyyy')
                        ) : (
                          <span>Pilih Tanggal</span>
                        )}
                        <CalendarIcon className="h-4 w-4 ml-auto text-muted-foreground/70" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="start">
                        <Calendar
                          mode="single"
                          selected={consultationDate ? parseISO(consultationDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear()
                              const mm = String(date.getMonth() + 1).padStart(2, '0')
                              const dd = String(date.getDate()).padStart(2, '0')
                              setConsultationDate(`${yyyy}-${mm}-${dd}`)
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* ID Preview */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">ID Lead (Pratinjau)</Label>
                    <div className="consultation-control consultation-accent flex h-11 items-center border px-3.5 text-xs font-bold tabular-nums">
                      {previewIdData?.consultation_id || previewIdData?.id || 'Generating...'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Data Klien */}
            <Card className={cardClassName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
                  <span className="grid size-6 place-items-center rounded-lg bg-amber-500/10 text-[10px] font-black text-amber-500">02</span>
                  <User className="h-4 w-4 text-amber-500" />
                  Informasi Klien
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="client-name" className="text-xs font-semibold text-muted-foreground">Nama Klien</Label>
                    <Input
                      id="client-name"
                      placeholder="Masukkan nama lengkap klien"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="h-10 rounded-xl border-border/70 bg-background/60 shadow-inner shadow-black/[0.03] focus-visible:border-amber-500/55 focus-visible:ring-2 focus-visible:ring-amber-500/15 dark:border-white/10 dark:bg-zinc-950/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-phone" className="text-xs font-semibold text-muted-foreground">No. Telepon / WhatsApp *</Label>
                    <Input
                      id="client-phone"
                      placeholder="+62 812-3456-7890"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      inputMode="tel"
                      aria-invalid={phone.trim() !== '' && !isPhoneValid(phone)}
                      className={cn(
                        "h-10 rounded-xl bg-background/60 shadow-inner shadow-black/[0.03] dark:bg-zinc-950/60",
                        phone.trim() !== '' && !isPhoneValid(phone)
                          ? "border-red-500/60 focus-visible:ring-red-500/40 dark:border-red-500/50"
                          : "border-border focus-visible:ring-amber-500/50 dark:border-zinc-800"
                      )}
                    />
                    {phone.trim() !== '' && !isPhoneValid(phone) && (
                      <p className="text-[11px] font-medium text-red-500 dark:text-red-400">
                        Nomor tidak valid. Gunakan format lokal (08xx) atau internasional (+62 / +1 …).
                      </p>
                    )}
                  </div>
                </div>

                {/* Wilayah */}
                <div className="border-t border-border/60 pt-4 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <h3 className="text-xs font-semibold text-muted-foreground">Wilayah Domisili Klien</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase">Provinsi</Label>
                      <Autocomplete
                        value={selectedProvince}
                        onChange={handleProvinceChange}
                        options={provinceOptions}
                        placeholder="Cari/Pilih Provinsi"
                        isLoading={isLoadingProvinces}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase">Kabupaten / Kota</Label>
                      <Autocomplete
                        value={selectedCity}
                        onChange={handleCityChange}
                        options={cityOptions}
                        placeholder="Ketik/Pilih Kota"
                        isLoading={isLoadingCities}
                        allowCustomValue
                        normalizeCustomValue={normalizeRegionName}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase">Kecamatan</Label>
                      <Autocomplete
                        value={selectedDistrict}
                        onChange={handleDistrictChange}
                        options={districtOptions}
                        placeholder="Ketik/Pilih Kecamatan"
                        isLoading={isLoadingDistricts}
                        allowCustomValue
                        normalizeCustomValue={normalizeRegionName}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-address" className="text-xs font-semibold text-muted-foreground">Alamat Lengkap Klien</Label>
                  <Textarea
                    id="client-address"
                    placeholder="Masukkan alamat lengkap rumah/proyek klien"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="min-h-[72px] rounded-xl border-border/70 bg-background/60 focus-visible:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">Keterangan Tambahan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Masukkan catatan atau keterangan tambahan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[84px] rounded-xl border-border/70 bg-background/60 focus-visible:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60"
                  />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ── RIGHT: Kategori + Detail + Submit ──────────── */}
          <div className="min-w-0 space-y-4 xl:sticky xl:top-4">
            <Card className={cardClassName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
                  <span className="grid size-6 place-items-center rounded-lg bg-amber-500/10 text-[10px] font-black text-amber-500">03</span>
                  Kategori Kebutuhan <span className="text-amber-500">*</span>
                </CardTitle>
                {selectedNeeds.length > 0 && (
                  <p className="text-[10px] text-amber-500 font-semibold">{selectedNeeds.length} dipilih</p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pb-3 sm:px-5">
                  <SearchField
                    value={needsQuery}
                    onValueChange={setNeedsQuery}
                    placeholder="Cari kategori kebutuhan"
                    aria-label="Cari kategori kebutuhan"
                    size="compact"
                    showShortcut
                    pageSearch
                  />
                </div>
                <div className="grid max-h-[min(48dvh,420px)] grid-cols-1 gap-2 overflow-y-auto px-4 pb-4 min-[390px]:grid-cols-2 sm:max-h-[380px] sm:px-5 xl:max-h-[330px] scrollbar-thin">
                  {filteredNeeds.map((need) => (
                    <NeedsCategoryOption
                      key={need.id}
                      inputId={`nd-${need.id}`}
                      label={need.name}
                      checked={selectedNeeds.includes(need.id)}
                      onChange={() => handleNeedsToggle(need.id)}
                    />
                  ))}
                  {needsQuery && filteredNeeds.length === 0 && (
                    <p className="col-span-full px-2.5 py-6 text-center text-xs text-muted-foreground">
                      Kategori &quot;{needsQuery}&quot; tidak ditemukan.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={cardClassName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
                  <span className="grid size-6 place-items-center rounded-lg bg-amber-500/10 text-[10px] font-black text-amber-500">04</span>
                  Detail Proyek
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">Model, material, ukuran, dan estimasi anggaran.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={requiresProductDetails ? 'Wajib diisi untuk kategori Lain-lain...' : 'Deskripsikan model, bahan baku, ukuran ruangan, estimasi budget, dsb...'}
                  value={productDetails}
                  onChange={(event) => setProductDetails(event.target.value)}
                  className="min-h-[132px] rounded-xl border-border/70 bg-background/60 focus-visible:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60"
                />
              </CardContent>
            </Card>

            <ConsultationFormActions
              cancelHref="/consultations"
              isPending={createMutation.isPending}
              pendingLabel="Menyimpan Lead..."
              selectedCount={selectedNeeds.length}
              submitLabel="Simpan Lead"
            />
          </div>

        </div>
      </form>
    </div>
  )
}
