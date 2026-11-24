<script setup lang="ts">
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const { isOpen, options, handleResolve } = useConfirmDialog();
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    @click.self="handleResolve(false)"
  >
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-fade-in">
      <h3 class="text-lg font-bold text-slate-900 m-0 mb-2">{{ options.title }}</h3>
      <p class="text-sm text-slate-600 leading-relaxed mb-6">{{ options.message }}</p>
      <div class="flex items-center justify-end gap-2.5">
        <button
          type="button"
          class="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
          @click="handleResolve(false)"
        >
          {{ options.cancelText || 'Hủy' }}
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer shadow-sm',
            options.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700',
          ]"
          @click="handleResolve(true)"
        >
          {{ options.confirmText || 'Xác nhận' }}
        </button>
      </div>
    </div>
  </div>
</template>
