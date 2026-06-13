<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <div>
        <h1 style="color:white;margin-bottom:8px;">我的物品</h1>
        <p style="color:rgba(255,255,255,0.8);">管理你发布的盲盒</p>
      </div>
      <router-link to="/publish">
        <button class="btn btn-primary">发布新盲盒</button>
      </router-link>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px;color:white;">
      加载中...
    </div>

    <div v-else-if="items.length === 0" class="empty-state card">
      <h2>你还没有发布盲盒</h2>
      <p style="margin-bottom:20px;">发布一个盲盒，开启交换之旅吧！</p>
      <router-link to="/publish">
        <button class="btn btn-primary">立即发布</button>
      </router-link>
    </div>

    <div v-else class="grid grid-3">
      <div v-for="item in items" :key="item.id" class="card" style="padding:0;overflow:hidden;">
        <div style="width:100%;height:200px;overflow:hidden;background:#f0f0f0;position:relative;">
          <img :src="appendAuth(item.image)" alt="物品图片"
               style="width:100%;height:100%;object-fit:cover;"/>
          <div style="position:absolute;top:12px;right:12px;">
            <span :class="item.status === 'available' ? 'badge badge-available' : 'badge badge-exchanged'">
              {{ item.status === 'available' ? '可交换' : '已交换' }}
            </span>
          </div>
        </div>
        <div style="padding:16px;">
          <h3 style="margin-bottom:8px;font-size:16px;">{{ item.realName }}</h3>
          <div style="margin-bottom:8px;">
            <span v-for="tag in item.mysteryTags" :key="tag" class="tag">
              {{ tag }}
            </span>
          </div>
          <p style="color:#666;font-size:13px;margin-bottom:12px;">
            联系方式: {{ item.contact }}
          </p>
          <div style="display:flex;gap:8px;">
            <router-link :to="'/item/' + item.id" style="flex:1;">
              <button class="btn btn-secondary" style="width:100%;">查看详情</button>
            </router-link>
            <button
              v-if="item.status === 'available'"
              class="btn btn-danger"
              @click="handleDelete(item)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyItems, deleteItem, appendAuth } from '../api/index.js'
import { userStore } from '../store/user.js'

const items = ref([])
const loading = ref(true)

async function loadItems() {
  loading.value = true
  try {
    items.value = await getMyItems(userStore.user.id)
  } catch (e) {
    alert('加载失败')
  } finally {
    loading.value = false
  }
}

async function handleDelete(item) {
  if (!confirm('确定要删除这个盲盒吗？')) {
    return
  }
  try {
    await deleteItem(item.id, userStore.user.id)
    alert('删除成功')
    loadItems()
  } catch (e) {
    alert('删除失败：' + (e.response && e.response.data ? e.response.data.error : e.message))
  }
}

onMounted(loadItems)
</script>
