<template>
  <div class="card" style="max-width:700px;margin:0 auto;">
    <h1 style="margin-bottom:8px;">发布盲盒相册</h1>
    <p style="color:#666;margin-bottom:24px;">填写以下信息，发布你的神秘盲盒相册</p>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>物品类别 *</label>
        <select v-model="form.category" required>
          <option value="">请选择类别</option>
          <option value="book">书籍类</option>
          <option value="figure">手办类</option>
          <option value="toy">玩具类</option>
          <option value="game">游戏类</option>
          <option value="digital">数码类</option>
          <option value="other">其他</option>
        </select>
      </div>

      <div class="form-group">
        <label>神秘标签 *（用逗号分隔）</label>
        <input v-model="tagsInput" placeholder="例如：全新,限量,珍藏版" required />
        <small style="color:#999;">其他用户只能看到这些标签来猜测物品内容</small>
      </div>

      <div class="form-group">
        <label>真实物品名称 *（仅交换成功后对方可见）</label>
        <input v-model="form.realName" placeholder="例如：《三体》全集精装版" required />
      </div>

      <div class="form-group">
        <label>物品详细描述（仅交换成功后对方可见）</label>
        <textarea v-model="form.description" rows="4" placeholder="描述物品的成色、特点等信息"></textarea>
      </div>

      <div class="form-group">
        <label>物品图片 *（可上传多张，最多20张）</label>
        <input type="file" accept="image/*" multiple @change="handleFileChange" />
        <small style="color:#999;">第一张为封面图，所有图片会模糊处理展示给其他用户，交换成功后才会显示原图</small>
        <div v-if="previewUrls.length > 0" class="preview-grid">
          <div v-for="(url, index) in previewUrls" :key="index" class="preview-item">
            <img :src="url" class="preview-img"/>
            <button type="button" class="remove-btn" @click="removeImage(index)">×</button>
            <div v-if="index === 0" class="cover-badge">封面</div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>联系方式 *（交换成功后对方可见）</label>
        <input v-model="form.contact" placeholder="例如：微信 xxx 或 QQ xxx" required />
      </div>

      <div style="display:flex;gap:12px;">
        <button type="submit" class="btn btn-primary" style="flex:1;" :disabled="submitting">
          {{ submitting ? '发布中...' : '发布盲盒相册' }}
        </button>
        <router-link to="/" style="flex:1;">
          <button type="button" class="btn btn-secondary" style="width:100%;">返回首页</button>
        </router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createItem } from '../api/index.js'
import { userStore } from '../store/user.js'

const router = useRouter()

const form = ref({
  category: '',
  realName: '',
  description: '',
  contact: ''
})

const tagsInput = ref('')
const imageFiles = ref([])
const previewUrls = ref([])
const submitting = ref(false)

const mysteryTags = computed(function() {
  return tagsInput.value
    .split(/[,，]/)
    .map(function(t) { return t.trim() })
    .filter(function(t) { return t.length > 0 })
})

function handleFileChange(e) {
  const files = Array.from(e.target.files)
  if (files.length === 0) return

  const totalCount = imageFiles.value.length + files.length
  if (totalCount > 20) {
    alert('最多只能上传20张图片')
    return
  }

  files.forEach(file => {
    if (!file.type.startsWith('image/')) return
    imageFiles.value.push(file)
    previewUrls.value.push(URL.createObjectURL(file))
  })

  e.target.value = ''
}

function removeImage(index) {
  imageFiles.value.splice(index, 1)
  previewUrls.value.splice(index, 1)
}

async function handleSubmit() {
  if (mysteryTags.value.length === 0) {
    alert('请至少填写一个神秘标签')
    return
  }
  if (imageFiles.value.length === 0) {
    alert('请至少上传一张物品图片')
    return
  }

  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('category', form.value.category)
    formData.append('mysteryTags', JSON.stringify(mysteryTags.value))
    formData.append('realName', form.value.realName)
    formData.append('description', form.value.description)
    formData.append('contact', form.value.contact)
    formData.append('ownerId', userStore.user.id)
    formData.append('ownerName', userStore.user.name)

    imageFiles.value.forEach(file => {
      formData.append('images', file)
    })

    await createItem(formData)
    alert('发布成功！')
    router.push('/my-items')
  } catch (e) {
    alert('发布失败：' + (e.response && e.response.data ? e.response.data.error : e.message))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.preview-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.remove-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.cover-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  font-size: 11px;
  padding: 12px 4px 4px;
  text-align: center;
}
</style>
