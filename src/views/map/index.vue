<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { mapConfig } from './config'
import { normalizeImageRef, resolveImageUrl } from './imageRegistry'
import SpotModal from './SpotModal.vue'
import SpotViewer from './SpotViewer.vue'

type SpotImageItem = {
  id: string
  imageRef?: string
  caption: string
}

type Spot = {
  id: string
  lat: number
  lng: number
  title: string
  description: string
  checkIn: string
  coverImageRef?: string
  photos: SpotImageItem[]
  foods: SpotImageItem[]
}

const STORAGE_KEY = 'city-tour:spots:v1'
const editEnabled = mapConfig.editEnabled

const spots = ref<Spot[]>([])

const mapEl = ref<HTMLDivElement | null>(null)
const map = ref<L.Map | null>(null)
const markerLayer = ref<L.LayerGroup | null>(null)

const viewerOpen = ref(false)
const activeSpotId = ref<string | null>(null)
const editorOpen = ref(false)
const editingSpot = ref<Spot | null>(null)

const activeSpot = computed(() => {
  if (!activeSpotId.value) return null
  return spots.value.find((s) => s.id === activeSpotId.value) ?? null
})

function loadSpotsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    const genId = () =>
      'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

    const normalizeImageItem = (input: unknown): SpotImageItem => {
      const x = (input ?? {}) as Record<string, unknown>
      const legacyImageDataUrl = typeof x.imageDataUrl === 'string' ? x.imageDataUrl : undefined
      const imageRef =
        typeof x.imageRef === 'string'
          ? x.imageRef
          : typeof x.imagePath === 'string'
            ? x.imagePath
            : legacyImageDataUrl
      return {
        id: typeof x.id === 'string' ? x.id : genId(),
        imageRef,
        caption: typeof x.caption === 'string' ? x.caption : '',
      }
    }

    type SpotRecord = Record<string, unknown> & {
      id: string
      lat: number
      lng: number
      title: string
      description: string
    }

    const isSpotRecord = (x: Record<string, unknown>): x is SpotRecord => {
      return (
        typeof x.id === 'string' &&
        typeof x.lat === 'number' &&
        typeof x.lng === 'number' &&
        typeof x.title === 'string' &&
        typeof x.description === 'string'
      )
    }

    const normalized: Spot[] = parsed
      .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
      .filter(isSpotRecord)
      .map((x) => {
        const legacyImageDataUrl = typeof x.imageDataUrl === 'string' ? x.imageDataUrl : undefined
        const coverImageRef =
          typeof x.coverImageRef === 'string'
            ? x.coverImageRef
            : typeof x.coverImagePath === 'string'
              ? x.coverImagePath
              : typeof x.coverImageDataUrl === 'string'
                ? x.coverImageDataUrl
                : legacyImageDataUrl

        const photos = Array.isArray(x.photos) ? x.photos.map(normalizeImageItem) : []
        const foods = Array.isArray(x.foods) ? x.foods.map(normalizeImageItem) : []

        return {
          id: x.id,
          lat: x.lat,
          lng: x.lng,
          title: x.title,
          description: x.description,
          checkIn: typeof x.checkIn === 'string' ? x.checkIn : '',
          coverImageRef,
          photos,
          foods,
        }
      })

    spots.value = normalized
  } catch (e) {
    void e
  }
}

function persistSpotsToStorage(nextSpots: Spot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSpots))
}

function openSpotViewer(spot: Spot) {
  activeSpotId.value = spot.id
  viewerOpen.value = true
}

function closeViewer() {
  viewerOpen.value = false
  activeSpotId.value = null
}

function closeEditor() {
  editorOpen.value = false
  editingSpot.value = null
}

function openEditorForNewSpot(lat: number, lng: number) {
  const id =
    'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  const newSpot: Spot = {
    id,
    lat,
    lng,
    title: '未命名景点',
    description: '',
    checkIn: '',
    coverImageRef: undefined,
    photos: [],
    foods: [],
  }
  editingSpot.value = newSpot
  editorOpen.value = true
}

function saveSpot(next: Spot) {
  const exists = spots.value.some((s) => s.id === next.id)
  spots.value = exists ? spots.value.map((s) => (s.id === next.id ? next : s)) : [next, ...spots.value]
  closeEditor()
}

function deleteSpotById(id: string) {
  spots.value = spots.value.filter((s) => s.id !== id)
  if (activeSpotId.value === id) {
    closeViewer()
  }
  closeEditor()
}

