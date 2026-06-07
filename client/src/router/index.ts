import { createRouter, createWebHistory } from 'vue-router'
import { AuthService } from '@/services/auth.service'

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

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !AuthService.isAuthenticated()) {
    return { name: 'landing' }
  }
})

export default router
