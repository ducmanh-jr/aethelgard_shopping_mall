<script setup lang="ts">
import type { Category } from '@/types';

export interface CustomerFilterState {
  categoryId: string;
  brand: string;
  quick: '' | 'newest' | 'bestseller' | 'discount' | 'top_rated';
  minPrice: string;
  maxPrice: string;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  inStockOnly: boolean;
}

defineProps<{
  categories: (Category & { visibleCount: number })[];
  brands: { name: string; count: number }[];
  totalProductsCount: number;
  value: CustomerFilterState;
}>();

const emit = defineEmits<{
  change: [next: Partial<CustomerFilterState>];
  reset: [];
}>();

const QUICK_LINKS = [
  ['newest', 'Hàng Mới Về'],
  ['bestseller', 'Bán Chạy Nhất'],
  ['discount', 'Đang Giảm Giá'],
  ['top_rated', 'Đánh Giá Cao'],
] as const;

const PRICE_PRESETS = [
  { label: 'Dưới 3 triệu', min: '', max: '3000000' },
  { label: '3 – 10 triệu', min: '3000000', max: '10000000' },
  { label: '10 – 50 triệu', min: '10000000', max: '50000000' },
  { label: 'Trên 50 triệu', min: '50000000', max: '' },
];
</script>

<template>
  <aside class="sidebar-filters customer-filters">
    <div class="sidebar-header">
      <h3>Danh Mục</h3>
    </div>

    <ul class="category-subnav">
      <li
        :class="['subnav-item', value.categoryId === '' ? 'active' : '']"
        style="cursor: pointer"
        @click="emit('change', { categoryId: '' })"
      >
        <span>Tất Cả Sản Phẩm</span>
        <span class="count-tag">{{ totalProductsCount }}</span>
      </li>
      <li
        v-for="c in categories"
        :key="c.id"
        :class="['subnav-item', value.categoryId === String(c.id) ? 'active' : '']"
        style="cursor: pointer"
        @click="emit('change', { categoryId: String(c.id) })"
      >
        <span>{{ c.name }}</span>
        <span class="count-tag">{{ c.visibleCount }}</span>
      </li>
    </ul>

    <div class="filter-divider" />

    <div class="quick-nav-links">
      <button
        v-for="[key, label] in QUICK_LINKS"
        :key="key"
        type="button"
        :class="['quick-link text-left bg-transparent border-0 cursor-pointer', value.quick === key ? 'font-bold' : '']"
        @click="emit('change', { quick: value.quick === key ? '' : key })"
      >
        {{ label }}
      </button>
    </div>

    <template v-if="brands.length > 0">
      <div class="filter-divider" />
      <div class="filter-group">
        <label for="customer-brand-select" class="filter-label">Thương Hiệu</label>
        <select
          id="customer-brand-select"
          class="form-control"
          :value="value.brand"
          @change="emit('change', { brand: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">Tất cả thương hiệu</option>
          <option v-for="b in brands" :key="b.name" :value="b.name">
            {{ b.name }} ({{ b.count }})
          </option>
        </select>
      </div>
    </template>

    <div class="filter-divider" />

    <div class="filter-group">
      <label class="filter-label">Khoảng Giá (VNĐ)</label>
      <div class="price-inputs">
        <input
          type="number"
          placeholder="Từ giá"
          min="0"
          class="form-control"
          :value="value.minPrice"
          @input="emit('change', { minPrice: ($event.target as HTMLInputElement).value })"
        />
        <span>-</span>
        <input
          type="number"
          placeholder="Đến giá"
          min="0"
          class="form-control"
          :value="value.maxPrice"
          @input="emit('change', { maxPrice: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="customer-price-presets">
        <button
          v-for="p in PRICE_PRESETS"
          :key="p.label"
          type="button"
          :class="['customer-chip', value.minPrice === p.min && value.maxPrice === p.max ? 'active' : '']"
          @click="
            emit(
              'change',
              value.minPrice === p.min && value.maxPrice === p.max
                ? { minPrice: '', maxPrice: '' }
                : { minPrice: p.min, maxPrice: p.max }
            )
          "
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div class="filter-group">
      <label class="customer-checkbox">
        <input
          type="checkbox"
          :checked="value.inStockOnly"
          @change="emit('change', { inStockOnly: ($event.target as HTMLInputElement).checked })"
        />
        <span>Chỉ hiện sản phẩm còn hàng</span>
      </label>
    </div>

    <div class="filter-group">
      <label for="customer-sort-select" class="filter-label">Sắp Xếp Theo</label>
      <select
        id="customer-sort-select"
        class="form-control"
        :value="value.sort"
        @change="emit('change', { sort: ($event.target as HTMLSelectElement).value as CustomerFilterState['sort'] })"
      >
        <option value="newest">Hàng mới nhất</option>
        <option value="popular">Phổ biến nhất</option>
        <option value="rating">Đánh giá cao nhất</option>
        <option value="price_asc">Giá: Thấp đến Cao</option>
        <option value="price_desc">Giá: Cao đến Thấp</option>
      </select>
    </div>

    <button class="btn-secondary btn-full" type="button" @click="emit('reset')">
      Đặt Lại Bộ Lọc
    </button>
  </aside>
</template>
