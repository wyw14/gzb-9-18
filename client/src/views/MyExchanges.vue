<template>
  <div>
    <div style="margin-bottom:24px;">
      <h1 style="color:white;margin-bottom:8px;">交换记录</h1>
      <p style="color:rgba(255,255,255,0.8);">查看你完成的所有交换</p>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px;color:white;">
      加载中...
    </div>

    <div v-else-if="exchanges.length === 0" class="empty-state card">
      <h2>暂无交换记录</h2>
      <p style="margin-bottom:20px;">去市场看看，寻找心仪的盲盒吧！</p>
      <router-link to="/">
        <button class="btn btn-primary">浏览盲盒市场</button>
      </router-link>
    </div>

    <div v-else class="grid" style="gap:20px;">
      <div v-for="exc in exchanges" :key="exc.id" class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <span class="badge badge-exchanged" style="font-size:12px;">交换成功</span>
          <span style="color:#999;font-size:13px;">{{ formatDate(exc.createdAt) }}</span>
        </div>

        <div style="display:flex;gap:24px;align-items:center;">
          <div style="flex:1;text-align:center;">
            <p style="color:#667eea;font-weight:600;margin-bottom:8px;">我的物品</p>
            <div v-if="exc.myItem" style="display:flex;gap:12px;align-items:center;justify-content:center;">
              <img :src="appendAuth(exc.myItem.image)"
                   style="width:80px;height:80px;object-fit:cover;border-radius:8px;"/>
              <div style="text-align:left;">
                <p style="font-weight:500;">{{ exc.myItem.realName }}</p>
                <p style="color:#999;font-size:12px;">
                  {{ exc.myItem.mysteryTags ? exc.myItem.mysteryTags.join(', ') : '' }}
                </p>
              </div>
            </div>
          </div>

          <div style="font-size:32px;color:#667eea;">
            &lt;&gt;
          </div>

          <div style="flex:1;text-align:center;">
            <p style="color:#f5576c;font-weight:600;margin-bottom:8px;">对方物品</p>
            <div v-if="exc.otherItem" style="display:flex;gap:12px;align-items:center;justify-content:center;">
              <img :src="appendAuth(exc.otherItem.image)"
                   style="width:80px;height:80px;object-fit:cover;border-radius:8px;"/>
              <div style="text-align:left;">
                <p style="font-weight:500;">{{ exc.otherItem.realName }}</p>
                <p style="color:#999;font-size:12px;">
                  {{ exc.otherItem.ownerName }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="exc.otherContact"
             style="margin-top:20px;padding:16px;background:#eef2ff;border-radius:8px;">
          <p style="font-weight:500;margin-bottom:8px;">对方联系方式</p>
          <p style="color:#667eea;font-size:18px;font-weight:600;">{{ exc.otherContact }}</p>
          <p style="color:#999;font-size:12px;margin-top:8px;">请主动联系对方完成物品交换</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getMyExchanges, appendAuth } from '../api/index.js'
import { userStore } from '../store/user.js'

const exchanges = ref([])
const loading = ref(true)

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return y + '-' + m + '-' + d + ' ' + h + ':' + min
}

async function loadExchanges() {
  loading.value = true
  try {
    exchanges.value = await getMyExchanges(userStore.user.id)
  } catch (e) {
    alert('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadExchanges)
</script>
