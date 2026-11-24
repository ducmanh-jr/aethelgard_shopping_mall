<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Product } from '@/types';
import { useShopper, type ProductSnapshot } from '@/stores/shopper';
import { useToast } from '@/stores/toast';
import { formatVND } from '@/lib/utils';
import { FALLBACK_IMAGE } from '@/lib/constants';
import { extractBrand } from '@/lib/customer';

const props = defineProps<{
  product: Product | ProductSnapshot;
  reason?: string;
}>();

const router = useRouter();
const { isInWishlist, toggleWishlist } = useShopper();
const { showToast } = useToast();

const liked = computed(() => isInWishlist(props.product.id));

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

const brand = computed(() => parsed.value.brand || extractBrand(props.product));
const hasDiscount = computed(() => (props.product.discountPercent || 0) > 0);
const showOriginal = computed(
  () => !!props.product.originalPrice && props.product.originalPrice > props.product.basePrice
);
const outOfStock = computed(
  () =>
    (props.product.stockQuantity ?? 1) <= 0 ||
    props.product.stockStatus === 'OUT_OF_STOCK' ||
    props.product.stockStatus === 'OutOfStock'
);

function handleWishlist() {
  const added = toggleWishlist(props.product);
  showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã gỡ khỏi danh sách yêu thích');
}

function goShopProfile() {
  const prodSellerId = 'sellerId' in props.product ? (props.product as Product).sellerId : undefined;
  const shopUrl = prodSellerId
    ? `/shop-profile?sellerId=${prodSellerId}&brand=${encodeURIComponent(brand.value)}`
    : `/shop-profile?brand=${encodeURIComponent(brand.value)}`;
  router.push(shopUrl);
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <div
    class="product-card customer-product-card group"
    role="link"
    tabindex="0"
    :aria-label="`Xem chi tiết ${product.name}`"
    @click="router.push(`/product-detail/${product.id}`)"
    @keydown.enter="router.push(`/product-detail/${product.id}`)"
  >
    <div class="product-card-top flex justify-between items-center">
      <span class="category-tag-top">{{ product.categoryName || 'Thời Trang' }}</span>
      <div class="flex items-center gap-1.5">
        <span v-if="hasDiscount" class="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          -{{ product.discountPercent }}%
        </span>
        <button
          type="button"
          :class="['customer-wishlist-btn', liked ? 'active' : '']"
          :aria-label="liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'"
          :title="liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'"
          @click.stop.prevent="handleWishlist"
        >
          {{ liked ? '♥' : '♡' }}
        </button>
      </div>
    </div>

    <div class="product-img-box">
      <img :src="product.imageUrl || FALLBACK_IMAGE" :alt="product.name" loading="lazy" @error="onImgError" />
      <span v-if="outOfStock" class="customer-soldout-tag">Tạm hết hàng</span>
    </div>

    <div class="product-info">
      <div
        v-if="brand"
        class="product-brand inline-flex items-center gap-1 hover:text-sky-600 transition-colors cursor-pointer"
        :title="`Xem gian hàng chính hãng ${brand}`"
        @click.stop="goShopProfile"
      >
        <span>{{ brand }}</span>
        <span class="text-[10px] text-slate-400">↗</span>
      </div>
      <h3 class="product-title" :title="product.name">{{ parsed.title || product.name }}</h3>
      <div class="product-rating-row">
        <span>★ {{ (product.rating || 0).toFixed(1) }}</span>
        <span class="review-count">({{ product.reviewCount || 0 }} đánh giá)</span>
      </div>
      <div class="product-price-row customer-price-row">
        <span v-if="showOriginal" class="customer-price-original">{{ formatVND(product.originalPrice!) }}</span>
        <span class="price-amount">{{ formatVND(product.basePrice) }}</span>
      </div>
      <div class="product-seller-footer">
        <span v-if="reason" class="customer-reason-tag">✦ {{ reason }}</span>
        <span v-else class="customer-auth-tag">✓ Chính hãng 100%</span>
        <span class="card-seller-cta">Xem chi tiết &rarr;</span>
      </div>
    </div>
  </div>
</template>
