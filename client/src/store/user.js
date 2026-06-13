import { reactive } from 'vue'

const USER_KEY = 'blind_box_user'

function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 16)
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('读取用户信息失败', e)
  }
  const newUser = {
    id: generateUserId(),
    name: '用户' + Math.floor(Math.random() * 10000)
  }
  localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  return newUser
}

export const userStore = reactive({
  user: getStoredUser(),
  updateName(name) {
    this.user.name = name
    localStorage.setItem(USER_KEY, JSON.stringify(this.user))
  }
})
