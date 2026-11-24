<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ShoppingBag, Trash2 } from 'lucide-vue-next';
import type { Product } from '@/types';
import { useShopper } from '@/stores/shopper';
import { useCatalog } from '@/composables/useCatalog';
import { useCart } from '@/stores/cart';
import { useToast } from '@/stores/toast';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import CustomerProductCard from '@/components/customer/CustomerProductCard.vue';
import ShopSubnav from '@/components/customer/ShopSubnav.vue';
import { formatVND } from '@/lib/utils';
import { FALLBACK_IMAGE } from '@/lib/constants';
import { recommendProducts } from '@/lib/customer';

const router = useRouter();
const { wishlist, removeFromWishlist, recentlyViewed } = useShopper();
const { products, isLoading } = useCatalog();
const { addToCart, setIsCartOpen } = useCart();
const { showToast } = useToast();
const { confirm } = useConfirmDialog();

const items = computed(() => {
  const byId = new Map(products.value.map((p) => [p.id, p]));
  return wishlist.value.map((w) => ({ saved: w, live: byId.get(w.id) as Product | undefined }));
});

const suggestions = computed(() =>
  recommendProducts(products.value, { viewed: recentlyViewed.value, wishlist: wishlist.value }, 4)
);

function handleAdd(live: Product | undefined, id: number) {
  if (!live) {
    router.push(`/product-detail/${id}`);
    return;
  }
  if ((live.variants?.length || 0) > 0) {
    showToast('Vui lòng chọn size / màu trước khi thêm vào giỏ');
    router.push(`/product-detail/${id}`);
    return;
  }
  if ((live.stockQuantity ?? 0) <= 0) {
    showToast('Sản phẩm tạm hết hàng');
    return;
  }
  addToCart(live, 1, 'Tiêu chuẩn');
  showToast(`Đã thêm ${live.name} vào giỏ hàng`);
  setIsCartOpen(true);
}

function handleAddAllToCart() {
  let addedCount = 0;
  items.value.forEach(({ live }) => {
    if (live && (live.stockQuantity ?? 0) > 0 && (!live.variants || live.variants.length === 0)) {
      addToCart(live, 1, 'Tiêu chuẩn');
      addedCount++;
    }
  });
  if (addedCount > 0) {
    showToast(`Đã thêm ${addedCount} sản phẩm sẵn sàng vào giỏ hàng!`);
    setIsCartOpen(true);
  } else {
    showToast('Các sản phẩm yêu cầu chọn size / màu cụ thể trước khi thêm.');
  }
}

async function handleClearAll() {
  const ok = await confirm({
    title: 'Xóa Danh Sách Yêu Thích',
    message: 'Bạn có chắc chắn muốn xóa toàn bộ sản phẩm khỏi danh sách yêu thích?',
    confirmText: 'Xóa Tất Cả',
    cancelText: 'Giữ Lại',
    tone: 'danger',
  });
  if (!ok) return;
  wishlist.value.forEach((w) => removeFromWishlist(w.id));
  showToast('Đã xóa toàn bộ danh sách yêu thích.');
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <div class="customer-page">
    <div class="customer-page-head">
      <div>
        <h1 class="customer-page-title">Danh Sách Yêu Thích</h1>
        <p class="customer-page-sub">
          {{
            wishlist.length > 0
              ? `${wishlist.length} sản phẩm bạn đã lưu — giá và tồn kho được cập nhật theo thời gian thực.`
              : 'Thả tim ♡ trên sản phẩm bất kỳ để lưu lại và nhận gợi ý cá nhân hóa.'
          }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="wishlist.length > 0">
          <button
            type="button"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            @click="handleAddAllToCart"
          >
            <ShoppingBag class="w-3.5 h-3.5" />
            <span>Thêm Tất Cả Vào Giỏ</span>
          </button>
          <button
            type="button"
            class="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Xóa toàn bộ"
            @click="handleClearAll"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </template>
        <ShopSubnav />
      </div>
    </div>

    <div v-if="wishlist.length === 0" class="customer-empty-state">
      <p>Danh sách yêu thích đang trống.</p>
      <router-link to="/shop" class="customer-link-btn">Khám phá sản phẩm →</router-link>
    </div>

    <div v-else class="customer-wishlist-list">
      <div v-for="{ saved, live } in items" :key="saved.id" class="customer-wishlist-row">
        <router-link :to="`/product-detail/${saved.id}`" class="customer-wishlist-thumb">
          <img :src="live?.imageUrl || saved.imageUrl || FALLBACK_IMAGE" :alt="saved.name" @error="onImgError" />
        </router-link>
        <div class="customer-wishlist-info">
          <span class="category-tag-top">{{ saved.categoryName || 'Thời Trang' }}</span>
          <router-link :to="`/product-detail/${saved.id}`" class="customer-wishlist-name">
            {{ saved.name }}
          </router-link>
          <div class="customer-wishlist-meta">
            <strong>{{ formatVND(live?.basePrice ?? saved.basePrice) }}</strong>
            <span v-if="live && live.basePrice < saved.basePrice" class="customer-price-drop">
              ↓ Giảm {{ formatVND(saved.basePrice - live.basePrice) }} kể từ khi bạn lưu
            </span>
            <span v-if="!isLoading && !live" class="customer-muted">Sản phẩm không còn niêm yết</span>
            <span v-if="live && (live.stockQuantity ?? 0) <= 0" class="customer-muted">Tạm hết hàng</span>
          </div>
        </div>
        <div class="customer-wishlist-actions">
          <button
            type="button"
            class="customer-ai-submit"
            :disabled="live ? (live.stockQuantity ?? 0) <= 0 : false"
            @click="handleAdd(live, saved.id)"
          >
            {{ live && (live.variants?.length || 0) > 0 ? 'Chọn phân loại' : 'Thêm vào giỏ' }}
          </button>
          <button
            type="button"
            class="customer-text-btn"
            @click="removeFromWishlist(saved.id); showToast('Đã gỡ khỏi danh sách yêu thích')"
          >
            Gỡ bỏ
          </button>
        </div>
      </div>
    </div>

    <section v-if="suggestions.length > 0" class="customer-wishlist-suggest">
      <h2>Có Thể Bạn Cũng Thích</h2>
      <div class="recommendations-grid">
        <CustomerProductCard v-for="{ product, reason } in suggestions" :key="product.id" :product="product" :reason="reason" />
      </div>
    </section>
  </div>
</template>
