<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const HOME_SLIDES = [
  '/img/home/1.jpg',
  '/img/home/2.jpg',
  '/img/home/3.jpg',
  '/img/home/4.jpg',
  '/img/home/5.jpg',
  '/img/home/6.jpg',
  '/img/home/7.jpg',
  '/img/home/8.jpg',
  '/img/home/9.jpg',
  '/img/home/10.jpg',
  '/img/home/11.jpg',
  '/img/home/12.jpg',
  '/img/home/13.jpg',
  '/img/home/14.jpg',
];

defineProps<{
  shopName?: string;
}>();

const currentIndex = ref(0);
const nextIndex = ref<number | null>(null);
const isSliding = ref(false);
const loadedIndexes = ref<Set<number>>(new Set([0, 1]));
const total = HOME_SLIDES.length;

let slideTimer: ReturnType<typeof setTimeout> | null = null;
let autoInterval: ReturnType<typeof setInterval> | null = null;

function finishSlide(target: number) {
  if (slideTimer) clearTimeout(slideTimer);
  slideTimer = setTimeout(() => {
    currentIndex.value = target;
    nextIndex.value = null;
    isSliding.value = false;
  }, 1100);
}

function triggerNext() {
  if (isSliding.value) return;
  const incoming = (currentIndex.value + 1) % total;
  loadedIndexes.value = new Set([...loadedIndexes.value, incoming, (incoming + 1) % total]);
  nextIndex.value = incoming;
  isSliding.value = true;
  finishSlide(incoming);
}

function triggerPrev() {
  if (isSliding.value) return;
  const incoming = (currentIndex.value - 1 + total) % total;
  loadedIndexes.value = new Set([...loadedIndexes.value, incoming]);
  nextIndex.value = incoming;
  isSliding.value = true;
  finishSlide(incoming);
}

onMounted(() => {
  autoInterval = setInterval(triggerNext, 10000);
});

onUnmounted(() => {
  if (slideTimer) clearTimeout(slideTimer);
  if (autoInterval) clearInterval(autoInterval);
});
</script>

<template>
  <section id="brand-showcase" class="brand-cinematic-wrapper">
    <div id="cinematic-stage" class="relative w-full h-[85vh] min-h-[580px] max-h-[920px] overflow-hidden bg-black select-none">
      <div
        class="absolute inset-0 w-full h-full bg-cover bg-center will-change-transform"
        :style="{
          backgroundImage: `url(${HOME_SLIDES[currentIndex]})`,
          transform: isSliding ? 'translateX(-100%)' : 'translateX(0%)',
          transition: isSliding ? 'transform 1100ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          zIndex: 1,
        }"
      />

      <div
        v-if="nextIndex !== null && loadedIndexes.has(nextIndex)"
        class="absolute inset-0 w-full h-full bg-cover bg-center will-change-transform"
        :style="{
          backgroundImage: `url(${HOME_SLIDES[nextIndex]})`,
          transform: isSliding ? 'translateX(0%)' : 'translateX(100%)',
          transition: isSliding ? 'transform 1100ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          zIndex: 2,
        }"
      />

      <div
        class="absolute inset-0 pointer-events-none z-10"
        style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.15) 0%, transparent 40%, rgba(0, 0, 0, 0.25) 100%)"
      />

      <button
        type="button"
        :disabled="isSliding"
        aria-label="Ảnh trước"
        class="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-0 hover:opacity-100 focus:opacity-100 cursor-pointer disabled:opacity-0"
        @click="triggerPrev"
      >
        <ChevronLeft :size="26" />
      </button>

      <button
        type="button"
        :disabled="isSliding"
        aria-label="Ảnh tiếp theo"
        class="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-0 hover:opacity-100 focus:opacity-100 cursor-pointer disabled:opacity-0"
        @click="triggerNext"
      >
        <ChevronRight :size="26" />
      </button>

      <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20 overflow-hidden">
        <div :key="currentIndex" class="h-full bg-white/70 showcase-progress-bar" />
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes showcaseProgress {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}
.showcase-progress-bar {
  animation: showcaseProgress 10s linear infinite;
}
</style>
