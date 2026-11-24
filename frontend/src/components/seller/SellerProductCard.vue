<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Product } from '@/types';
import { formatVND } from '@/lib/utils';
import { extractBrand } from '@/lib/customer';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    product: Product;
    isSeller?: boolean;
  }>(),
  { isSeller: true }
);

const emit = defineEmits<{
  click: [product: Product];
}>();

const parsed = computed(() => {
  const rawName = props.product.name;
  if (rawName && rawName.includes(' - ')) {
    const idx = rawName.indexOf(' - ');
    return {
      brand: rawName.substring(0, idx).trim(),
      title: rawName.substring(idx + 3).trim(),
    };
  }
  return {
    brand: extractBrand(props.product) || '',
    title: rawName,
  };
});

const images = computed(() =>
  props.product.galleryUrls && props.product.galleryUrls.length > 0
    ? [props.product.imageUrl, ...props.product.galleryUrls.filter((u) => u && u !== props.product.imageUrl)]
    : [props.product.imageUrl]
);

const activeImageIndex = ref(0);

function prevImage() {
  activeImageIndex.value = activeImageIndex.value > 0 ? activeImageIndex.value - 1 : images.value.length - 1;
}

function nextImage() {
  activeImageIndex.value = activeImageIndex.value < images.value.length - 1 ? activeImageIndex.value + 1 : 0;
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = '/img/products/adidas-samba.jpg';
}
</script>

<template>
  <div class="luxury-product-card group relative flex flex-col cursor-pointer transition-all duration-300" @click="emit('click', product)">
    <div class="relative w-full aspect-[3/4] bg-[#F7F7F7] rounded-none overflow-hidden flex items-center justify-center p-6 transition-all duration-300 group-hover:bg-[#F2F2F2]">
      <span
        v-if="(product.discountPercent ?? 0) > 0"
        class="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-slate-900 text-white z-10"
      >
        -{{ product.discountPercent }}%
      </span>

      <button
        v-if="images.length > 1"
        type="button"
        aria-label="Ảnh trước"
        class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 backdrop-blur-sm cursor-pointer"
        @click.stop="prevImage"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <div class="w-full h-full flex items-center justify-center">
        <img
          :src="images[activeImageIndex] || product.imageUrl"
          :alt="product.name"
          loading="lazy"
          class="max-w-full max-h-full object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-105"
          @error="onImgError"
        />
      </div>

      <button
        v-if="images.length > 1"
        type="button"
        aria-label="Ảnh kế tiếp"
        class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 backdrop-blur-sm cursor-pointer"
        @click.stop="nextImage"
      >
        <ChevronRight class="w-4 h-4" />
      </button>

      <div v-if="images.length > 1" class="absolute bottom-2.5 left-6 right-6 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div
          v-for="(_, idx) in images"
          :key="idx"
          :class="['h-[2px] flex-1 rounded-full transition-all duration-300', idx === activeImageIndex ? 'bg-slate-900' : 'bg-slate-300']"
        />
      </div>
    </div>

    <div class="luxury-meta-box pt-3.5 pb-2 flex flex-col text-left">
      <div class="flex items-center justify-between text-[11px] font-bold tracking-[0.16em] uppercase text-slate-500 mb-1">
        <span>{{ parsed.brand || product.categoryName || 'LUXURY' }}</span>
        <span class="text-slate-400 font-normal">★ {{ Number(product.rating || 5.0).toFixed(1) }}</span>
      </div>

      <h3 class="luxury-title-text text-sm font-medium text-slate-900 leading-snug line-clamp-1 group-hover:text-sky-600 transition-colors duration-200 mb-1" :title="product.name">
        {{ parsed.title || product.name }}
      </h3>

      <div class="flex items-baseline justify-between gap-2 mt-0.5">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-bold text-slate-900 tracking-tight">{{ formatVND(product.basePrice) }}</span>
          <span v-if="product.originalPrice && product.originalPrice > product.basePrice" class="text-xs text-slate-400 line-through">
            {{ formatVND(product.originalPrice) }}
          </span>
        </div>
        <span class="text-[11px] font-semibold text-slate-400 group-hover:text-sky-600 transition-colors">
          {{ isSeller ? 'Quản lý kho →' : 'Xem chi tiết →' }}
        </span>
      </div>
    </div>
  </div>
</template>
