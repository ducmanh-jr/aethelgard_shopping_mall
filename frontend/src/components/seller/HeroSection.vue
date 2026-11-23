<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, X, ArrowRight, Sparkles, Tag, Package } from 'lucide-vue-next';
import type { Product } from '@/types';
import { useCatalog } from '@/composables/useCatalog';
import { extractBrand } from '@/lib/customer';
import { formatVND } from '@/lib/utils';

const props = defineProps<{
  searchTerm: string;
  products?: Product[];
}>();

const emit = defineEmits<{
  'update:searchTerm': [val: string];
  scrollToCatalog: [];
}>();

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const POPULAR_TAGS = ['Dior', 'Gucci', 'Adidas', 'Nike', 'Áo khoác', 'Sneaker', 'Túi xách'];

const router = useRouter();
const containerRef = ref<HTMLDivElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const { products: catalogProducts, categories: catalogCategories } = useCatalog();
const allProducts = computed(() =>
  props.products && props.products.length > 0 ? props.products : catalogProducts.value
);

const isOpen = ref(false);
const isBgLoaded = ref(false);
const selectedIndex = ref(-1);

const searchResults = computed(() => {
  const q = props.searchTerm.trim();
  if (!q) {
    return { matchingProducts: [], matchedBrands: [], matchedCategories: [], totalMatchesCount: 0 };
  }
  const terms = fold(q).split(/\s+/).filter(Boolean);
  const matches = allProducts.value.filter((p) => {
    const brand = extractBrand(p) || '';
    const combined = fold(`${p.name} ${p.sku || ''} ${p.categoryName || ''} ${p.collectionName || ''} ${brand}`);
    return terms.every((term) => combined.includes(term));
  });
  const brandSet = new Set<string>();
  allProducts.value.forEach((p) => {
    const b = extractBrand(p);
    if (b && fold(b).includes(fold(q))) brandSet.add(b);
  });
  const cats = catalogCategories.value.filter((c) => fold(c.name).includes(fold(q))).slice(0, 2);

  return {
    matchingProducts: matches.slice(0, 5),
    matchedBrands: Array.from(brandSet).slice(0, 3),
    matchedCategories: cats,
    totalMatchesCount: matches.length,
  };
});

watch(
  () => props.searchTerm,
  (val) => {
    if (val.trim().length > 0) {
      isOpen.value = true;
      selectedIndex.value = -1;
    } else {
      isOpen.value = false;
    }
  }
);

function handleClickOutside(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  const img = new Image();
  img.src = '/img/products/fashion-mood-board.jpg';
  img.onload = () => {
    isBgLoaded.value = true;
  };
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

function handleKeyDown(e: KeyboardEvent) {
  const list = searchResults.value.matchingProducts;
  if (!isOpen.value) {
    if (e.key === 'Enter') emit('scrollToCatalog');
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = selectedIndex.value < list.length - 1 ? selectedIndex.value + 1 : 0;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = selectedIndex.value > 0 ? selectedIndex.value - 1 : list.length - 1;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedIndex.value >= 0 && list[selectedIndex.value]) {
      router.push(`/product-detail/${list[selectedIndex.value].id}`);
      isOpen.value = false;
    } else {
      isOpen.value = false;
      emit('scrollToCatalog');
    }
  } else if (e.key === 'Escape') {
    isOpen.value = false;
  }
}

function selectProduct(productId: number) {
  isOpen.value = false;
  router.push(`/product-detail/${productId}`);
}

function applyTag(tag: string) {
  emit('update:searchTerm', tag);
  inputRef.value?.focus();
}

function clearSearch() {
  emit('update:searchTerm', '');
  isOpen.value = false;
  inputRef.value?.focus();
}

function fallbackThumb(e: Event) {
  (e.target as HTMLImageElement).src = '/img/home/1.jpg';
}
</script>

