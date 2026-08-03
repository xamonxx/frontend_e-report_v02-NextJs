'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ZoomIn, Loader2 } from 'lucide-react'

/**
 * Crop area (canvas) jadi PNG 512x512. Re-encode lewat canvas otomatis
 * membuang metadata/EXIF dari gambar asli.
 */
async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', () => reject(new Error('Gambar gagal dimuat.')))
    img.src = imageSrc
  })

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung browser ini.')

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Gagal memproses gambar.'))),
      'image/png',
    )
  })
}

export function AvatarCropper({
  imageSrc,
  open,
  saving,
  onCancel,
  onConfirm,
}: {
  imageSrc: string | null
  open: boolean
  saving: boolean
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels) return
    const blob = await getCroppedBlob(imageSrc, areaPixels)
    onConfirm(blob)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel()
      }}
    >
      <DialogContent className="max-w-md p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Sesuaikan Foto</DialogTitle>
          <DialogDescription className="text-xs">
            Geser dan perbesar untuk mengatur bagian foto yang tampil.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-muted dark:bg-zinc-950">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Perbesar foto"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-amber-500 dark:bg-zinc-800"
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="text-muted-foreground text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !areaPixels}
            className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold text-xs"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Menyimpan...
              </>
            ) : (
              'Simpan Foto'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
