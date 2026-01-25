<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { normalizeImageRef, resolveImageUrl } from './imageRegistry'

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

const props = defineProps<{
  open: boolean
  spot: Spot | null
  editEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', spot: Spot): void
  (e: 'delete', spotId: string): void
}>()

const draftTitle = ref('')
const draftDescription = ref('')
const draftCheckIn = ref('')
const draftCoverImageRef = ref<string>('')
const draftPhotos = ref<SpotImageItem[]>([])
const draftFoods = ref<SpotImageItem[]>([])

const canDelete = computed(() => Boolean(props.spot?.id))
const coverPreviewUrl = computed(() => resolveImageUrl(normalizeImageRef(draftCoverImageRef.value)))

watch(
  () => [props.open, props.spot?.id] as const,
  () => {
    if (!props.open || !props.spot) return
    draftTitle.value = props.spot.title
    draftDescription.value = props.spot.description
    draftCheckIn.value = props.spot.checkIn
    draftCoverImageRef.value = props.spot.coverImageRef ?? ''
    const photoIds = new Set<string>()
    draftPhotos.value = props.spot.photos.map((p) => {
      const base = p as Partial<SpotImageItem>
      let id = typeof base.id === 'string' && base.id ? base.id : createId()
      while (photoIds.has(id)) id = createId()
      photoIds.add(id)
      return { id, imageRef: base.imageRef ?? '', caption: base.caption ?? '' }
    })

    const foodIds = new Set<string>()
    draftFoods.value = props.spot.foods.map((f) => {
      const base = f as Partial<SpotImageItem>
      let id = typeof base.id === 'string' && base.id ? base.id : createId()
      while (foodIds.has(id)) id = createId()
      foodIds.add(id)
      return { id, imageRef: base.imageRef ?? '', caption: base.caption ?? '' }
    })
  },
  { immediate: true },
)

function close() {
  emit('close')
}

