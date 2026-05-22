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
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/authStore'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatPhoneInput } from '@/lib/utils'

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

  const { data: previewIdData } = usePreviewConsultationId(selectedAccount)

  useEffect(() => {
    if (user && !isSuperAdmin) {
      setSelectedAccount(user.account_id ?? undefined)
    }
  }, [user, isSuperAdmin])

  const createMutation = useCreateConsultation()
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
      toast.error('Cabang/Akun wajib dipilih')
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

    const payload = {
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
    }

    createMutation.mutate(payload as any, {
      onSuccess: () => {
        toast.success('Lead konsultasi baru berhasil didaftarkan!')
        router.push('/consultations')
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal mendaftarkan lead konsultasi.')
      },
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/consultations"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">Tambah Lead Baru</h1>
          <p className="text-xs text-muted-foreground/70">Mendaftarkan lead baru ke pipeline cabang interior.</p>
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
                      className="border-border bg-background/60 focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cons-date" className="text-xs font-semibold text-muted-foreground">Tanggal Konsultasi</Label>
                    <Input
                      id="cons-date"
                      type="date"
                      value={consultationDate}
                      onChange={(e) => setConsultationDate(e.target.value)}
                      className="border-border bg-background/60 focus-visible:ring-amber-500/50 text-foreground/80 dark:border-zinc-800 dark:bg-zinc-950/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">ID Lead (Pratinjau)</Label>
                    <div className="h-9 px-3 rounded-lg border border-border bg-muted/20 text-xs font-bold text-amber-500 flex items-center dark:border-zinc-800 dark:bg-zinc-950/20">
                      {previewIdData?.consultation_id || previewIdData?.id || 'Generating...'}
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
                  <CardTitle className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Pilih Cabang *</CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomSelect
                    value={selectedAccount ? selectedAccount.toString() : ''}
                    onChange={(val) => setSelectedAccount(val ? parseInt(val, 10) : undefined)}
                    placeholder="Pilih Cabang"
                    options={[
                      { value: "", label: "Pilih Cabang" },
                      ...(accounts || []).map((acc) => ({
                        value: acc.id.toString(),
                        label: acc.name
                      }))
                    ]}
                    className="w-full h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
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
                  placeholder="Pilih Status Awal"
                  options={[
                    { value: "", label: "Pilih Status Awal" },
                    ...(statuses || []).map((st) => ({
                      value: st.id.toString(),
                      label: st.name
                    }))
                  ]}
                  className="w-full h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Kategori Kebutuhan *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {needs?.map((nd) => (
                  <div key={nd.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`nd-${nd.id}`}
                      checked={selectedNeeds.includes(nd.id)}
                      onChange={() => handleNeedsToggle(nd.id)}
                      className="h-4 w-4 rounded border-border bg-background text-amber-500 focus:ring-amber-500/50 accent-amber-500 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                    <Label htmlFor={`nd-${nd.id}`} className="text-xs text-foreground/80 font-medium cursor-pointer">
                      {nd.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold h-9"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan Lead...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Simpan Lead
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
