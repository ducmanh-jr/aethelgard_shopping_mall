<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
  }>(),
  {
    size: 'md',
    showCloseButton: true,
  }
);

const emit = defineEmits<{
  close: [];
}>();

const SIZE_CLASS: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) emit('close');
}

watch(
  () => props.isOpen,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
  },
  { immediate: true }
);

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    @click.self="emit('close')"
  >
    <div :class="['w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 relative animate-fade-in', SIZE_CLASS[size]]">
      <div v-if="title || showCloseButton" class="flex items-center justify-between mb-4">
        <h3 v-if="title" class="text-lg font-bold text-slate-900 m-0">{{ title }}</h3>
        <span v-else></span>
        <button
          v-if="showCloseButton"
          type="button"
          class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xl cursor-pointer"
          aria-label="Đóng"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
