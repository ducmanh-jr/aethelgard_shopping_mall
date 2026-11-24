<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import type { Product, Category } from '@/types';
import { productService } from '@/services/product.service';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/stores/toast';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton.vue';
import SellerProductCard from '@/components/seller/SellerProductCard.vue';
import SellerDrawer from '@/components/seller/SellerDrawer.vue';
import ProductFilters from '@/components/seller/ProductFilters.vue';
import HeroSection from '@/components/seller/HeroSection.vue';
import BrandCinematicShowcase from '@/components/seller/BrandCinematicShowcase.vue';
import ProductEditorModal from '@/components/seller/ProductEditorModal.vue';

function classifyProductType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('sunglass') || lower.includes('kính')) return 'sunglasses';
  if (/shoe|giày|loafer|sneaker|boot|bốt|sandal|dép|mule|heel|derby|oxford|clog|slide/i.test(lower)) return 'shoes';
  if (/bag|túi|tote|backpack|clutch|wallet|ví|đồ da/i.test(lower)) return 'bags';
  if (/quần|áo|jacket|t-shirt|shirt|dress|coat|pant|denim|blazer|hoodie|sweater|polo|skirt|vest/i.test(lower)) return 'apparel';
  return 'accessories';
}

function interleaveShowroomProducts(items: Product[]): Product[] {
  if (!items || items.length <= 1) return items;
  const groups: Record<string, Product[]> = { apparel: [], shoes: [], bags: [], sunglasses: [], accessories: [] };
  for (const item of items) {
    groups[classifyProductType(item.name)].push(item);
  }
  for (const key of Object.keys(groups)) groups[key].sort((a, b) => b.id - a.id);
  const order = ['apparel', 'shoes', 'bags', 'sunglasses', 'accessories'];
  const maxLen = Math.max(...order.map((k) => groups[k].length), 0);
  const result: Product[] = [];
  for (let i = 0; i < maxLen; i++) {
    for (const key of order) {
      if (i < groups[key].length) result.push(groups[key][i]);
    }
  }
  return result;
}

const router = useRouter();
const { user } = useAuth();
const { showToast } = useToast();
const { confirm } = useConfirmDialog();

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const isLoadingInitial = ref(true);
const categoryFilter = ref('');
const quickFilterType = ref('');
const minPrice = ref('');
const maxPrice = ref('');
const sortOrder = ref('newest');
const searchTerm = ref('');
const debouncedSearch = ref('');
const displayLimit = ref(48);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchTerm, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedSearch.value = val;
  }, 300);
});

const isDrawerOpen = ref(false);
const drawerProduct = ref<Product | null>(null);
const isEditorOpen = ref(false);
const editingProduct = ref<Product | null>(null);

const isSellerRole = computed(() => user.value?.role === 'Seller');
const isAdminRole = computed(() => user.value?.role === 'Admin');
const isManagement = computed(() => isSellerRole.value || isAdminRole.value);
const sellerTitle = computed(() =>
  isSellerRole.value ? user.value?.fullName || user.value?.email?.split('@')[0]?.toUpperCase() || '' : ''
);
const activeSellerId = computed(() =>
  isSellerRole.value && user.value?.userId && user.value.userId > 0 ? user.value.userId : undefined
);

watch(
  () => user.value?.role,
  (role) => {
    if (role === 'Customer') router.replace('/shop');
  },
  { immediate: true }
);

async function loadData() {
  isLoadingInitial.value = true;
  try {
    const [cats, res] = await Promise.all([
      productService.getCategories(),
      productService.getProducts({
        sellerId: activeSellerId.value,
        pageSize: activeSellerId.value ? 1000 : 10000,
      }),
    ]);
    if (cats?.length) categories.value = cats;
    if (res?.items) {
      const processed = interleaveShowroomProducts(res.items);
      products.value = processed;
      drawerProduct.value = processed[0] || null;
    }
  } catch {}
  isLoadingInitial.value = false;
}

onMounted(loadData);
watch(activeSellerId, loadData);

const filteredProducts = computed(() => {
  let list = [...products.value];
  if (categoryFilter.value) list = list.filter((p) => p.categoryId.toString() === categoryFilter.value);
  if (debouncedSearch.value.trim()) {
    const q = debouncedSearch.value.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }
  if (minPrice.value && !isNaN(Number(minPrice.value))) list = list.filter((p) => p.basePrice >= Number(minPrice.value));
  if (maxPrice.value && !isNaN(Number(maxPrice.value))) list = list.filter((p) => p.basePrice <= Number(maxPrice.value));

  if (quickFilterType.value === 'bestseller') list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
  else if (quickFilterType.value === 'discount') list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
  else if (sortOrder.value === 'price_asc') list.sort((a, b) => a.basePrice - b.basePrice);
  else if (sortOrder.value === 'price_desc') list.sort((a, b) => b.basePrice - a.basePrice);
  else list = interleaveShowroomProducts(list);

  return list;
});

watch([categoryFilter, debouncedSearch, minPrice, maxPrice, quickFilterType, sortOrder], () => {
  displayLimit.value = 48;
});

const visibleProducts = computed(() => filteredProducts.value.slice(0, displayLimit.value));
const categoriesWithCount = computed(() =>
  categories.value.map((cat) => ({
    ...cat,
    productCount: activeSellerId.value
      ? products.value.filter((p) => p.categoryId === cat.id).length
      : cat.productCount || products.value.filter((p) => p.categoryId === cat.id).length,
  }))
);
const totalCatalogCount = computed(() =>
  activeSellerId.value
    ? products.value.length
    : categories.value.reduce((sum, c) => sum + (c.productCount || 0), 0) || products.value.length
);

