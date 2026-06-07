<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'

defineEmits<{
  selectConversation: [id: string]
  newChat: []
}>()

const sidebarCollapsed = ref(false)
</script>

<template>
  <div style="display:flex;height:100vh;overflow:hidden;background:var(--background)">
    <Sidebar
      :collapsed="sidebarCollapsed"
      @select-conversation="$emit('selectConversation', $event)"
      @new-chat="$emit('newChat')"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
    />
    <div style="display:flex;flex:1;flex-direction:column;overflow:hidden;min-width:0">
      <slot name="header" />
      <div style="display:flex;flex:1;flex-direction:column;overflow:hidden;position:relative">
        <slot />
      </div>
    </div>
  </div>
</template>
