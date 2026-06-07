<script setup lang="ts">
import { ref, computed } from 'vue'

const isOpen = ref(false)
const currentStep = ref(0)

const tutorialSteps = [
  { title: '欢迎使用 Rui Chat', description: '一个简单、优雅、强大的 AI 对话助手。让我们用 30 秒了解如何使用它。', icon: 'welcome' },
  { title: '输入你的问题', description: '在下方输入框中输入任何问题，可以是工作、学习、生活中的任何内容。', icon: 'input' },
  { title: '实时查看 AI 思考', description: 'Rui Chat 会展示 AI 的推理过程，让你了解答案是如何产生的。', icon: 'thinking' },
  { title: '获得精准回答', description: 'AI 会给出详细、准确的回答，支持代码高亮、数学公式等多种格式。', icon: 'answer' },
  { title: '管理对话历史', description: '所有对话自动保存在左侧栏，随时查看、搜索、继续之前的对话。', icon: 'history' },
  { title: '分享精彩对话', description: '点击分享按钮生成链接，让朋友也能看到你和 AI 的精彩对话。', icon: 'share' },
]

const step = computed(() => tutorialSteps[currentStep.value])
const progress = computed(() => ((currentStep.value + 1) / tutorialSteps.length) * 100)

function handleNext() {
  if (currentStep.value < tutorialSteps.length - 1) {
    currentStep.value++
  } else {
    isOpen.value = false
    currentStep.value = 0
  }
}

function handlePrev() {
  if (currentStep.value > 0) currentStep.value--
}

function handleSkip() {
  isOpen.value = false
  currentStep.value = 0
}
</script>

<template>
  <!-- 浮动按钮 -->
  <div
    v-if="!isOpen"
    :style="{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 50,
    }"
  >
    <button
      :style="{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        borderRadius: '9999px',
        border: 'none',
        background: 'var(--button-primary-bg)',
        color: '#fff',
        fontSize: '0.95rem',
        fontWeight: '500',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }"
      @mouseenter="($event.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'"
      @mouseleave="($event.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'"
      @click="isOpen = true"
    >
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 2px;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      新手教程
    </button>
  </div>

  <!-- 教程弹窗 -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      :style="{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
      }"
      @click.self="handleSkip"
    >
      <div
        :style="{
          position: 'relative',
          width: '100%',
          maxWidth: '640px',
          margin: '0 16px',
          background: 'var(--background)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }"
      >
        <!-- 关闭按钮 -->
        <button
          :style="{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'background 0.2s',
            zIndex: 1,
          }"
          @mouseenter="($event.target as HTMLElement).style.background = 'var(--input-bg)'"
          @mouseleave="($event.target as HTMLElement).style.background = 'transparent'"
          @click="handleSkip"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- 进度条 -->
        <div :style="{ height: '4px', background: 'var(--input-bg)' }">
          <div
            :style="{
              height: '100%',
              background: 'var(--button-primary-bg)',
              transition: 'width 0.3s',
              width: progress + '%',
            }"
          ></div>
        </div>

        <!-- 内容 -->
        <div :style="{ padding: '32px' }">
          <!-- 步骤指示器 -->
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }">
            <div
              v-for="(_, index) in tutorialSteps"
              :key="index"
              :style="{
                height: '8px',
                borderRadius: '9999px',
                transition: 'all 0.3s',
                width: index === currentStep ? '32px' : '8px',
                background: index === currentStep
                  ? 'var(--button-primary-bg)'
                  : index < currentStep
                    ? 'var(--button-primary-bg)'
                    : 'var(--input-bg)',
                opacity: index < currentStep ? 0.6 : 1,
              }"
            ></div>
          </div>

          <!-- 插图区域 -->
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '192px',
              marginBottom: '32px',
            }"
          >
            <div
              :style="{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--input-bg)',
                borderRadius: '12px',
              }"
            >
              <!-- welcome -->
              <svg v-if="step.icon === 'welcome'" width="96" height="96" fill="none" stroke="var(--button-primary-bg)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              <!-- input -->
              <svg v-else-if="step.icon === 'input'" width="96" height="96" fill="none" stroke="var(--button-primary-bg)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <!-- thinking -->
              <svg v-else-if="step.icon === 'thinking'" width="96" height="96" fill="none" stroke="var(--button-primary-bg)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <!-- answer -->
              <svg v-else-if="step.icon === 'answer'" width="96" height="96" fill="none" stroke="var(--button-primary-bg)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <!-- history -->
              <svg v-else-if="step.icon === 'history'" width="96" height="96" fill="none" stroke="var(--button-primary-bg)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <!-- share -->
              <svg v-else width="96" height="96" fill="none" stroke="var(--button-primary-bg)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
          </div>

          <!-- 文字内容 -->
          <div :style="{ textAlign: 'center', marginBottom: '32px' }">
            <h3
              :style="{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }"
            >{{ step.title }}</h3>
            <p
              :style="{
                color: 'var(--text-secondary)',
                lineHeight: '1.75',
                maxWidth: '32rem',
                margin: '0 auto',
              }"
            >{{ step.description }}</p>
          </div>

          <!-- 操作按钮 -->
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }">
            <button
              :style="{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'color 0.2s',
              }"
              @mouseenter="($event.target as HTMLElement).style.color = 'var(--text-primary)'"
              @mouseleave="($event.target as HTMLElement).style.color = 'var(--text-secondary)'"
              @click="handleSkip"
            >
              跳过教程
            </button>

            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
              <button
                :style="{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: currentStep === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }"
                :disabled="currentStep === 0"
                @click="handlePrev"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                上一步
              </button>
              <button
                :style="{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--button-primary-bg)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'opacity 0.2s',
                }"
                @mouseenter="($event.target as HTMLElement).style.opacity = '0.9'"
                @mouseleave="($event.target as HTMLElement).style.opacity = '1'"
                @click="handleNext"
              >
                {{ currentStep === tutorialSteps.length - 1 ? '开始使用' : '下一步' }}
                <svg v-if="currentStep < tutorialSteps.length - 1" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
