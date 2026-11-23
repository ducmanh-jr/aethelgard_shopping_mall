<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Eye } from 'lucide-vue-next';
import HeroSection from '@/components/seller/HeroSection.vue';
import CustomerProductCard from '@/components/customer/CustomerProductCard.vue';
import CustomerFilters, { type CustomerFilterState } from '@/components/customer/CustomerFilters.vue';
import CustomerPagination from '@/components/customer/CustomerPagination.vue';
import ShopSubnav from '@/components/customer/ShopSubnav.vue';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton.vue';
import { useCatalog } from '@/composables/useCatalog';
import { useAuth } from '@/stores/auth';
import { useShopper } from '@/stores/shopper';
import { extractBrand, recommendProducts } from '@/lib/customer';

const ITEMS_PER_PAGE = 12;

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const route = useRoute();
const router = useRouter();
const { user } = useAuth();
const { products, categories, isLoading, isOffline } = useCatalog();
const { recentlyViewed, wishlist } = useShopper();

const searchTerm = ref(String(route.query.q || ''));
const filters = reactive<CustomerFilterState>({
  categoryId: String(route.query.category || ''),
  brand: String(route.query.brand || ''),
  quick: '',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
  inStockOnly: false,
});
const currentPage = ref(1);
const onlyMyProducts = ref(false);

const isSeller = computed(() => user.value?.role === 'Seller');
const isAdmin = computed(() => user.value?.role === 'Admin');
const isManagement = computed(() => isSeller.value || isAdmin.value);
const sellerId = computed(() => user.value?.id || user.value?.userId);

let urlTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  [searchTerm, () => filters.categoryId, () => filters.brand],
  () => {
    if (urlTimer) clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const query: Record<string, string> = {};
      if (searchTerm.value.trim()) query.q = searchTerm.value.trim();
      if (filters.categoryId) query.category = filters.categoryId;
      if (filters.brand) query.brand = filters.brand;
      router.replace({ path: '/shop', query });
    }, 350);
  }
);

watch([searchTerm, () => ({ ...filters })], () => {
  currentPage.value = 1;
});

const brands = computed(() => {
  const map = new Map<string, number>();
  products.value.forEach((p) => {
    const b = extractBrand(p);
    if (b) map.set(b, (map.get(b) || 0) + 1);
  });
  return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
});

const categoriesWithCount = computed(() =>
  categories.value
    .map((c) => ({ ...c, visibleCount: products.value.filter((p) => p.categoryId === c.id).length }))
    .filter((c) => c.visibleCount > 0)
);

const filteredProducts = computed(() => {
  let list = [...products.value];

  if (isSeller.value && onlyMyProducts.value && sellerId.value) {
    list = list.filter((p) => p.sellerId === sellerId.value);
  }
  if (filters.categoryId) list = list.filter((p) => String(p.categoryId) === filters.categoryId);
  if (filters.brand) list = list.filter((p) => extractBrand(p) === filters.brand);
  if (filters.inStockOnly) list = list.filter((p) => (p.stockQuantity ?? 0) > 0);

  if (searchTerm.value.trim()) {
    const terms = fold(searchTerm.value.trim()).split(/\s+/);
    list = list.filter((p) => {
      const text = fold(`${p.name} ${p.sku} ${p.collectionName || ''} ${p.categoryName || ''} ${p.description || ''}`);
      return terms.every((t) => text.includes(t));
    });
  }

  const min = Number(filters.minPrice);
  const max = Number(filters.maxPrice);
  if (filters.minPrice && !isNaN(min)) list = list.filter((p) => p.basePrice >= min);
  if (filters.maxPrice && !isNaN(max)) list = list.filter((p) => p.basePrice <= max);
  if (filters.quick === 'discount') list = list.filter((p) => (p.discountPercent || 0) > 0);

  const sortKey =
    filters.quick === 'bestseller'
      ? 'popular'
      : filters.quick === 'top_rated'
      ? 'rating'
      : filters.quick === 'newest'
      ? 'newest'
      : filters.sort;

  list.sort((a, b) => {
    switch (sortKey) {
      case 'price_asc':
        return a.basePrice - b.basePrice;
      case 'price_desc':
        return b.basePrice - a.basePrice;
      case 'popular':
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0);
      default:
        return filters.quick === 'discount'
          ? (b.discountPercent || 0) - (a.discountPercent || 0)
          : b.id - a.id;
    }
  });

  if (!['price_asc', 'price_desc', 'popular', 'rating'].includes(sortKey) && filters.quick !== 'discount') {
    const buckets = new Map<string, typeof list>();
    for (const item of list) {
      const key = item.categoryName || 'Khác';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(item);
    }
    const groups = Array.from(buckets.values());
    const maxLen = Math.max(...groups.map((g) => g.length), 0);
    const interleaved: typeof list = [];
    for (let i = 0; i < maxLen; i++) {
      for (const g of groups) {
        if (i < g.length) interleaved.push(g[i]);
      }
    }
    return interleaved;
  }

  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / ITEMS_PER_PAGE)));
const paginated = computed(() =>
  filteredProducts.value.slice((currentPage.value - 1) * ITEMS_PER_PAGE, currentPage.value * ITEMS_PER_PAGE)
);

const hasSignals = computed(() => recentlyViewed.value.length > 0 || wishlist.value.length > 0);
const recommendations = computed(() =>
  recommendProducts(products.value, { viewed: recentlyViewed.value, wishlist: wishlist.value }, 4)
);

const activeCategory = computed(() => categories.value.find((c) => String(c.id) === filters.categoryId));
const greeting = computed(() => (user.value?.fullName ? `Xin chào ${user.value.fullName}` : 'Sàn Thời Trang Cao Cấp'));

