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
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Save, Tag, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/authStore'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatPhoneInput, isPhoneValid } from '@/lib/utils'
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
      setSelectedProvince(consultation.province || '')
      setSelectedCity(consultation.city || '')
      setSelectedDistrict(consultation.district || '')

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

  const handleNeedsToggle = (id: number) => {
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) {
      toast.error('Nama klien wajib diisi')
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
    if (phone.trim() && !isPhoneValid(phone)) {
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
      onError: (err: any) => {
        toast.error(err.message || 'Gagal memperbarui lead konsultasi.')
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/consultations/${consultationId}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">Update Data Lead</h1>
          <p className="text-xs text-muted-foreground/70">ID: {consultation.consultation_id} • Mengubah informasi lead dalam pipeline.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-foreground/90">Informasi Dasar Klien</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-name" className="text-xs font-semibold text-muted-foreground">Nama Klien *</Label>
                    <Input
                      id="client-name"
                      placeholder="Masukkan nama lengkap klien"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="border-border bg-background/60 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950/60"
                      required
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
                          "w-full h-9 justify-between text-left font-normal border border-border bg-background/60 hover:bg-background/80 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/60 text-foreground/80 rounded-lg px-3 text-xs focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden flex items-center",
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
                    <div className="h-9 px-3 rounded-lg border border-border bg-muted/20 text-xs font-bold text-amber-500 flex items-center dark:border-zinc-800 dark:bg-zinc-950/20">
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
                        placeholder="Cari/Pilih Kota"
                        isLoading={isLoadingCities}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dist" className="text-[10px] text-muted-foreground/70 font-bold uppercase">Kecamatan</Label>
                      <Autocomplete
                        id="dist"
                        value={selectedDistrict}
                        onChange={handleDistrictChange}
                        options={districtOptions}
                        placeholder="Cari/Pilih Kecamatan"
                        isLoading={isLoadingDistricts}
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

            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
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

          <div className="space-y-6">
            {isSuperAdmin && (
              <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
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

            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
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
                  className="w-full h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </CardContent>
            </Card>

            {/* Kategori Kebutuhan — scrollable list (matches the create form) */}
            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
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
                <div className="max-h-[460px] overflow-y-auto px-5 pb-4 space-y-1 scrollbar-thin">
                  {needs?.map((nd) => (
                    <label
                      key={nd.id}
                      htmlFor={`nd-${nd.id}`}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                        selectedNeeds.includes(nd.id)
                          ? 'bg-amber-500/10 dark:bg-amber-500/10'
                          : 'hover:bg-muted/60 dark:hover:bg-zinc-800/50',
                      )}
                    >
                      <input
                        type="checkbox"
                        id={`nd-${nd.id}`}
                        checked={selectedNeeds.includes(nd.id)}
                        onChange={() => handleNeedsToggle(nd.id)}
                        className="h-3.5 w-3.5 rounded border-border bg-background text-amber-500 focus:ring-amber-500/50 accent-amber-500 dark:border-zinc-700 dark:bg-zinc-950 shrink-0"
                      />
                      <span className={cn(
                        'text-xs font-medium',
                        selectedNeeds.includes(nd.id) ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/80',
                      )}>
                        {nd.name}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit + Cancel */}
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold h-10 shadow-[0_0_15px_color-mix(in_srgb,var(--primary-theme)_20%,transparent)] hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary-theme)_35%,transparent)] transition-all duration-300 rounded-xl"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan Perubahan...</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" />Simpan Perubahan</>
              )}
            </Button>

            <Link
              href={`/consultations/${consultationId}`}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'w-full border-border text-muted-foreground hover:text-foreground h-10 font-semibold dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              Batal
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
