import type Cropper from 'cropperjs'

export type AspectRatioPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2'

const ASPECT_RATIOS: Record<AspectRatioPreset, number> = {
  'free': NaN,
  '1:1': 1,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '3:2': 3 / 2
}

export interface UseImageCropOptions {
  aspectRatio?: number | AspectRatioPreset
  viewMode?: 'contain' | 'cover'
}

export function useImageCrop(
  imageRef: Ref<HTMLImageElement | null>,
  options: UseImageCropOptions = {}
) {
  let cropperInstance: Cropper | null = null

  const resolveAspectRatio = (value?: number | AspectRatioPreset): number => {
    if (value === undefined) return NaN
    if (typeof value === 'string') return ASPECT_RATIOS[value] ?? NaN
    return value
  }

  const initialAspectRatio = resolveAspectRatio(options.aspectRatio)

  const initCropper = async () => {
    const el = imageRef.value
    if (!el || cropperInstance) return

    const CropperClass = (await import('cropperjs')).default

    cropperInstance = new CropperClass(el)

    // Wait for image to load, then configure selection
    const cropperImage = cropperInstance.getCropperImage()
    const cropperSelection = cropperInstance.getCropperSelection()

    if (cropperImage) {
      cropperImage.rotatable = true
      cropperImage.scalable = true
    }

    if (cropperSelection) {
      cropperSelection.aspectRatio = initialAspectRatio
      cropperSelection.movable = true
      cropperSelection.resizable = true
      cropperSelection.outlined = true
      cropperSelection.initialCoverage = 0.8
    }
  }

  const destroyCropper = () => {
    if (cropperInstance) {
      // cropperjs v2 uses element removal for cleanup
      const container = cropperInstance.getCropperCanvas()?.parentElement
      if (container) {
        const cropperElement = container.querySelector('cropper-canvas')
        cropperElement?.remove()
      }
      cropperInstance = null
    }
  }

  const setAspectRatio = (ratio: number | AspectRatioPreset) => {
    const selection = cropperInstance?.getCropperSelection()
    if (selection) {
      selection.aspectRatio = resolveAspectRatio(ratio)
    }
  }

  const rotate = (degrees: number) => {
    const image = cropperInstance?.getCropperImage()
    image?.$rotate(`${degrees}deg`)
  }

  const zoom = (scale: number) => {
    const image = cropperInstance?.getCropperImage()
    image?.$zoom(scale)
  }

  const reset = () => {
    const image = cropperInstance?.getCropperImage()
    const selection = cropperInstance?.getCropperSelection()
    image?.$resetTransform()
    image?.$center('contain')
    selection?.$reset()
  }

  const getCroppedFile = async (
    filename = 'cropped.png',
    type = 'image/png',
    quality = 0.92
  ): Promise<File | null> => {
    const selection = cropperInstance?.getCropperSelection()
    if (!selection) return null

    const canvas = await selection.$toCanvas()
    if (!canvas) return null

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], filename, { type }))
          } else {
            resolve(null)
          }
        },
        type,
        quality
      )
    })
  }

  onMounted(() => {
    // Watch for the image element to be available
    watch(imageRef, (el) => {
      if (el) initCropper()
    }, { immediate: true })
  })

  onUnmounted(() => {
    destroyCropper()
  })

  return {
    setAspectRatio,
    rotate,
    zoom,
    reset,
    getCroppedFile,
    ASPECT_RATIOS
  }
}