function scrollToCatalog() {
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateFilters(next: Partial<CustomerFilterState>) {
  Object.assign(filters, next);
}

function resetFilters() {
  Object.assign(filters, {
    categoryId: '',
    brand: '',
    quick: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    inStockOnly: false,
  });
  searchTerm.value = '';
}
</script>

<template>
  <div>
    <HeroSection v-model:search-term="searchTerm" :products="products" @scroll-to-catalog="scrollToCatalog" />

    <section id="catalog" class="page-section shop-section">
      <div v-if="isManagement" class="w-full max-w-[1440px] mx-auto px-[4vw] mb-6">
        <div class="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
              <Eye class="w-5 h-5 text-white" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <strong class="text-sm font-bold text-slate-900 tracking-tight">
                  {{
                    isAdmin
                      ? 'Góc Người Mua (Chế độ giám sát dành cho Quản Trị Viên sàn)'
                      : 'Góc Người Mua (Chế độ xem trước dành cho Người Bán)'
                  }}
                </strong>
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white tracking-wider uppercase">
                  {{ isAdmin ? 'Giám Sát' : 'Xem Trước' }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1 m-0">
                {{
                  isAdmin
                    ? 'Giám sát trải nghiệm thực tế của khách hàng trên toàn sàn Aethelgard. Tài khoản Quản trị viên không có giỏ hàng và không được phép đặt hàng.'
                    : 'Xem trước giao diện sản phẩm hiển thị với khách hàng. Tài khoản Người bán không có giỏ hàng và không được phép đặt hàng.'
                }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap">
            <button
              type="button"
              :class="[
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                !onlyMyProducts ? 'bg-slate-900 text-white shadow-sm hover:bg-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
              ]"
              @click="onlyMyProducts = false"
            >
              Tất cả sản phẩm ({{ products.length }})
            </button>
            <button
              v-if="isSeller"
              type="button"
              :class="[
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                onlyMyProducts ? 'bg-slate-900 text-white shadow-sm hover:bg-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
              ]"
              @click="onlyMyProducts = true"
            >
              Sản phẩm của Shop tôi ({{ products.filter((p) => p.sellerId === sellerId).length }})
            </button>
          </div>
        </div>
      </div>

      <div v-if="!isManagement" class="customer-shop-topbar">
        <ShopSubnav />
        <span v-if="isOffline && !isLoading" class="customer-offline-pill">
          Đang hiển thị dữ liệu mẫu — chưa kết nối được máy chủ
        </span>
      </div>

      <main class="main-layout">
        <CustomerFilters
          :categories="categoriesWithCount"
          :brands="brands"
          :total-products-count="products.length"
          :value="filters"
          @change="updateFilters"
          @reset="resetFilters"
        />

        <section class="catalog-section">
          <div class="catalog-header">
            <div>
              <h2 id="catalog-title">
                {{ activeCategory ? activeCategory.name : filters.brand ? `Thương hiệu ${filters.brand}` : greeting }}
              </h2>
              <span class="results-tag">
                {{
                  isLoading
                    ? 'Đang tải sản phẩm...'
                    : `Hiển thị ${filteredProducts.length} sản phẩm${totalPages > 1 ? ` (Trang ${currentPage}/${totalPages})` : ''}`
                }}
                <template v-if="searchTerm.trim()"> cho “{{ searchTerm.trim() }}”</template>
              </span>
            </div>
          </div>

          <div class="product-grid">
            <template v-if="isLoading">
              <ProductCardSkeleton v-for="i in 6" :key="i" />
            </template>
            <template v-else-if="paginated.length > 0">
              <CustomerProductCard v-for="p in paginated" :key="p.id" :product="p" />
            </template>
            <div v-else class="col-span-full py-16 text-center text-slate-500 customer-empty-grid">
              <p class="text-base font-semibold">Không tìm thấy sản phẩm phù hợp với bộ lọc.</p>
              <button
                type="button"
                class="mt-3 px-4 py-2 bg-sky-100 text-sky-700 rounded-lg text-xs font-bold hover:bg-sky-200 transition-all cursor-pointer"
                @click="resetFilters"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          </div>

          <CustomerPagination
            :current-page="currentPage"
            :total-pages="totalPages"
            @page-change="(p) => { currentPage = p; scrollToCatalog(); }"
          />
        </section>
      </main>
    </section>

    <section v-if="!isLoading && recommendations.length > 0" class="page-section recommendations-section">
      <div class="section-container">
        <div class="section-header">
          <div>
            <h2>{{ hasSignals ? 'Gợi Ý Dành Riêng Cho Bạn' : 'Được Yêu Thích Nhất Trên Sàn' }}</h2>
            <p class="customer-section-sub">
              {{
                hasSignals
                  ? 'AI phân tích sản phẩm bạn đã xem & yêu thích để chọn ra những món phù hợp nhất'
                  : 'Xem hoặc thả tim vài sản phẩm để nhận gợi ý cá nhân hóa'
              }}
            </p>
          </div>
        </div>
        <div class="recommendations-grid">
          <CustomerProductCard
            v-for="{ product, reason } in recommendations"
            :key="product.id"
            :product="product"
            :reason="hasSignals ? reason : undefined"
          />
        </div>
      </div>
    </section>

    <section v-if="recentlyViewed.length > 0" class="page-section recommendations-section customer-recent-section">
      <div class="section-container">
        <div class="section-header">
          <h2>Sản Phẩm Bạn Đã Xem</h2>
        </div>
        <div class="customer-recent-strip">
          <CustomerProductCard v-for="p in recentlyViewed.slice(0, 8)" :key="p.id" :product="p" />
        </div>
      </div>
    </section>
  </div>
</template>
