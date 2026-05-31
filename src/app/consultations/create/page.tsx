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
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Save, Building2, User, MapPin, ClipboardList, Tag } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/authStore'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatPhoneInput, isPhoneValid } from '@/lib/utils'

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

  const handleNeedsToggle = (id: number) => {
    setSelectedNeeds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) { toast.error('Nama klien wajib diisi'); return }
    if (!selectedAccount) { toast.error('Cabang/Akun wajib dipilih'); return }
    if (!selectedStatus) { toast.error('Status awal lead wajib dipilih'); return }
    if (selectedNeeds.length === 0) { toast.error('Pilih minimal satu kategori kebutuhan'); return }
    if (requiresProductDetails && productDetails.trim().length < 3) {
      toast.error('Detail kebutuhan wajib diisi ketika memilih kategori Lain-lain'); return
    }
    if (phone.trim() && !isPhoneValid(phone)) {
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
      onError: (err: any) => { toast.error(err.message || 'Gagal mendaftarkan lead konsultasi.') },
    })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/consultations"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Tambah Lead Baru</h1>
          <p className="text-xs text-muted-foreground/70">Mendaftarkan lead baru ke pipeline cabang interior.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">

          {/* ── LEFT: Main Form ───────────────────────────── */}
          <div className="space-y-5">

            {/* Section 1: Lead Config */}
            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  Konfigurasi Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cabang (Super Admin) — full width so dropdown has room */}
                {isSuperAdmin && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Pilih Cabang *</Label>
                    <Autocomplete
                      value={selectedAccount ? selectedAccount.toString() : ''}
                      onChange={(val) => setSelectedAccount(val ? parseInt(val, 10) : undefined)}
                      placeholder="Cari/Pilih Cabang..."
                      options={(accounts || []).map(acc => ({ value: acc.id.toString(), label: acc.name }))}
                      onlyChangeOnSelect
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
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cons-date" className="text-xs font-semibold text-muted-foreground">Tanggal Konsultasi</Label>
                    <Input
                      id="cons-date"
                      type="date"
                      value={consultationDate}
                      onChange={(e) => setConsultationDate(e.target.value)}
                      className="h-9 border-border bg-background/60 focus-visible:ring-amber-500/50 text-foreground/80 dark:border-zinc-800 dark:bg-zinc-950/60"
                    />
                  </div>

                  {/* ID Preview */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">ID Lead (Pratinjau)</Label>
                    <div className="h-9 px-3 rounded-lg border border-border bg-muted/20 text-xs font-bold text-amber-500 flex items-center dark:border-zinc-800 dark:bg-zinc-950/20">
                      {previewIdData?.consultation_id || previewIdData?.id || 'Generating...'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Data Klien */}
            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-500" />
                  Informasi Klien
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
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
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase">Kabupaten / Kota</Label>
                      <Autocomplete
                        value={selectedCity}
                        onChange={handleCityChange}
                        options={cityOptions}
                        placeholder="Cari/Pilih Kota"
                        isLoading={isLoadingCities}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase">Kecamatan</Label>
                      <Autocomplete
                        value={selectedDistrict}
                        onChange={handleDistrictChange}
                        options={districtOptions}
                        placeholder="Cari/Pilih Kecamatan"
                        isLoading={isLoadingDistricts}
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
                    className="border-border bg-background/60 focus-visible:ring-amber-500/50 min-h-[60px] dark:border-zinc-800 dark:bg-zinc-950/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">Keterangan Tambahan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Masukkan catatan atau keterangan tambahan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border-border bg-background/60 focus-visible:ring-amber-500/50 min-h-[72px] dark:border-zinc-800 dark:bg-zinc-950/60"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Kebutuhan Produk */}
            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Kebutuhan Produk &amp; Interior
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground/70">
                  Rincian pengerjaan mebel, kitchen set, atau konsep dekorasi interior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={requiresProductDetails
                    ? 'Wajib diisi untuk kategori Lain-lain...'
                    : 'Deskripsikan model, bahan baku, ukuran ruangan, estimasi budget, dsb...'}
                  value={productDetails}
                  onChange={(e) => setProductDetails(e.target.value)}
                  className="border-border bg-background/60 focus-visible:ring-amber-500/50 min-h-[110px] dark:border-zinc-800 dark:bg-zinc-950/60"
                />
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Kategori + Submit ───────────────────── */}
          <div className="space-y-5">
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

            {/* Submit */}
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold h-10 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all duration-300 rounded-xl"
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan Lead...</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" />Simpan Lead</>
              )}
            </Button>
          </div>

        </div>
      </form>
    </div>
  )
}