function setupLeafletDefaultMarkerIcons() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })
}

function escapeHtmlAttr(input: string) {
  return input.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildSpotMarkerIcon(spot: Spot): L.DivIcon | undefined {
  const coverUrl = resolveImageUrl(normalizeImageRef(spot.coverImageRef ?? ''))
  if (!coverUrl) return undefined
  const safeUrl = escapeHtmlAttr(coverUrl)
  return L.divIcon({
    className: 'spot-thumb-icon',
    html: `<div class="spot-thumb"><img class="spot-thumb-img" src="${safeUrl}" alt="" /></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
  })
}

function renderMarkers() {
  const m = map.value
  const layer = markerLayer.value
  if (!m || !layer) return

  layer.clearLayers()
  for (const spot of spots.value) {
    const icon = buildSpotMarkerIcon(spot)
    const marker = L.marker([spot.lat, spot.lng], icon ? { icon } : undefined)
    marker.on('click', () => openSpotViewer(spot))
    marker.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (!editEnabled) return
      const originalEvent = e.originalEvent as MouseEvent | undefined
      originalEvent?.preventDefault?.()
      originalEvent?.stopPropagation?.()
      const ok = window.confirm(`确认删除「${spot.title || '未命名景点'}」吗？`)
      if (!ok) return
      deleteSpotById(spot.id)
    })
    layer.addLayer(marker)
  }
}

function initMap() {
  if (!mapEl.value) return
  setupLeafletDefaultMarkerIcons()

  const initialCenter: L.LatLngExpression = [24.8739, 118.6757]
  const m = L.map(mapEl.value, {
    zoomControl: true,
  }).setView(initialCenter, 12)

  const tiandituTk = 'b36d5b3dcfb35287a54562b98d5c0558'

  const normalBase = L.tileLayer(
    `https://t0.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${tiandituTk}`,
    {
      maxZoom: 19,
      attribution: '© 天地图',
    },
  )
  const normalLabel = L.tileLayer(
    `https://t0.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${tiandituTk}`,
    { maxZoom: 19 },
  )
  const normalLayer = L.layerGroup([normalBase, normalLabel])

  const satelliteBase = L.tileLayer(
    `https://t0.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${tiandituTk}`,
    { maxZoom: 19, attribution: '© 天地图' },
  )
  const satelliteLabel = L.tileLayer(
    `https://t0.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${tiandituTk}`,
    { maxZoom: 19 },
  )
  const satelliteLayer = L.layerGroup([satelliteBase, satelliteLabel])

  normalLayer.addTo(m)
  L.control.layers(
    {
      普通地图: normalLayer,
      卫星地图: satelliteLayer,
    },
    undefined,
    { position: 'topright' },
  ).addTo(m)

  const layer = L.layerGroup().addTo(m)
  map.value = m
  markerLayer.value = layer

  m.on('click', (e: L.LeafletMouseEvent) => {
    const nearest = spots.value
      .map((s) => ({
        s,
        d: m.distance(e.latlng, L.latLng(s.lat, s.lng)),
      }))
      .sort((a, b) => a.d - b.d)[0]

    if (nearest && nearest.d <= 150) {
      openSpotViewer(nearest.s)
      return
    }

    if (editEnabled) {
      openEditorForNewSpot(e.latlng.lat, e.latlng.lng)
    }
  })

  renderMarkers()
}

loadSpotsFromStorage()

watch(
  spots,
  (nextSpots) => {
    persistSpotsToStorage(nextSpots)
    renderMarkers()
  },
  { deep: true },
)

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  map.value?.off()
  map.value?.remove()
  map.value = null
  markerLayer.value = null
})
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="title">泉州城市导览</div>
    </header>

    <main class="content">
      <div ref="mapEl" class="map" />
    </main>

    <SpotModal
      :open="editorOpen"
      :spot="editingSpot"
      :edit-enabled="editEnabled"
      @close="closeEditor"
      @save="saveSpot"
      @delete="deleteSpotById"
    />

    <SpotViewer :open="viewerOpen" :spot="activeSpot" @close="closeViewer" />
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #0b0d12;
  color: rgba(255, 255, 255, 0.9);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(15, 20, 30, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.content {
  flex: 1;
  min-height: 0;
}

.map {
  height: 100%;
  width: 100%;
}

.map :deep(.spot-thumb-icon) {
  background: transparent;
  border: 0;
}

.map :deep(.spot-thumb) {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(18, 22, 32, 0.92);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.45);
}

.map :deep(.spot-thumb-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
