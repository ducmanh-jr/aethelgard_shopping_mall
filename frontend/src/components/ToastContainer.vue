<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-vue-next';
import { useToast, type ToastType } from '@/stores/toast';

const { toasts, removeToast } = useToast();

const BADGE_BG: Record<ToastType, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  error: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
};

const PROGRESS_BG: Record<ToastType, string> = {
  success: '#10b981',
  error: '#f43f5e',
  warning: '#f59e0b',
  info: '#38bdf8',
};
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2.5 pointer-events-auto">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :role="toast.type === 'error' ? 'alert' : 'status'"
      :style="{
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        borderColor: '#334155',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
      }"
      :class="[
        'relative overflow-hidden flex items-center gap-3.5 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl border border-slate-700 shadow-2xl transition-[transform,opacity] motion-reduce:transition-none duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-[min(26rem,calc(100vw-2rem))]',
        toast.isClosing ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100',
      ]"
    >
      <div :class="['p-1.5 rounded-xl shrink-0', BADGE_BG[toast.type]]">
        <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-400 shrink-0" />
        <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-rose-400 shrink-0" />
        <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5 text-amber-400 shrink-0" />
        <Info v-else class="w-5 h-5 text-sky-400 shrink-0" />
      </div>
      <div class="flex-1 text-white text-sm font-medium leading-snug" style="color: #ffffff; font-size: 0.88rem">
        {{ toast.message }}
      </div>
      <button
        type="button"
        class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        aria-label="Đóng thông báo"
        @click="removeToast(toast.id)"
      >
        <X class="w-4 h-4" />
      </button>

      <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          class="toast-progress h-full origin-left motion-reduce:hidden"
          :style="{
            animationDuration: toast.durationMs + 'ms',
            backgroundColor: PROGRESS_BG[toast.type],
          }"
        />
      </div>
    </div>
  </div>
</template>
