<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Category } from '@/types';
import { SlidersHorizontal, X, RotateCcw, Search } from 'lucide-vue-next';

const props = defineProps<{
  categories: Category[];
  totalProductsCount: number;
  filteredCount?: number;
  categoryFilter: string;
  quickFilterType: string;
  minPrice: string;
  maxPrice: string;
  sortOrder: string;
  searchTerm?: string;
}>();

const emit = defineEmits<{
  'update:categoryFilter': [val: string];
  'update:quickFilterType': [val: string];
  'update:minPrice': [val: string];
  'update:maxPrice': [val: string];
  'update:sortOrder': [val: string];
  'update:searchTerm': [val: string];
  reset: [];
}>();

const isFilterDrawerOpen = ref(false);

const PRICE_PRESETS = [
  { label: 'Dưới 15 triệu', min: '', max: '15000000' },
  { label: '15 – 30 triệu', min: '15000000', max: '30000000' },
  { label: '30 – 50 triệu', min: '30000000', max: '50000000' },
  { label: 'Trên 50 triệu', min: '50000000', max: '' },
];

function simplifyCategoryName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('giày') || lower.includes('sneaker')) return 'GIÀY DÉP';
  if (lower.includes('trang phục') || lower.includes('quần') || lower.includes('áo')) return 'TRANG PHỤC';
  if (lower.includes('túi') || lower.includes('balo')) return 'TÚI XÁCH';
  if (lower.includes('kính')) return 'KÍNH MẮT';
  if (lower.includes('phụ kiện') || lower.includes('đồ da')) return 'PHỤ KIỆN';
  if (lower.includes('trang sức') || lower.includes('đồng hồ')) return 'TRANG SỨC';
  return name.toUpperCase();
}

const sortName = computed(() => {
  switch (props.sortOrder) {
    case 'price_asc':
      return 'Giá: Thấp → Cao';
    case 'price_desc':
      return 'Giá: Cao → Thấp';
    case 'rating':
      return 'Đánh giá cao nhất';
    default:
      return 'Khuyên dùng';
  }
});

const hasActiveFilters = computed(() =>
  Boolean(props.categoryFilter || props.quickFilterType || props.minPrice || props.maxPrice || props.sortOrder !== 'newest' || props.searchTerm)
);
</script>

<template>
  <div class="w-full mb-6">
    <div class="sticky top-16 z-30 w-full bg-white/75 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-8 sm:px-8 transition-all border-b border-black/5">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center justify-start gap-6 sm:gap-8 overflow-x-auto no-scrollbar whitespace-nowrap min-w-0 pr-2">
          <button
            type="button"
            :class="[
              'text-[11px] tracking-[0.14em] uppercase transition-all pb-0.5 cursor-pointer shrink-0',
              categoryFilter === '' && quickFilterType === '' ? 'font-extrabold text-black border-b-2 border-black' : 'font-semibold text-neutral-500 hover:text-black',
            ]"
            @click="emit('update:categoryFilter', ''); emit('update:quickFilterType', '')"
          >
            TẤT CẢ ({{ totalProductsCount }})
          </button>

          <button
            v-for="cat in categories.slice(0, 6)"
            :key="cat.id"
            type="button"
            :class="[
              'text-[11px] tracking-[0.14em] uppercase transition-all pb-0.5 cursor-pointer shrink-0',
              categoryFilter === String(cat.id) ? 'font-extrabold text-black border-b-2 border-black' : 'font-semibold text-neutral-500 hover:text-black',
            ]"
            @click="emit('update:categoryFilter', categoryFilter === String(cat.id) ? '' : String(cat.id)); emit('update:quickFilterType', '')"
          >
            {{ simplifyCategoryName(cat.name) }}
          </button>
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <div class="relative flex items-center">
            <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              :value="searchTerm || ''"
              placeholder="Tìm kiếm sản phẩm..."
              class="h-8 pl-8 pr-6 text-xs rounded-full border border-neutral-200 bg-neutral-50/80 focus:bg-white focus:outline-none focus:border-black w-32 sm:w-44 focus:w-48 sm:focus:w-64 transition-all duration-300 ease-in-out shadow-2xs"
              @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
            />
            <button
              v-if="searchTerm"
              type="button"
              class="absolute right-2 text-neutral-400 hover:text-black cursor-pointer"
              @click="emit('update:searchTerm', '')"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer border',
              isFilterDrawerOpen || hasActiveFilters
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-transparent text-neutral-800 border-neutral-300 hover:border-black hover:text-black',
            ]"
            @click="isFilterDrawerOpen = !isFilterDrawerOpen"
          >
            <SlidersHorizontal class="w-3 h-3" />
            <span class="hidden sm:inline">Bộ lọc</span>
            <span v-if="hasActiveFilters" class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1.5 text-[10.5px] text-neutral-500">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-neutral-800">{{ filteredCount !== undefined ? filteredCount : totalProductsCount }} sản phẩm</span>
          <span>•</span>
          <span>sắp xếp: <strong class="text-black font-semibold">{{ sortName }}</strong></span>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="ml-2 text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            @click="emit('reset')"
          >
            <RotateCcw class="w-2.5 h-2.5" /> Xóa bộ lọc
          </button>
        </div>
      </div>
    </div>

    <div v-if="isFilterDrawerOpen" class="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nổi bật</label>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            :class="['px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer', quickFilterType === 'bestseller' ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-200']"
            @click="emit('update:quickFilterType', quickFilterType === 'bestseller' ? '' : 'bestseller')"
          >
            Bán chạy nhất
          </button>
          <button
            type="button"
            :class="['px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer', quickFilterType === 'discount' ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-200']"
            @click="emit('update:quickFilterType', quickFilterType === 'discount' ? '' : 'discount')"
          >
            Đang giảm giá
          </button>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Khoảng giá</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="p in PRICE_PRESETS"
            :key="p.label"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer',
              minPrice === p.min && maxPrice === p.max ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-200',
            ]"
            @click="
              minPrice === p.min && maxPrice === p.max
                ? (emit('update:minPrice', ''), emit('update:maxPrice', ''))
                : (emit('update:minPrice', p.min), emit('update:maxPrice', p.max))
            "
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Sắp xếp</label>
        <select
          class="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
          :value="sortOrder"
          @change="emit('update:sortOrder', ($event.target as HTMLSelectElement).value)"
        >
          <option value="newest">Khuyên dùng (Mặc định)</option>
          <option value="price_asc">Giá: Thấp → Cao</option>
          <option value="price_desc">Giá: Cao → Thấp</option>
        </select>
      </div>
    </div>
  </div>
</template>