<template>
  <section id="hero" class="page-section hero-section relative overflow-hidden">
    <div
      :class="['absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out z-0', isBgLoaded ? 'opacity-100' : 'opacity-0']"
      style="background-image: linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.55)), url('/img/products/fashion-mood-board.jpg')"
    />
    <div class="hero-backdrop">
      <h1 class="hero-watermark">AETHELGARD</h1>
    </div>

    <div class="hero-content-wrapper">
      <h2 class="hero-tagline">Mọi Thứ Bạn Cần</h2>
      <p class="hero-subtitle">Khám phá bộ sưu tập thời trang, sneaker & phụ kiện cao cấp tích hợp AI</p>

      <div ref="containerRef" class="relative w-full max-w-[760px] mx-auto z-40 text-left">
        <div class="search-floating-card relative">
          <div class="search-box relative flex items-center w-full">
            <Search class="w-5 h-5 text-slate-400 mr-2 shrink-0 hidden sm:block" />
            <input
              id="search-input"
              ref="inputRef"
              type="text"
              :value="searchTerm"
              placeholder="Tìm kiếm sản phẩm trên Aethelgard Mall..."
              aria-label="Tìm kiếm sản phẩm"
              autocomplete="off"
              class="w-full"
              @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
              @focus="searchTerm.trim().length > 0 && (isOpen = true)"
              @keydown="handleKeyDown"
            />
            <button
              v-if="searchTerm"
              type="button"
              class="p-1 mr-2 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Xóa từ khóa"
              @click="clearSearch"
            >
              <X class="w-4 h-4" />
            </button>
            <button
              id="search-btn"
              class="btn-search shrink-0"
              type="button"
              @click="isOpen = false; emit('scrollToCatalog')"
            >
              Tìm Kiếm
            </button>
          </div>
        </div>

        <div
          v-if="isOpen && searchTerm.trim().length > 0"
          class="absolute left-0 right-0 top-[calc(100%+10px)] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden z-50 transition-all text-slate-800"
          style="box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)"
        >
          <div class="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-purple-600" />
              <span class="text-xs font-bold text-slate-700">
                Gợi ý trực tiếp cho: <span class="text-purple-700">&ldquo;{{ searchTerm }}&rdquo;</span>
              </span>
            </div>
            <span class="text-[11px] font-semibold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-100">
              {{ searchResults.totalMatchesCount }} kết quả
            </span>
          </div>

          <div
            v-if="searchResults.matchedBrands.length > 0 || searchResults.matchedCategories.length > 0"
            class="px-5 py-2.5 bg-purple-50/40 border-b border-purple-100/60 flex flex-wrap items-center gap-2 text-xs"
          >
            <span class="text-[11px] font-bold text-purple-900 flex items-center gap-1">
              <Tag class="w-3 h-3" /> Khám phá nhanh:
            </span>
            <button
              v-for="b in searchResults.matchedBrands"
              :key="b"
              type="button"
              class="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white font-medium text-xs transition-all cursor-pointer shadow-xs"
              @click="applyTag(b)"
            >
              Thương hiệu: <strong>{{ b }}</strong>
            </button>
            <button
              v-for="c in searchResults.matchedCategories"
              :key="c.id"
              type="button"
              class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-800 hover:text-white font-medium text-xs transition-all cursor-pointer shadow-xs"
              @click="applyTag(c.name)"
            >
              Danh mục: <strong>{{ c.name }}</strong>
            </button>
          </div>

          <div v-if="searchResults.matchingProducts.length > 0" class="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            <div
              v-for="(p, idx) in searchResults.matchingProducts"
              :key="p.id"
              :class="['flex items-center justify-between p-3.5 px-5 transition-all cursor-pointer group', selectedIndex === idx ? 'bg-purple-50/90' : 'hover:bg-slate-50']"
              @click="selectProduct(p.id)"
              @mouseenter="selectedIndex = idx"
            >
              <div class="flex items-center gap-3.5 min-w-0 pr-4">
                <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                  <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform" @error="fallbackThumb" />
                  <Package v-else class="w-6 h-6 text-slate-400" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span v-if="extractBrand(p)" class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                      {{ extractBrand(p) }}
                    </span>
                    <span class="text-[11px] text-slate-400 font-mono">{{ p.sku || `#${p.id}` }}</span>
                  </div>
                  <h4 class="text-sm font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors">{{ p.name }}</h4>
                </div>
              </div>
              <div class="text-right shrink-0 flex flex-col items-end">
                <span class="text-sm font-extrabold text-slate-900">{{ formatVND(p.basePrice) }}</span>
                <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full mt-1', (p.stockQuantity ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600']">
                  {{ (p.stockQuantity ?? 0) > 0 ? 'Còn hàng' : 'Hết hàng' }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="p-8 text-center">
            <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Search class="w-6 h-6" />
            </div>
            <h4 class="text-sm font-bold text-slate-800 mb-1">Không tìm thấy sản phẩm nào khớp với &ldquo;{{ searchTerm }}&rdquo;</h4>
            <p class="text-xs text-slate-500 mb-4">Thử tìm với tên thương hiệu hoặc từ khóa thông dụng:</p>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button
                v-for="tag in POPULAR_TAGS"
                :key="tag"
                type="button"
                class="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-purple-800 transition-all cursor-pointer"
                @click="applyTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div v-if="searchResults.matchingProducts.length > 0" class="p-3 bg-slate-50/80 border-t border-slate-100 px-5 flex items-center justify-between">
            <span class="text-[11px] text-slate-500">
              Nhấn <kbd class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">Enter</kbd> hoặc click để xem tất cả
            </span>
            <button
              type="button"
              class="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1.5 hover:underline cursor-pointer"
              @click="isOpen = false; emit('scrollToCatalog')"
            >
              <span>Xem tất cả {{ searchResults.totalMatchesCount }} sản phẩm</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div
        class="scroll-down-indicator cursor-pointer select-none"
        role="button"
        tabindex="0"
        title="Cuộn xuống khám phá sản phẩm"
        @click="emit('scrollToCatalog')"
        @keydown.enter="emit('scrollToCatalog')"
      >
        <span>Cuộn xuống khám phá sản phẩm</span>
        <div class="scroll-arrow">&darr;</div>
      </div>
    </div>
  </section>
</template>
