<template>
  <div v-if="loading" style="text-align:center;padding:60px;color:white;">
    加载中...
  </div>

  <div v-else-if="!item" class="empty-state card">
    <h2>物品不存在</h2>
    <router-link to="/">
      <button class="btn btn-primary">返回首页</button>
    </router-link>
  </div>

  <div v-else class="card" style="max-width:960px;margin:0 auto;">
    <div class="grid grid-2">
      <div>
        <div class="main-image-wrapper">
          <img
            :src="appendAuth(currentImageUrl)"
            alt="物品图片"
            class="main-image"/>
          <div v-if="displayImages.length > 1" class="image-nav">
            <button class="nav-btn prev-btn" @click="prevImage" :disabled="currentImageIndex === 0">
              ‹
            </button>
            <button class="nav-btn next-btn" @click="nextImage" :disabled="currentImageIndex === displayImages.length - 1">
              ›
            </button>
          </div>
          <div v-if="displayImages.length > 1" class="image-counter">
            {{ currentImageIndex + 1 }} / {{ displayImages.length }}
          </div>
        </div>
        <div v-if="displayImages.length > 1" class="thumbnails">
          <div
            v-for="(img, index) in displayImages"
            :key="index"
            :class="['thumbnail-item', { active: index === currentImageIndex }]"
            @click="currentImageIndex = index">
            <img :src="appendAuth(img)" class="thumbnail-img"/>
          </div>
        </div>
        <div v-if="!item.revealInfo" style="margin-top:12px;text-align:center;color:#666;font-size:13px;">
          图片模糊处理中，交换成功后显示原图相册
        </div>
        <div v-else style="margin-top:12px;text-align:center;color:#52c41a;font-size:13px;font-weight:500;">
          ✓ 已解锁原图相册
        </div>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div>
            <span :class="item.status === 'available' ? 'badge badge-available' : 'badge badge-exchanged'"
                  style="margin-bottom:8px;display:inline-block;">
              {{ item.status === 'available' ? '可交换' : '已交换' }}
            </span>
            <h2 style="font-size:24px;">
              {{ item.revealInfo ? item.realName : getCategoryName(item.category) }}
            </h2>
          </div>
          <router-link to="/">
            <button class="btn btn-secondary">返回列表</button>
          </router-link>
        </div>

        <div style="margin-bottom:20px;">
          <h4 style="margin-bottom:8px;color:#666;">神秘标签</h4>
          <div>
            <span v-for="tag in item.mysteryTags" :key="tag" class="tag" style="font-size:14px;padding:6px 14px;">
              {{ tag }}
            </span>
          </div>
        </div>

        <div v-if="item.revealInfo && item.description" style="margin-bottom:20px;">
          <h4 style="margin-bottom:8px;color:#666;">详细描述</h4>
          <p style="color:#444;line-height:1.6;">{{ item.description }}</p>
        </div>

        <div v-if="item.revealInfo && item.ownerName" style="margin-bottom:20px;">
          <h4 style="margin-bottom:8px;color:#666;">发布者</h4>
          <p style="color:#444;">{{ item.ownerName }}</p>
        </div>

        <div v-if="item.revealInfo && item.contact" style="margin-bottom:20px;">
          <h4 style="margin-bottom:8px;color:#666;">联系方式</h4>
          <p style="color:#444;font-size:16px;font-weight:500;">{{ item.contact }}</p>
        </div>

        <div v-if="item.exchange && item.exchange.otherItem" class="card"
             style="background:#f5f7fa;margin-bottom:20px;">
          <h4 style="margin-bottom:12px;">交换信息</h4>
          <div style="display:flex;gap:16px;align-items:center;">
            <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
              <img :src="appendAuth(getOtherItemFirstImage(item.exchange.otherItem))"
                   style="width:80px;height:80px;object-fit:cover;border-radius:8px;"/>
              <div v-if="getOtherItemImageCount(item.exchange.otherItem) > 1"
                   style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,0.6);color:white;padding:1px 6px;border-radius:10px;font-size:10px;">
                {{ getOtherItemImageCount(item.exchange.otherItem) }}张
              </div>
            </div>
            <div style="flex:1;min-width:0;">
              <p style="font-weight:500;margin-bottom:4px;">{{ item.exchange.otherItem.realName }}</p>
              <p style="color:#666;font-size:13px;margin-bottom:4px;">
                发布者：{{ item.exchange.otherItem.ownerName }}
              </p>
              <p v-if="item.exchange.contact" style="color:#667eea;font-weight:500;">
                对方联系方式：{{ item.exchange.contact }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="item.status === 'available' && !isOwner">
          <div style="background:#eef2ff;padding:16px;border-radius:12px;margin-bottom:16px;">
            <h4 style="margin-bottom:12px;">选择你的物品进行交换</h4>
            <div v-if="myItemsLoading" style="color:#666;">加载中...</div>
            <div v-else-if="availableItems.length === 0" style="color:#666;">
              你没有可交换的物品，
              <router-link to="/publish" style="color:#667eea;text-decoration:underline;">去发布一个</router-link>
            </div>
            <select v-else v-model="selectedMyItemId" style="margin-bottom:12px;">
              <option value="">请选择一个物品</option>
              <option v-for="it in availableItems" :key="it.id" :value="it.id">
                {{ it.realName }} ({{ it.mysteryTags.join(', ') }})
              </option>
            </select>
          </div>
          <button
            class="btn btn-primary"
            style="width:100%;padding:16px;font-size:16px;"
            :disabled="!selectedMyItemId || exchanging"
            @click="handleExchange"
          >
            {{ exchanging ? '交换申请中...' : '确认交换' }}
          </button>
          <p style="color:#999;font-size:12px;text-align:center;margin-top:8px;">
            确认交换后，双方的真实信息和原图相册将互相公开
          </p>
        </div>

        <div v-if="isOwner && item.status === 'available'" style="padding:16px;background:#fff8e1;border-radius:12px;text-align:center;">
          <p style="color:#b8860b;">这是你发布的物品，等待其他用户来交换吧！</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getItemDetail, getMyItems, createExchange, appendAuth } from '../api/index.js'
