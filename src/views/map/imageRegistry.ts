const assetUrlMap = import.meta.glob('/src/assets/images/**/*', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export function normalizeImageRef(input: string): string | undefined {
  const raw = input.trim()
  if (!raw) return undefined

  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) return raw

  const normalized = raw.replace(/\\/g, '/')
  if (normalized.startsWith('/src/assets/images/')) return normalized
  if (normalized.startsWith('src/assets/images/')) return `/${normalized}`
  if (normalized.startsWith('@/assets/images/')) return `/src/assets/images/${normalized.slice('@/assets/images/'.length)}`
  if (normalized.startsWith('assets/images/')) return `/src/${normalized}`

  const idx = normalized.indexOf('src/assets/images/')
  if (idx >= 0) return `/${normalized.slice(idx)}`

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function resolveImageUrl(imageRef: string | undefined): string | undefined {
  if (!imageRef) return undefined
  if (imageRef.startsWith('data:') || imageRef.startsWith('http://') || imageRef.startsWith('https://')) return imageRef

  if (imageRef.startsWith('/src/assets/images/')) {
    return assetUrlMap[imageRef]
  }

  return imageRef
}