function createId() {
  return 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function addPhoto() {
  if (!props.editEnabled) return
  draftPhotos.value = [{ id: createId(), imageRef: '', caption: '' }, ...draftPhotos.value]
}

function addFood() {
  if (!props.editEnabled) return
  draftFoods.value = [{ id: createId(), imageRef: '', caption: '' }, ...draftFoods.value]
}

function removePhoto(id: string) {
  if (!props.editEnabled) return
  draftPhotos.value = draftPhotos.value.filter((x) => x.id !== id)
}

function removeFood(id: string) {
  if (!props.editEnabled) return
  draftFoods.value = draftFoods.value.filter((x) => x.id !== id)
}

function save() {
  if (!props.editEnabled) return
  if (!props.spot) return

  const normalizedCover = normalizeImageRef(draftCoverImageRef.value)

  const next: Spot = {
    ...props.spot,
    title: draftTitle.value.trim() || '未命名景点',
    description: draftDescription.value,
    checkIn: draftCheckIn.value,
    coverImageRef: normalizedCover,
    photos: draftPhotos.value.map((p) => ({
      ...p,
      imageRef: normalizeImageRef(p.imageRef ?? ''),
      caption: p.caption ?? '',
    })),
    foods: draftFoods.value.map((f) => ({
      ...f,
      imageRef: normalizeImageRef(f.imageRef ?? ''),
      caption: f.caption ?? '',
    })),
  }
  emit('save', next)
}

function del() {
  if (!props.editEnabled) return
  if (!props.spot) return
  emit('delete', props.spot.id)
}
</script>

<template>
  <div v-if="open && spot" class="modal-mask" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">{{ editEnabled ? '编辑景点' : '景点信息' }}</div>
        <button class="icon-button" type="button" @click="close">×</button>
      </div>

      <div class="modal-body">
        <section class="top">
          <div class="top-left">
            <img
              v-if="editEnabled ? coverPreviewUrl : resolveImageUrl(spot.coverImageRef)"
              class="cover-image"
              :src="editEnabled ? coverPreviewUrl : resolveImageUrl(spot.coverImageRef)"
              alt="cover"
            />
            <div v-else class="cover-placeholder">暂无封面</div>

            <div v-if="editEnabled" class="cover-actions">
              <input v-model="draftCoverImageRef" class="input" placeholder="src\\assets\\images\\01\\01.jpg" />
              <button
                v-if="draftCoverImageRef"
                class="secondary-button"
                type="button"
                @click="draftCoverImageRef = ''"
              >
                清空封面
              </button>
            </div>
          </div>

          <div class="top-right">
            <div v-if="editEnabled" class="form">
              <label class="field">
                <div class="label">景点名称</div>
                <input v-model="draftTitle" class="input" />
              </label>
              <label class="field">
                <div class="label">文字介绍</div>
                <textarea v-model="draftDescription" class="textarea" rows="10" />
              </label>
            </div>
            <div v-else class="info">
              <div class="info-title">{{ spot.title || '未命名景点' }}</div>
              <div class="info-desc">{{ spot.description || '暂无文字介绍' }}</div>
            </div>
          </div>
        </section>

        <section class="gallery">
          <div class="section-head">
            <div class="section-title">打卡点</div>
            <button v-if="editEnabled" class="secondary-button" type="button" @click="addPhoto">添加图片</button>
          </div>

          <div class="gallery-grid">
            <div v-for="item in (editEnabled ? draftPhotos : spot.photos)" :key="item.id" class="gallery-card">
              <img
                v-if="resolveImageUrl(normalizeImageRef(item.imageRef ?? ''))"
                class="gallery-img"
                :src="resolveImageUrl(normalizeImageRef(item.imageRef ?? ''))"
                alt="photo"
              />
              <div v-else class="gallery-placeholder">暂无图片</div>

              <div v-if="editEnabled" class="gallery-meta">
                <input v-model="item.imageRef" class="input" placeholder="图片路径，例如 src\\assets\\images\\01\\01.jpg" />
                <button class="danger-button" type="button" @click="removePhoto(item.id)">删除</button>
              </div>
            </div>
          </div>
        </section>

        <section class="gallery">
          <div class="section-head">
            <div class="section-title">附近美食</div>
            <button v-if="editEnabled" class="secondary-button" type="button" @click="addFood">添加美食</button>
          </div>

          <div class="gallery-grid">
            <div v-for="item in (editEnabled ? draftFoods : spot.foods)" :key="item.id" class="gallery-card">
              <img
                v-if="resolveImageUrl(normalizeImageRef(item.imageRef ?? ''))"
                class="gallery-img"
                :src="resolveImageUrl(normalizeImageRef(item.imageRef ?? ''))"
                alt="food"
              />
              <div v-else class="gallery-placeholder">暂无图片</div>

              <div v-if="editEnabled" class="gallery-meta">
                <input v-model="item.imageRef" class="input" placeholder="图片路径，例如 src\\assets\\images\\01\\01.jpg" />
                <button class="danger-button" type="button" @click="removeFood(item.id)">删除</button>
              </div>
            </div>
          </div>
        </section>

        <section class="coords">
          <div class="coord">纬度：{{ spot.lat.toFixed(6) }}</div>
          <div class="coord">经度：{{ spot.lng.toFixed(6) }}</div>
        </section>
      </div>

      <div class="modal-footer">
        <button class="secondary-button" type="button" @click="close">关闭</button>
        <template v-if="editEnabled">
          <button v-if="canDelete" class="danger-button" type="button" @click="del">删除</button>
          <button class="primary-button" type="button" @click="save">保存</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal,
.modal * {
  box-sizing: border-box;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 2000;
}

.modal {
  width: min(1120px, 100%);
  max-height: 100%;
  overflow: hidden;
  background: rgba(18, 22, 32, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
}

.icon-button {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 20px;
  padding: 4px 10px;
  border-radius: 8px;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.08);
}

.modal-body {
  padding: 16px;
  overflow: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.top-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-image {
  width: 100%;
  height: 340px;
  object-fit: contain;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.cover-placeholder {
  width: 100%;
  height: 340px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.03);
}

.cover-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.cover-actions .input {
  flex: 1;
  min-width: 0;
}

.top-right {
  min-width: 0;
}

.form,
.info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-title {
  font-size: 18px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-desc {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.8);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
}

.checkin {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 12px;
  align-items: start;
}

.checkin-view {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.85);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.gallery-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.gallery-card:hover {
  border-color: rgba(255, 255, 255, 0.22);
}

.gallery-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.gallery-placeholder {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.02);
}

.gallery-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.gallery-meta .input {
  flex: 1;
  min-width: 0;
}

.gallery-caption {
  padding: 10px;
  color: rgba(255, 255, 255, 0.75);
  white-space: pre-wrap;
  line-height: 1.6;
  min-height: 44px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.input,
.textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;
  font: inherit;
  min-width: 0;
}

.textarea {
  resize: vertical;
}

.file-input {
  width: 100%;
}

.coords {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.primary-button,
.secondary-button,
.danger-button {
  border-radius: 10px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}

.primary-button {
  background: rgba(100, 108, 255, 0.9);
  border-color: rgba(100, 108, 255, 0.95);
}

.danger-button {
  background: rgba(255, 72, 72, 0.75);
  border-color: rgba(255, 72, 72, 0.9);
}

.primary-button:hover,
.secondary-button:hover,
.danger-button:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

@media (max-width: 980px) {
  .top {
    grid-template-columns: 1fr;
  }

  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
