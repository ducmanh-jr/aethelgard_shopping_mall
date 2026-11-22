<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const DUAL_IMAGE_PAIRS = [
  { left: '/img/login/1.jpg', right: '/img/login/2.jpg' },
  { left: '/img/login/3.jpg', right: '/img/login/4.jpg' },
  { left: '/img/login/5.jpg', right: '/img/login/6.jpg' },
  { left: '/img/login/7.jpg', right: '/img/login/8.jpg' },
  { left: '/img/login/9.jpg', right: '/img/login/10.jpg' },
  { left: '/img/login/11.jpg', right: '/img/login/12.jpg' },
  { left: '/img/login/13.jpg', right: '/img/login/14.jpg' },
  { left: '/img/login/15.jpg', right: '/img/login/16.jpg' },
  { left: '/img/login/17.jpg', right: '/img/login/1.jpg' },
];

const currentSlide = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  timer = setInterval(() => {
    if (!preference.matches && !document.hidden) {
      currentSlide.value = (currentSlide.value + 1) % DUAL_IMAGE_PAIRS.length;
    }
  }, 15000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const previous = computed(() => (currentSlide.value - 1 + DUAL_IMAGE_PAIRS.length) % DUAL_IMAGE_PAIRS.length);
const next = computed(() => (currentSlide.value + 1) % DUAL_IMAGE_PAIRS.length);

function fallbackImg(e: Event, fallback: string) {
  (e.target as HTMLImageElement).src = fallback;
}
</script>

<template>
  <div class="login-right-panel" aria-hidden="true">
    <div class="dual-slider-wrapper relative w-full h-full min-h-screen">
      <template v-for="(pair, idx) in DUAL_IMAGE_PAIRS" :key="idx">
        <div
          v-if="idx === currentSlide || idx === previous || idx === next"
          :class="['dual-slide-item', idx === currentSlide ? 'active' : '']"
        >
          <div class="dual-col">
            <img
              :src="pair.left"
              loading="eager"
              decoding="async"
              alt=""
              class="dual-col-img"
              @error="fallbackImg($event, '/img/login/1.jpg')"
            />
          </div>
          <div class="dual-col">
            <img
              :src="pair.right"
              loading="eager"
              decoding="async"
              alt=""
              class="dual-col-img"
              @error="fallbackImg($event, '/img/login/2.jpg')"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
