'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useConsultation, useUpdateConsultation } from '@/lib/hooks/useConsultations'
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
import { buttonVariants } from '@/components/ui/button'
import { cn, formatApiError, formatPhoneInput, isPhoneValid, normalizeRegionName, regionFieldValue } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Tag, Calendar as CalendarIcon } from 'lucide-react'
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

type PageParams = {
  id: string
}

export default function EditConsultationPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params)
  const consultationId = parseInt(resolvedParams.id, 10)
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const { data: detailResponse, isLoading: isDetailLoading, error: detailError } = useConsultation(consultationId)
  const consultation = detailResponse?.data

  const { data: accounts } = useAccounts()
  const { data: needs } = useNeedsCategories()
  const { data: statuses } = useStatusCategories()

  const [clientName, setClientName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<number | undefined>(undefined)
  const [selectedNeeds, setSelectedNeeds] = useState<number[]>([])
  const [needsQuery, setNeedsQuery] = useState('')
  const [consultationDate, setConsultationDate] = useState('')
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
      const match = allDetailedCities.find(
        (c) => c.city.toLowerCase() === newCity.toLowerCase()
      )
      if (match) {
        setSelectedProvince(match.province)
      }
    }
  }

  const handleDistrictChange = (newDist: string) => {
    setSelectedDistrict(newDist)

    if (!newDist) {
      setSelectedCity('')
      setSelectedProvince('')
    } else if (allDetailedDistricts) {
      const match = allDetailedDistricts.find(
        (d) => d.district.toLowerCase() === newDist.toLowerCase()
      )
      if (match) {
        setSelectedCity(match.city)
        setSelectedProvince(match.province)
      }
    }
  }

  const provinceOptions = React.useMemo(() => {
    return provinces || []
  }, [provinces])

  const cityOptions = React.useMemo(() => {
    if (!allDetailedCities) return []

    let list = allDetailedCities
    if (selectedProvince) {
      list = allDetailedCities.filter(
        (c) => c.province.toLowerCase() === selectedProvince.toLowerCase()
      )
    }

    return list.map((c) => ({
      label: c.city,
      value: c.city,
      sublabel: selectedProvince ? undefined : c.province,
    }))
  }, [allDetailedCities, selectedProvince])

  const districtOptions = React.useMemo(() => {
    if (!allDetailedDistricts) return []

    let list = allDetailedDistricts
    if (selectedCity) {
      list = allDetailedDistricts.filter(
        (d) => d.city.toLowerCase() === selectedCity.toLowerCase()
      )
    } else if (selectedProvince) {
      list = allDetailedDistricts.filter(
        (d) => d.province.toLowerCase() === selectedProvince.toLowerCase()
      )
    }

    return list.map((d) => ({
      label: d.district,
      value: d.district,
      sublabel: `${d.city}, ${d.province}`,
    }))
  }, [allDetailedDistricts, selectedCity, selectedProvince])

  useEffect(() => {
    if (consultation) {
      setClientName(consultation.client_name || '')
      setPhone(formatPhoneInput(consultation.phone || ''))
      setSelectedAccount(consultation.account_id || undefined)
      setSelectedStatus(consultation.status_category_id || undefined)
      setConsultationDate(consultation.consultation_date ? consultation.consultation_date.split('T')[0] : '')
      setProductDetails(consultation.product_details || '')
      setAddress(consultation.address || '')
      setNotes(consultation.notes || '')
      setSelectedProvince(regionFieldValue(consultation.province))
      setSelectedCity(regionFieldValue(consultation.city))
      setSelectedDistrict(regionFieldValue(consultation.district))

      if (consultation.needs_categories) {
        setSelectedNeeds(consultation.needs_categories.map((nc) => nc.id))
      } else if (consultation.needs_category) {
        setSelectedNeeds([consultation.needs_category.id])
      }
    }
  }, [consultation])

  const updateMutation = useUpdateConsultation(consultationId)
  const requiresProductDetails = selectedNeeds.some((id) => {
    const selected = needs?.find((item) => item.id === id)
    return selected?.name.toLowerCase().includes('lain')
  })
  const filteredNeeds = needs?.filter((need) =>
    need.name.toLowerCase().includes(needsQuery.trim().toLowerCase()),
  ) ?? []

  const handleNeedsToggle = (id: number) => {
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone.trim()) {
      toast.error('Nomor telepon / WhatsApp wajib diisi')
      return
    }
    if (!selectedAccount) {
      toast.error('Akun wajib dipilih')
      return
    }
    if (!selectedStatus) {
      toast.error('Status awal lead wajib dipilih')
      return
    }
    if (selectedNeeds.length === 0) {
      toast.error('Pilih minimal satu kategori kebutuhan')
      return
    }
    if (requiresProductDetails && productDetails.trim().length < 3) {
      toast.error('Detail kebutuhan wajib diisi ketika memilih kategori Lain-lain')
      return
    }
    if (!isPhoneValid(phone)) {
      toast.error('Nomor telepon / WhatsApp tidak valid')
      return
    }

    const payload = {
      client_name: clientName,
      phone: phone || undefined,
      account_id: selectedAccount,
      status_category_id: selectedStatus,
      needs_category_ids: selectedNeeds,
      consultation_date: consultationDate || undefined,
      product_details: productDetails || undefined,
      address: address || undefined,
      province: selectedProvince || undefined,
      city: selectedCity || undefined,
      district: selectedDistrict || undefined,
      notes: notes || undefined,
    }

    updateMutation.mutate(payload as any, {
      onSuccess: () => {
        toast.success('Data lead konsultasi berhasil diperbarui!')
        router.push(`/consultations/${consultationId}`)
      },
      onError: (err: unknown) => {
        toast.error(formatApiError(err, 'Gagal memperbarui lead konsultasi.'))
      },
    })
  }

  if (isDetailLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Memuat data lead...</span>
      </div>
    )
  }

  if (detailError || !consultation) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-muted-foreground gap-4">
        <p className="text-sm font-medium">Gagal memuat detail konsultasi atau lead tidak ditemukan.</p>
        <Link
          href="/consultations"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'border-border text-foreground/80 dark:border-zinc-800 dark:text-zinc-300'
          )}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar
        </Link>
      </div>
    )
  }

  return (
    <div className="consultation-page mx-auto w-full max-w-[1520px] space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/consultations/${consultationId}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'size-10 rounded-[10px] border border-[color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-card text-muted-foreground hover:border-[color-mix(in_srgb,var(--primary-theme)_42%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_8%,var(--card))] hover:text-[var(--primary-theme)]'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">Update Data Lead</h1>
          <p className="text-xs text-muted-foreground/70">ID: {consultation.consultation_id} - Mengubah informasi lead dalam pipeline.</p>
        </div>
        <PanduanPengisian isSuperAdmin={isSuperAdmin} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8 min-[1440px]:grid-cols-[minmax(0,1fr)_460px]">
          <div className="min-w-0 space-y-6">
            <Card className="consultation-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground/90">Informasi Dasar Klien</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-name" className="text-xs font-semibold text-muted-foreground">Nama Klien</Label>
                    <Input
                      id="client-name"
                      placeholder="Masukkan nama lengkap klien"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="border-border bg-background/60 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client-phone" className="text-xs font-semibold text-muted-foreground">No. Telepon / WhatsApp</Label>
                    <Input
                      id="client-phone"
                      placeholder="+62 812-3456-7890"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      inputMode="tel"
                      aria-invalid={phone.trim() !== '' && !isPhoneValid(phone)}
                      className={cn(
                        "bg-background/60 dark:bg-zinc-950/60",
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

                   <div className="space-y-2 flex flex-col">
                    <Label htmlFor="cons-date" className="text-xs font-semibold text-muted-foreground">Tanggal Konsultasi</Label>
                    <Popover>
                      <PopoverTrigger
                        id="cons-date"
                        type="button"
                        className={cn(
                          "consultation-control flex h-11 w-full items-center justify-between border px-3 text-left text-xs font-normal text-foreground/80 outline-none",
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

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">ID Lead</Label>
                    <div className="consultation-control consultation-accent flex h-11 items-center border px-3 text-xs font-bold tabular-nums">
                      {consultation.consultation_id}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4 mt-2 dark:border-zinc-800/60">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3">Wilayah Domisili Klien</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prov" className="text-[10px] text-muted-foreground/70 font-bold uppercase">Provinsi</Label>
                      <Autocomplete
                        id="prov"
                        value={selectedProvince}
                        onChange={handleProvinceChange}
                        options={provinceOptions}
                        placeholder="Cari/Pilih Provinsi"
                        isLoading={isLoadingProvinces}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-[10px] text-muted-foreground/70 font-bold uppercase">Kabupaten / Kota</Label>
                      <Autocomplete
                        id="city"
                        value={selectedCity}
                        onChange={handleCityChange}
                        options={cityOptions}
                        placeholder="Ketik/Pilih Kota"
                        isLoading={isLoadingCities}
                        allowCustomValue
                        normalizeCustomValue={normalizeRegionName}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dist" className="text-[10px] text-muted-foreground/70 font-bold uppercase">Kecamatan</Label>
                      <Autocomplete
                        id="dist"
                        value={selectedDistrict}
                        onChange={handleDistrictChange}
                        options={districtOptions}
                        placeholder="Ketik/Pilih Kecamatan"
                        isLoading={isLoadingDistricts}
                        allowCustomValue
                        normalizeCustomValue={normalizeRegionName}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-address" className="text-xs font-semibold text-muted-foreground">Alamat Lengkap Klien</Label>
                  <Textarea
                    id="client-address"
                    placeholder="Masukkan alamat lengkap rumah/proyek klien"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border-border bg-background/60 focus-visible:ring-amber-500/50 min-h-[60px] dark:border-zinc-800 dark:bg-zinc-950/60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">Keterangan Tambahan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Masukkan catatan atau keterangan tambahan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border-border bg-background/60 focus-visible:ring-amber-500/50 min-h-[80px] dark:border-zinc-800 dark:bg-zinc-950/60"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="consultation-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground/90">Kebutuhan Produk & Interior</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground/70">
                  Rincian pengerjaan mebel, kitchen set, atau konsep dekorasi interior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={requiresProductDetails ? 'Wajib diisi untuk kategori Lain-lain...' : 'Deskripsikan model, bahan baku, ukuran ruangan, estimasi budget, dsb...'}
                  value={productDetails}
                  onChange={(e) => setProductDetails(e.target.value)}
                  className="border-border bg-background/60 focus-visible:ring-amber-500/50 min-h-[120px] dark:border-zinc-800 dark:bg-zinc-950/60"
                />
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-4 xl:sticky xl:top-4">
            {isSuperAdmin && (
              <Card className="consultation-card">
                <CardHeader>
                  <CardTitle className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Pilih Akun *</CardTitle>
                </CardHeader>
                <CardContent>
                  <Autocomplete
                    value={selectedAccount ? selectedAccount.toString() : ''}
                    onChange={(val) => setSelectedAccount(val ? parseInt(val, 10) : undefined)}
                    placeholder="Cari/Pilih Akun"
                    options={(accounts || []).map((acc) => ({
                      value: acc.id.toString(),
                      label: acc.name
                    }))}
                    onlyChangeOnSelect
                  />
                </CardContent>
              </Card>
            )}

            <Card className="consultation-card">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Status Lead *</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomSelect
                  value={selectedStatus ? selectedStatus.toString() : ''}
                  onChange={(val) => setSelectedStatus(val ? parseInt(val, 10) : undefined)}
                  placeholder="Pilih Status"
                  options={[
                    { value: "", label: "Pilih Status" },
                    ...(statuses || []).map((st) => ({
                      value: st.id.toString(),
                      label: st.name
                    }))
                  ]}
                  className="h-11 w-full text-xs"
                />
              </CardContent>
            </Card>

            {/* Kategori Kebutuhan — scrollable list (matches the create form) */}
            <Card className="consultation-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-amber-500" />
                  Kategori Kebutuhan *
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

            <ConsultationFormActions
              cancelHref={`/consultations/${consultationId}`}
              isPending={updateMutation.isPending}
              pendingLabel="Menyimpan Perubahan..."
              selectedCount={selectedNeeds.length}
              submitLabel="Simpan Perubahan"
            />
          </div>
        </div>
      </form>
    </div>
  )
}
