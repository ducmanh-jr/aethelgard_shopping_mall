import { ref, watch } from 'vue';
import type { Product } from '@/types';

const WISHLIST_KEY = 'aethelgard_wishlist';
const RECENT_KEY = 'aethelgard_recently_viewed';
const MAX_RECENT = 12;

export type ProductSnapshot = Pick<
  Product,
  | 'id'
  | 'name'
  | 'slug'
  | 'sku'
  | 'categoryId'
  | 'categoryName'
  | 'collectionName'
  | 'basePrice'
  | 'originalPrice'
  | 'discountPercent'
  | 'imageUrl'
  | 'stockQuantity'
  | 'stockStatus'
  | 'rating'
  | 'reviewCount'
  | 'description'
>;

export const toSnapshot = (p: Product | ProductSnapshot): ProductSnapshot => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  sku: p.sku,
  categoryId: p.categoryId,
  categoryName: p.categoryName,
  collectionName: p.collectionName,
  basePrice: p.basePrice,
  originalPrice: p.originalPrice,
  discountPercent: p.discountPercent,
  imageUrl: p.imageUrl,
  stockQuantity: p.stockQuantity,
  stockStatus: p.stockStatus,
  rating: p.rating,
  reviewCount: p.reviewCount,
  description: (p.description || '').slice(0, 240),
});

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const wishlist = ref<ProductSnapshot[]>(readStorage<ProductSnapshot[]>(WISHLIST_KEY, []));
const recentlyViewed = ref<ProductSnapshot[]>(readStorage<ProductSnapshot[]>(RECENT_KEY, []));

watch(wishlist, (val) => writeStorage(WISHLIST_KEY, val), { deep: true });
watch(recentlyViewed, (val) => writeStorage(RECENT_KEY, val), { deep: true });

export function useShopper() {
  function isInWishlist(productId: number) {
    return wishlist.value.some((p) => p.id === productId);
  }

  function toggleWishlist(product: Product | ProductSnapshot) {
    const exists = wishlist.value.some((p) => p.id === product.id);
    wishlist.value = exists
      ? wishlist.value.filter((p) => p.id !== product.id)
      : [toSnapshot(product), ...wishlist.value];
    return !exists;
  }

  function removeFromWishlist(productId: number) {
    wishlist.value = wishlist.value.filter((p) => p.id !== productId);
  }

  function trackView(product: Product | ProductSnapshot) {
    if (!product || !product.id) return;
    recentlyViewed.value = [
      toSnapshot(product),
      ...recentlyViewed.value.filter((p) => p.id !== product.id),
    ].slice(0, MAX_RECENT);
  }

  return {
    wishlist,
    isInWishlist,
    toggleWishlist,
    removeFromWishlist,
    recentlyViewed,
    trackView,
  };
}