import { userStore } from '../store/user.js'

const route = useRoute()

const item = ref(null)
const loading = ref(true)
const myItems = ref([])
const myItemsLoading = ref(true)
const selectedMyItemId = ref('')
const exchanging = ref(false)
const currentImageIndex = ref(0)

const categories = {
  book: '书籍类',
  figure: '手办类',
  toy: '玩具类',
  game: '游戏类',
  digital: '数码类',
  other: '其他'
}

const isOwner = computed(function() {
  return item.value && item.value.ownerId === userStore.user.id
})

const availableItems = computed(function() {
  return myItems.value.filter(function(i) { return i.status === 'available' })
})

const displayImages = computed(function() {
  if (!item.value) return []
  if (item.value.revealInfo) {
    if (item.value.images && Array.isArray(item.value.images) && item.value.images.length > 0) {
      return item.value.images
    }
    if (item.value.image) {
      return [item.value.image]
    }
    return []
  } else {
    if (item.value.images && Array.isArray(item.value.images) && item.value.images.length > 0) {
      return item.value.images
    }
    if (item.value.image) {
      return [item.value.image]
    }
    return []
  }
})

const currentImageUrl = computed(function() {
  if (displayImages.value.length === 0) return ''
  return displayImages.value[currentImageIndex.value] || displayImages.value[0]
})

watch(item, function() {
  currentImageIndex.value = 0
})

function getCategoryName(key) {
  return categories[key] || key
}

function getOtherItemFirstImage(otherItem) {
  if (!otherItem) return ''
  if (otherItem.images && otherItem.images.length > 0) {
    return otherItem.images[0]
  }
  return otherItem.image || ''
}

function getOtherItemImageCount(otherItem) {
  if (!otherItem) return 0
  if (otherItem.images && Array.isArray(otherItem.images)) {
    return otherItem.images.length
  }
  return 1
}

function prevImage() {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

function nextImage() {
  if (currentImageIndex.value < displayImages.value.length - 1) {
    currentImageIndex.value++
  }
}

async function loadItem() {
  loading.value = true
  try {
    item.value = await getItemDetail(route.params.id, userStore.user.id)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadMyItems() {
  myItemsLoading.value = true
  try {
    myItems.value = await getMyItems(userStore.user.id)
  } catch (e) {
    console.error(e)
  } finally {
    myItemsLoading.value = false
  }
}

async function handleExchange() {
  if (!confirm('确定要交换吗？交换后双方的真实信息和原图相册将互相公开。')) {
    return
  }
  exchanging.value = true
  try {
    await createExchange(selectedMyItemId.value, route.params.id)
    alert('交换成功！双方的真实信息和原图相册已互相公开，请通过联系方式联系对方完成交换。')
    loadItem()
  } catch (e) {
    alert('交换失败：' + (e.response && e.response.data ? e.response.data.error : e.message))
  } finally {
    exchanging.value = false
  }
}

onMounted(function() {
  loadItem()
  loadMyItems()
})
</script>

<style scoped>
.main-image-wrapper {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f0;
  position: relative;
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  margin: 0 8px;
  transition: background 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.7);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.image-counter {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.thumbnails {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.thumbnail-item {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: #f0f0f0;
  transition: border-color 0.2s;
}

.thumbnail-item:hover {
  border-color: #667eea;
}

.thumbnail-item.active {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
