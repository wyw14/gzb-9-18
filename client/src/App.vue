<template>
  <div>
    <header class="header">
      <nav class="nav">
        <router-link to="/" class="nav-brand">🎁 盲盒交换平台</router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link" exact-active-class="active">首页</router-link>
          <router-link to="/publish" class="nav-link" active-class="active">发布物品</router-link>
          <router-link to="/my-items" class="nav-link" active-class="active">我的物品</router-link>
          <router-link to="/my-exchanges" class="nav-link" active-class="active">交换记录</router-link>
          <span style="margin-left:16px;color:#667eea;font-weight:500;">👤 {{ userStore.user.name }}</span>
        </div>
      </nav>
    </header>
    <main class="container" style="padding-top:32px;">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { userStore } from './store/user.js'
</script>
