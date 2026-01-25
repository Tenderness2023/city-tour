<script setup lang="ts">
import { computed } from 'vue'
import { resolveImageUrl } from './imageRegistry'

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
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const coverUrl = computed(() => resolveImageUrl(props.spot?.coverImageRef))
</script>

<template>
  <div v-if="open && spot" class="mask" @click.self="emit('close')">
    <div class="panel">
      <div class="header">
        <div class="title">景点信息</div>
        <button class="icon-btn" type="button" @click="emit('close')">×</button>
      </div>

      <div class="body">
        <section class="top">
          <div class="left">
            <img v-if="coverUrl" class="cover" :src="coverUrl" alt="cover" />
            <div v-else class="cover-ph">暂无封面</div>
          </div>
          <div class="right">
            <div class="name">{{ spot.title || '未命名景点' }}</div>
            <div class="desc">{{ spot.description || '暂无文字介绍' }}</div>
          </div>
        </section>

        <section class="section">
          <div class="section-title">打卡点</div>
          <div v-if="spot.photos.length" class="grid">
            <div v-for="item in spot.photos" :key="item.id" class="card">
              <img v-if="resolveImageUrl(item.imageRef)" class="img" :src="resolveImageUrl(item.imageRef)" alt="photo" />
              <div v-else class="img-ph">无图片</div>
              <div class="cap">{{ item.caption }}</div>
            </div>
          </div>
          <div v-else class="empty">暂无图片</div>
        </section>

        <section class="section">
          <div class="section-title">附近美食</div>
          <div v-if="spot.foods.length" class="grid">
            <div v-for="item in spot.foods" :key="item.id" class="card">
              <img v-if="resolveImageUrl(item.imageRef)" class="img" :src="resolveImageUrl(item.imageRef)" alt="food" />
              <div v-else class="img-ph">无图片</div>
              <div class="cap">{{ item.caption }}</div>
            </div>
          </div>
          <div v-else class="empty">暂无附近美食</div>
        </section>

        <section class="coords">
          <div class="coord">纬度：{{ spot.lat.toFixed(6) }}</div>
          <div class="coord">经度：{{ spot.lng.toFixed(6) }}</div>
        </section>
      </div>

      <div class="footer">
        <button class="btn" type="button" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 2100;
}

.panel {
  width: min(1120px, 100%);
  max-height: 100%;
  overflow: hidden;
  background: rgba(18, 22, 32, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.title {
  font-size: 16px;
  font-weight: 700;
}

.icon-btn {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 20px;
  padding: 4px 10px;
  border-radius: 8px;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.body {
  padding: 16px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.16) rgba(18, 22, 32, 0.98);
}

.body::-webkit-scrollbar {
  width: 10px;
}

.body::-webkit-scrollbar-track {
  background: rgba(18, 22, 32, 0.98);
}

.body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  border: 2px solid rgba(18, 22, 32, 0.98);
}

.body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover {
  width: 100%;
  height: 340px;
  object-fit: contain;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.cover-ph {
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

.right {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.name {
  font-size: 18px;
  font-weight: 800;
}

.desc {
  white-space: pre-wrap;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.82);
}

.section-title {
  font-size: 14px;
  font-weight: 800;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.card {
  border-radius: 12px;
  background: transparent;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.img {
  width: 100%;
  object-fit: contain;
  display: block;
  background: rgba(255, 255, 255, 0.03);
}

.img-ph {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.02);
}

.cap {
  padding: 10px;
  color: rgba(255, 255, 255, 0.75);
  white-space: pre-wrap;
  line-height: 1.6;
  min-height: 44px;
}

.empty {
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.coords {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.btn {
  border-radius: 10px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}

.btn:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

@media (max-width: 980px) {
  .top {
    grid-template-columns: 1fr;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