function scrollToCatalog() {
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openProductAction(product: Product) {
  if (isManagement.value) {
    drawerProduct.value = product;
    isDrawerOpen.value = true;
  } else {
    router.push(`/product-detail/${product.id}`);
  }
}

async function handleDeleteProduct(product: Product) {
  const ok = await confirm({
    title: 'Xóa Sản Phẩm',
    message: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`,
    confirmText: 'Xóa Sản Phẩm',
    cancelText: 'Hủy',
    tone: 'danger',
  });
  if (!ok) return;
  try {
    await productService.deleteProduct(product.id);
    products.value = products.value.filter((p) => p.id !== product.id);
    isDrawerOpen.value = false;
    showToast(`Đã xóa sản phẩm "${product.name}".`);
  } catch {
    showToast('Không thể xóa sản phẩm lúc này.', 'error');
  }
}

function handleEditorSuccess(saved: Product, isEdit: boolean) {
  if (isEdit) {
    products.value = products.value.map((p) => (p.id === saved.id ? saved : p));
    showToast(`Đã cập nhật "${saved.name}"!`);
  } else {
    products.value = [saved, ...products.value];
    showToast(`Đã niêm yết "${saved.name}" lên sàn!`);
  }
}

function resetFilters() {
  categoryFilter.value = '';
  quickFilterType.value = '';
  minPrice.value = '';
  maxPrice.value = '';
  sortOrder.value = 'newest';
  searchTerm.value = '';
}
</script>

<template>
  <div>
    <HeroSection v-model:search-term="searchTerm" :products="products" @scroll-to-catalog="scrollToCatalog" />

    <BrandCinematicShowcase
      :shop-name="isSellerRole ? (sellerTitle || 'Gian Hàng') : 'Aethelgard Luxury Mall'"
    />

    <section id="catalog" class="page-section shop-section">
      <main class="main-layout">
        <section class="catalog-section">
          <div class="catalog-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <div>
              <h2 id="catalog-title" class="text-xl sm:text-2xl font-bold text-slate-900">
                {{
                  isSellerRole && sellerTitle
                    ? `Gian Trưng Bày — ${sellerTitle}`
                    : isAdminRole
                    ? 'Quản Trị Sản Phẩm Toàn Sàn'
                    : 'Sản Phẩm Đang Niêm Yết Trên Sàn'
                }}
              </h2>
            </div>

            <div class="flex items-center gap-2">
              <button
                v-if="isSellerRole"
                type="button"
                class="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-200 transition-all cursor-pointer"
                @click="editingProduct = null; isEditorOpen = true"
              >
                <Plus class="w-4 h-4" />
                <span>Thêm Sản Phẩm Mới</span>
              </button>
            </div>
          </div>

          <ProductFilters
            v-model:category-filter="categoryFilter"
            v-model:quick-filter-type="quickFilterType"
            v-model:min-price="minPrice"
            v-model:max-price="maxPrice"
            v-model:sort-order="sortOrder"
            v-model:search-term="searchTerm"
            :categories="categoriesWithCount"
            :total-products-count="totalCatalogCount"
            :filtered-count="filteredProducts.length"
            @reset="resetFilters"
          />

          <div id="product-grid" class="product-grid">
            <template v-if="isLoadingInitial">
              <ProductCardSkeleton v-for="i in 8" :key="`skeleton-${i}`" />
            </template>
            <template v-else-if="visibleProducts.length > 0">
              <SellerProductCard
                v-for="p in visibleProducts"
                :key="p.id"
                :product="p"
                :is-seller="isSellerRole"
                @click="openProductAction"
              />
            </template>
            <div v-else class="col-span-full py-16 text-center text-slate-500">
              <p class="text-base font-semibold">Không tìm thấy sản phẩm phù hợp.</p>
              <button type="button" class="mt-3 px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer" @click="resetFilters">
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <div v-if="!isLoadingInitial && displayLimit < filteredProducts.length" class="flex justify-center mt-10 mb-6">
            <button
              type="button"
              class="px-7 py-3 rounded-full bg-white border border-slate-200 text-slate-800 text-sm font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
              @click="displayLimit += 48"
            >
              <span>Xem thêm sản phẩm</span>
              <span class="text-xs text-slate-400 font-semibold">
                (Đang xem {{ visibleProducts.length }} / {{ filteredProducts.length }})
              </span>
            </button>
          </div>
        </section>
      </main>
    </section>

    <SellerDrawer
      :is-open="isDrawerOpen"
      :product="drawerProduct"
      @close="isDrawerOpen = false"
      @show-toast="(msg) => showToast(msg)"
      @edit-product="(p) => { isDrawerOpen = false; editingProduct = p; isEditorOpen = true; }"
      @delete-product="handleDeleteProduct"
      @product-updated="(u) => { products = products.map((p) => (p.id === u.id ? u : p)); drawerProduct = u; }"
    />

    <ProductEditorModal
      :is-open="isEditorOpen"
      :initial-product="editingProduct"
      :categories="categories"
      @close="isEditorOpen = false"
      @success="handleEditorSuccess"
    />
  </div>
</template>
