import { createRouter, createWebHistory } from 'vue-router'
import { AuthService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/Landing.vue'),
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/Chat.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat/:id',
      name: 'chat-conversation',
      component: () => import('@/views/Chat.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/admin/Admin.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/share/:token',
      name: 'share',
      component: () => import('@/views/Share.vue'),
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallback.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth && !AuthService.isAuthenticated()) {
    return { name: 'landing' }
  }

  if (to.meta.requiresAdmin) {
    if (!AuthService.isAuthenticated()) {
      return { path: '/' }
    }
    const authStore = useAuthStore()
    if (!authStore.user) {
      try {
        await authStore.fetchUser()
      } catch {
        return { path: '/' }
      }
      if (!authStore.user) return { path: '/' }
    }
    if (authStore.user?.role !== 'admin') {
      return { path: '/chat' }
    }
  }
})

// 监听 401 事件，使用 router 跳转而非硬刷新
window.addEventListener('auth:unauthorized', () => {
  router.push({ name: 'landing' })
})

export default router
