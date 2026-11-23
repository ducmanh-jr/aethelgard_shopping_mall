<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Eye } from 'lucide-vue-next';
import type { Product } from '@/types';
import { productService } from '@/services/product.service';
import { useCart } from '@/stores/cart';
import { useToast } from '@/stores/toast';
import { useAuth } from '@/stores/auth';
import { useCatalog } from '@/composables/useCatalog';
import { useShopper } from '@/stores/shopper';
import Modal from '@/components/ui/Modal.vue';
import AIStylistPanel from '@/components/customer/AIStylistPanel.vue';
import { formatVND, getInitials } from '@/lib/utils';
import { FALLBACK_IMAGE } from '@/lib/constants';
import {
  buildSpecs,
  colorToHex,
  extractBrand,
  findVariant,
  FREE_SHIPPING_THRESHOLD,
  getProductOptions,
  similarProducts,
} from '@/lib/customer';

type TabKey = 'details' | 'materials' | 'sizefit' | 'shipping';

interface LocalReview {
  id: string;
  productId: number;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  shopReply?: string | null;
  shopReplyAt?: string | null;
  liked?: boolean;
}

const REVIEWS_KEY = 'aethelgard_reviews';
const SAME_DAY_CUTOFF_HOUR = 17;

function secondsUntilCutoff(now: Date) {
  const cutoff = new Date(now);
  cutoff.setHours(SAME_DAY_CUTOFF_HOUR, 0, 0, 0);
  if (now >= cutoff) cutoff.setDate(cutoff.getDate() + 1);
  return Math.max(0, Math.floor((cutoff.getTime() - now.getTime()) / 1000));
}

function isFootwear(p: Product) {
  const text = `${p.categoryName || ''} ${p.name}`.toLowerCase();
  return /giày|giay|sneaker|boot|loafer|sandal|dép|pump|shoe/.test(text);
}

const route = useRoute();
const productId = computed(() => Number(route.params.id));

const { user } = useAuth();
const { showToast } = useToast();
const { addToCart, setIsCheckoutOpen } = useCart();
const { isInWishlist, toggleWishlist, trackView } = useShopper();
const { products: catalog } = useCatalog();

const product = ref<Product | null>(null);
const isLoading = ref(true);
const notFound = ref(false);

const activeImage = ref('');
const activeColor = ref('');
const activeSize = ref('');
const qty = ref(1);
const activeTab = ref<TabKey>('details');
const isZoomOpen = ref(false);
const secondsLeft = ref(secondsUntilCutoff(new Date()));

const reviews = ref<LocalReview[]>([]);
const customerNameInput = ref('');
const reviewRating = ref(5);
const reviewComment = ref('');
const selectedStarFilter = ref<number | null>(null);
const isSubmittingReview = ref(false);

async function loadProduct(id: number) {
  if (!id) {
    notFound.value = true;
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  notFound.value = false;
  try {
    const p = await productService.getProductById(id);
    product.value = p;
    const opts = getProductOptions(p.variants);
    activeImage.value = p.galleryUrls?.[0] || p.imageUrl || FALLBACK_IMAGE;
    activeColor.value = opts.colors.find((c) => c.stock > 0)?.value || opts.colors[0]?.value || '';
    activeSize.value = '';
    qty.value = 1;
    activeTab.value = 'details';
    trackView(p);
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function loadReviews(id: number) {
  if (!id) return;
  try {
    const dbReviews = await productService.getProductReviews(id);
    if (dbReviews && Array.isArray(dbReviews) && dbReviews.length > 0) {
      reviews.value = dbReviews.map((r: any) => ({
        id: String(r.id),
        productId: r.productId,
        author: r.customerName || 'Khách Hàng Aethelgard',
        rating: r.rating || 5,
        comment: r.comment || '',
        createdAt: r.createdAt || new Date().toISOString(),
        isVerifiedPurchase: r.isVerifiedPurchase ?? true,
        helpfulCount: r.helpfulCount || 0,
        shopReply: r.shopReply || null,
        shopReplyAt: r.shopReplyAt || null,
        liked: false,
      }));
      return;
    }
  } catch {}
  try {
    const all: LocalReview[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    reviews.value = all.filter((r) => r.productId === id);
  } catch {
    reviews.value = [];
  }
}

watch(
  productId,
  (id) => {
    loadProduct(id);
    loadReviews(id);
  },
  { immediate: true }
);

watch(
  () => user.value?.fullName,
  (name) => {
    if (name && !customerNameInput.value) customerNameInput.value = name;
  },
  { immediate: true }
);

let cutoffTimer: ReturnType<typeof setInterval> | null = null;

function handleCatalogUpdate() {
  if (!productId.value) return;
  productService
    .getProductById(productId.value)
    .then((fresh) => {
      if (fresh) product.value = fresh;
    })
    .catch(() => {});
}

onMounted(() => {
  cutoffTimer = setInterval(() => {
    secondsLeft.value = secondsUntilCutoff(new Date());
  }, 1000);
  window.addEventListener('aethelgard:catalog-updated', handleCatalogUpdate);
});

onUnmounted(() => {
  if (cutoffTimer) clearInterval(cutoffTimer);
  window.removeEventListener('aethelgard:catalog-updated', handleCatalogUpdate);
});

const options = computed(() => getProductOptions(product.value?.variants));
const selectedVariant = computed(() =>
  findVariant(product.value?.variants, activeSize.value || undefined, activeColor.value || undefined)
);
const gallery = computed(() => {
  if (!product.value) return [];
  const list = [...(product.value.galleryUrls || [])];
  if (product.value.imageUrl && !list.includes(product.value.imageUrl)) list.unshift(product.value.imageUrl);
  return list.length > 0 ? list : [FALLBACK_IMAGE];
});
const related = computed(() => (product.value ? similarProducts(catalog.value, product.value, 4) : []));
const brand = computed(() => (product.value ? extractBrand(product.value) : ''));
const brandProductCount = computed(() =>
  brand.value ? catalog.value.filter((p) => extractBrand(p) === brand.value).length : 0
);
const isSeller = computed(() => user.value?.role === 'Seller');
const isAdmin = computed(() => user.value?.role === 'Admin');
const isManagement = computed(() => isSeller.value || isAdmin.value);
const isOwnProduct = computed(
  () => isSeller.value && !!product.value && product.value.sellerId === (user.value?.id || user.value?.userId)
);
const availableStock = computed(() =>
  selectedVariant.value && (activeSize.value || !options.value.sizes.length)
    ? selectedVariant.value.stockQuantity
    : product.value?.stockQuantity ?? 0
);
const isOutOfStock = computed(() => (product.value?.stockQuantity ?? 0) <= 0);
const needsSize = computed(() => options.value.sizes.length > 0 && !activeSize.value);

watch(availableStock, (stock) => {
  if (stock > 0 && qty.value > stock) qty.value = stock;
});

const reviewStats = computed(() => {
  const total = reviews.value.length;
  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  reviews.value.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    counts[star] = (counts[star] || 0) + 1;
    sum += r.rating || 5;
  });
  const avg = total > 0 ? (sum / total).toFixed(1) : (product.value?.rating || 5).toFixed(1);
  return {
    total,
    avg,
    counts,
    percents: {
      5: total > 0 ? Math.round((counts[5] / total) * 100) : 0,
      4: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
      3: total > 0 ? Math.round((counts[3] / total) * 100) : 0,
      2: total > 0 ? Math.round((counts[2] / total) * 100) : 0,
      1: total > 0 ? Math.round((counts[1] / total) * 100) : 0,
    } as Record<number, number>,
  };
});

const filteredReviews = computed(() =>
  selectedStarFilter.value === null
    ? reviews.value
    : reviews.value.filter((r) => Math.round(r.rating || 5) === selectedStarFilter.value)
);

const isWishlist = computed(() => (product.value ? isInWishlist(product.value.id) : false));
const showOriginal = computed(
  () => !!product.value?.originalPrice && product.value.originalPrice > product.value.basePrice
);
const discount = computed(() => {
  if (!product.value) return 0;
  if (product.value.discountPercent && product.value.discountPercent > 0) return product.value.discountPercent;
  if (showOriginal.value && product.value.originalPrice) {
    return Math.round((1 - product.value.basePrice / product.value.originalPrice) * 100);
  }
  return 0;
});

const timerText = computed(() => {
  const h = String(Math.floor(secondsLeft.value / 3600)).padStart(2, '0');
  const m = String(Math.floor((secondsLeft.value % 3600) / 60)).padStart(2, '0');
  const s = String(secondsLeft.value % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
});

const fullStars = computed(() => Math.round(parseFloat(reviewStats.value.avg) || 0));
const starText = computed(() => '★★★★★'.slice(0, fullStars.value) + '☆☆☆☆☆'.slice(0, 5 - fullStars.value));
const footwear = computed(() => (product.value ? isFootwear(product.value) : false));

const shopProfileUrl = computed(() => {
  if (product.value?.sellerId) {
    return `/shop-profile?sellerId=${product.value.sellerId}&brand=${encodeURIComponent(brand.value || '')}`;
  }
  return brand.value ? `/shop-profile?brand=${encodeURIComponent(brand.value)}` : '/shop-profile';
});

function validateSelection() {
  if (isSeller.value) {
    showToast('Tài khoản Người bán chỉ xem trước giao diện và không thể đặt hàng.');
    return false;
  }
  if (isOutOfStock.value) {
    showToast('Sản phẩm tạm hết hàng');
    return false;
  }
  if (needsSize.value) {
    showToast('Vui lòng chọn kích cỡ trước khi thêm vào giỏ');
    document.getElementById('size-selector')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  if (availableStock.value <= 0) {
    showToast('Phân loại bạn chọn đã hết hàng, vui lòng chọn phân loại khác');
    return false;
  }
  return true;
}

function putIntoCart() {
  if (!product.value) return '';
  const specs = buildSpecs(activeColor.value || undefined, activeSize.value || undefined);
  addToCart({ ...product.value, stockQuantity: availableStock.value }, qty.value, specs);
  return specs;
}

function handleAddToCart() {
  if (!validateSelection() || !product.value) return;
  const specs = putIntoCart();
  showToast(`Đã thêm ${qty.value} × ${product.value.name} (${specs}) vào giỏ hàng!`);
}

function handleBuyNow() {
  if (!validateSelection()) return;
  putIntoCart();
  setIsCheckoutOpen(true);
}

function handleWishlistToggle() {
  if (!product.value) return;
  const added = toggleWishlist(product.value);
  showToast(added ? 'Đã thêm vào danh sách yêu thích!' : 'Đã xóa khỏi danh sách yêu thích!');
}

function increaseQty() {
  if (availableStock.value > 0 && qty.value >= availableStock.value) {
    showToast(`Chỉ còn ${availableStock.value} sản phẩm trong kho`);
    return;
  }
  qty.value += 1;
}

async function submitReview() {
  if (!product.value) return;
  const nameToUse = (customerNameInput.value.trim() || user.value?.fullName || 'Khách Hàng Aethelgard').trim();
  if (reviewComment.value.trim().length < 10) {
    showToast('Nhận xét cần tối thiểu 10 ký tự');
    return;
  }
  isSubmittingReview.value = true;
  try {
    const created = await productService.addProductReview(product.value.id, {
      customerName: nameToUse,
      rating: reviewRating.value,
      comment: reviewComment.value.trim(),
    });
    const newRev: LocalReview = {
      id: String(created?.id || Date.now()),
      productId: product.value.id,
      author: created?.customerName || nameToUse,
      rating: created?.rating || reviewRating.value,
      comment: created?.comment || reviewComment.value.trim(),
      createdAt: created?.createdAt || new Date().toISOString(),
      isVerifiedPurchase: created?.isVerifiedPurchase ?? true,
      helpfulCount: created?.helpfulCount ?? 0,
      shopReply: created?.shopReply ?? null,
      shopReplyAt: created?.shopReplyAt ?? null,
      liked: false,
    };
    reviews.value = [newRev, ...reviews.value];
    reviewComment.value = '';
    reviewRating.value = 5;
    showToast('Cảm ơn bạn đã gửi đánh giá vào hệ thống sàn Aethelgard!');
    productService
      .getProductById(product.value.id)
      .then((fresh) => {
        if (fresh) product.value = fresh;
      })
      .catch(() => {});
  } catch {
    const fallbackRev: LocalReview = {
      id: `${Date.now()}`,
      productId: product.value.id,
      author: nameToUse,
      rating: reviewRating.value,
      comment: reviewComment.value.trim(),
      createdAt: new Date().toISOString(),
      isVerifiedPurchase: true,
      helpfulCount: 0,
      shopReply: null,
      shopReplyAt: null,
      liked: false,
    };
    try {
      const all: LocalReview[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
      localStorage.setItem(REVIEWS_KEY, JSON.stringify([fallbackRev, ...all]));
    } catch {}
    reviews.value = [fallbackRev, ...reviews.value];
    reviewComment.value = '';
    reviewRating.value = 5;
    showToast('Đã lưu nhận xét của bạn vào hệ thống!');
  } finally {
    isSubmittingReview.value = false;
  }
}

async function handleVoteHelpful(reviewId: string) {
  if (!product.value) return;
  const numId = parseInt(reviewId, 10);
  const target = reviews.value.find((r) => r.id === reviewId);
  if (!target) return;
  if (target.liked) {
    showToast('Bạn đã ghi nhận đánh giá này hữu ích rồi!');
    return;
  }
  reviews.value = reviews.value.map((r) =>
    r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1, liked: true } : r
  );
  showToast('Cảm ơn bạn đã bình chọn nhận xét hữu ích!');
  if (!isNaN(numId)) {
    try {
      await productService.voteReviewHelpful(product.value.id, numId);
    } catch {}
  }
}

function toggleRelatedWishlist(p: Product) {
  const added = toggleWishlist(p);
  showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã gỡ khỏi danh sách yêu thích');
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <div v-if="isLoading" class="profile-page-wrapper">
    <section class="product-hero-grid">
      <div class="h-[480px] w-full rounded-lg bg-slate-200/80 animate-pulse" />
      <div class="space-y-4">
        <div class="h-6 w-1/3 rounded bg-slate-200/80 animate-pulse" />
        <div class="h-10 w-3/4 rounded bg-slate-200/80 animate-pulse" />
        <div class="h-8 w-1/2 rounded bg-slate-200/80 animate-pulse" />
        <div class="h-24 w-full rounded bg-slate-200/80 animate-pulse" />
        <div class="h-12 w-full rounded bg-slate-200/80 animate-pulse" />
      </div>
    </section>
  </div>

  <div v-else-if="notFound || !product" class="profile-page-wrapper">
    <div class="customer-empty-state customer-empty-page">
      <h1 class="product-detail-title">Không tìm thấy sản phẩm</h1>
      <p>Sản phẩm có thể đã ngừng kinh doanh hoặc đường dẫn không chính xác.</p>
      <router-link to="/shop" class="customer-link-btn">← Quay lại cửa hàng</router-link>
    </div>
  </div>

  <div v-else class="profile-page-wrapper">
    <nav class="breadcrumb-nav">
      <router-link to="/shop">Cửa Hàng</router-link>
      <span class="breadcrumb-separator">/</span>
      <template v-if="product.categoryName">
        <router-link :to="`/shop?category=${product.categoryId}`">{{ product.categoryName }}</router-link>
        <span class="breadcrumb-separator">/</span>
      </template>
      <span class="breadcrumb-current">{{ product.name }}</span>
    </nav>

    <section class="product-hero-grid">
      <div class="product-gallery-container">
        <div class="thumbnail-strip">
          <div
            v-for="(src, i) in gallery"
            :key="src + i"
            :class="['thumb-item', activeImage === src ? 'active' : '']"
            style="cursor: pointer"
            @click="activeImage = src"
          >
            <img :src="src" :alt="`${product.name} - góc ${i + 1}`" @error="onImgError" />
          </div>
        </div>

        <div class="main-image-viewport">
          <span class="gallery-badge">Chính hãng • {{ product.collectionName || 'Bộ sưu tập Aethelgard' }}</span>
          <img id="main-product-img" :src="activeImage || FALLBACK_IMAGE" :alt="product.name" @error="onImgError" />
          <button class="btn-zoom-preview" title="Xem ảnh lớn" type="button" @click="isZoomOpen = true">🔍</button>
        </div>
      </div>

      <div class="product-config-panel">
        <div
          class="seller-mini-card"
          style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 12px 16px;
            margin-bottom: 20px;
          "
        >
          <router-link :to="shopProfileUrl" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit">
            <div
              style="
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: #0f172a;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 1rem;
              "
            >
              {{ getInitials(brand || 'Aethelgard Mall') }}
            </div>
            <div>
              <div style="font-weight: 800; font-size: 0.92rem; display: flex; align-items: center; gap: 6px">
                <span>{{ brand ? `Cửa hàng chính hãng ${brand}` : 'Boutique Aethelgard' }}</span>
                <span style="background: #dc2626; color: white; font-size: 0.68rem; font-weight: 900; padding: 2px 6px; border-radius: 4px">
                  CHÍNH HÃNG
                </span>
              </div>
              <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px">
                {{ brandProductCount > 0 ? `${brandProductCount} sản phẩm trên sàn` : 'Gian hàng đối tác' }} • Bảo đảm hàng chính hãng
              </div>
            </div>
          </router-link>
          <router-link
            :to="shopProfileUrl"
            style="
              padding: 8px 16px;
              background: #ffffff;
              border: 1px solid var(--border);
              border-radius: var(--radius-pill);
              font-weight: 700;
              font-size: 0.82rem;
              color: var(--text-main);
              text-decoration: none;
              white-space: nowrap;
            "
          >
            Xem Gian Hàng →
          </router-link>
        </div>

        <span class="category-tag-pill">{{ product.categoryName || 'Thời Trang' }} • {{ product.collectionName || 'Chính Hãng' }}</span>
        <h1 class="product-detail-title">{{ product.name }}</h1>

        <div class="product-rating-badge-row">
          <span class="stars-gold">{{ starText }}</span>
          <span class="rating-score-text">{{ reviewStats.avg }}</span>
          <a href="#reviews-anchor" class="reviews-counter-link">({{ product.reviewCount || 0 }} đánh giá từ khách hàng)</a>
        </div>

        <div class="product-price-block">
          <span class="price-current">{{ formatVND(product.basePrice) }}</span>
          <span v-if="showOriginal && product.originalPrice" class="price-original">{{ formatVND(product.originalPrice) }}</span>
          <span v-if="discount > 0" class="discount-badge-pill">-{{ discount }}%</span>
        </div>

        <div class="delivery-countdown-box">
          <span>
            ⚡ Đặt hàng trong <span id="flash-timer" class="timer-val">{{ timerText }}</span> để được boutique xử lý & bàn giao vận chuyển ngay trong ngày!
          </span>
        </div>

        <p class="product-short-summary">{{ product.description }}</p>

        <div v-if="options.colors.length > 0" class="selector-group">
          <div class="selector-header">
            <span>Màu sắc: <strong id="current-color-name">{{ activeColor || 'Chưa chọn' }}</strong></span>
          </div>
          <div class="color-swatches-list">
            <button
              v-for="c in options.colors"
              :key="c.value"
              type="button"
              :class="['color-swatch-btn', activeColor === c.value ? 'active' : '']"
              :style="{ backgroundColor: colorToHex(c.value), opacity: c.stock > 0 ? 1 : 0.35 }"
              :title="c.stock > 0 ? c.value : `${c.value} (hết hàng)`"
              :aria-label="`Màu ${c.value}`"
              @click="activeColor = c.value"
            />
          </div>
        </div>

        <div v-if="options.sizes.length > 0" id="size-selector" class="selector-group">
          <div class="selector-header">
            <span>
              Chọn kích cỡ{{ activeSize ? `: ${activeSize}` : '' }}
              <em v-if="needsSize" class="customer-required-hint"> (bắt buộc)</em>
            </span>
            <span class="size-guide-link" style="cursor: pointer" @click="activeTab = 'sizefit'">📏 Bảng kích cỡ (Size Guide)</span>
          </div>
          <div class="size-options-grid">
            <button
              v-for="s in options.sizes"
              :key="s.value"
              type="button"
              :class="['size-btn', activeSize === s.value ? 'active' : '']"
              :disabled="(findVariant(product.variants, s.value, activeColor || undefined)?.stockQuantity ?? s.stock) <= 0"
              :style="(findVariant(product.variants, s.value, activeColor || undefined)?.stockQuantity ?? s.stock) <= 0 ? { opacity: 0.4, textDecoration: 'line-through', cursor: 'not-allowed' } : undefined"
              @click="activeSize = s.value"
            >
              {{ s.value }}
            </button>
          </div>
        </div>

        <p :class="['customer-stock-line', isOutOfStock ? 'out' : availableStock <= 10 ? 'low' : '']">
          {{
            isOutOfStock
              ? 'Tạm hết hàng'
              : needsSize
              ? `Còn ${product.stockQuantity} sản phẩm (chọn size để xem tồn kho chính xác)`
              : availableStock <= 10
              ? `Chỉ còn ${availableStock} sản phẩm — đặt ngay kẻo lỡ`
              : `Còn hàng (${availableStock} sản phẩm)`
          }}
        </p>

        <div v-if="isManagement" class="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3 my-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
                <Eye class="w-4 h-4 text-white" />
              </span>
              <div>
                <h4 class="text-sm font-bold text-slate-900 m-0">
                  {{ isAdmin ? 'Góc Người Mua (Chế độ giám sát)' : 'Góc Người Mua (Chế độ xem trước)' }}
                </h4>
                <span class="text-[11px] text-slate-500 font-medium">
                  {{ isAdmin ? 'Tài khoản Quản trị viên sàn' : 'Tài khoản Người bán' }} ({{ user?.fullName || user?.email }})
                </span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white tracking-wider uppercase">
              {{ isAdmin ? 'Giám Sát' : 'Chỉ Xem Trước' }}
            </span>
          </div>
          <p class="text-xs text-slate-500 leading-relaxed m-0">
            {{
              isAdmin
                ? 'Đây là giao diện hiển thị thực tế với khách hàng. Tài khoản Quản trị viên không có giỏ hàng và không được phép đặt hàng.'
                : 'Đây là giao diện hiển thị thực tế với khách hàng. Tài khoản Người bán không có giỏ hàng và không được phép đặt hàng.'
            }}
          </p>
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span v-if="isOwnProduct" class="text-xs font-semibold text-slate-900">✓ Sản phẩm thuộc gian hàng của bạn</span>
            <span v-else class="text-xs text-slate-500">
              {{ isAdmin ? 'Sản phẩm này thuộc quyền quản lý của một thương hiệu trên sàn.' : 'Sản phẩm này thuộc gian hàng đối tác khác trên sàn.' }}
            </span>
            <router-link
              v-if="isOwnProduct || isAdmin"
              to="/inventory"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all"
            >
              ⚙ Quản lý tồn kho &rarr;
            </router-link>
          </div>
        </div>

        <template v-else>
          <div class="action-buttons-stack">
            <div class="qty-stepper">
              <button id="btn-qty-minus" class="qty-step-btn" aria-label="Giảm số lượng" type="button" @click="qty = Math.max(1, qty - 1)">-</button>
              <span id="qty-display" class="qty-display-val">{{ qty }}</span>
              <button id="btn-qty-plus" class="qty-step-btn" aria-label="Tăng số lượng" type="button" @click="increaseQty">+</button>
            </div>

            <button
              id="btn-add-cart"
              class="btn-add-to-cart-primary"
              :disabled="isOutOfStock"
              :style="isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : undefined"
              type="button"
              @click="handleAddToCart"
            >
              <span>{{ isOutOfStock ? 'Tạm Hết Hàng' : 'Thêm Vào Giỏ Hàng' }}</span>
            </button>

            <button
              id="btn-wishlist"
              :class="['btn-wishlist-toggle', isWishlist ? 'active' : '']"
              :title="isWishlist ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'"
              type="button"
              @click="handleWishlistToggle"
            >
              {{ isWishlist ? '♥' : '♡' }}
            </button>
          </div>

          <button
            id="btn-buy-now"
            class="btn-buy-now-accent"
            :disabled="isOutOfStock"
            :style="isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : undefined"
            type="button"
            @click="handleBuyNow"
          >
            Mua Ngay Với 1 Bước
          </button>
        </template>

        <div class="trust-badges-grid">
          <div class="trust-item">
            <div class="trust-icon-title"><span>🚚</span><span>Giao Hàng Miễn Phí</span></div>
            <span class="trust-subtext">Đơn hàng trên {{ formatVND(FREE_SHIPPING_THRESHOLD) }} toàn quốc</span>
          </div>
          <div class="trust-item">
            <div class="trust-icon-title"><span>🔄</span><span>Đổi Trả Dễ Dàng</span></div>
            <span class="trust-subtext">30 ngày đổi size miễn phí tận nơi</span>
          </div>
          <div class="trust-item">
            <div class="trust-icon-title"><span>🛡</span><span>Chính Hãng 100%</span></div>
            <span class="trust-subtext">Cam kết 100% hàng chính hãng</span>
          </div>
        </div>
      </div>
    </section>

    <section class="product-tabs-section">
      <div class="tabs-nav-bar">
        <button :class="['tab-nav-btn', activeTab === 'details' ? 'active' : '']" type="button" @click="activeTab = 'details'">Chi Tiết Sản Phẩm</button>
        <button :class="['tab-nav-btn', activeTab === 'materials' ? 'active' : '']" type="button" @click="activeTab = 'materials'">Chất Liệu & Bảo Quản</button>
        <button :class="['tab-nav-btn', activeTab === 'sizefit' ? 'active' : '']" type="button" @click="activeTab = 'sizefit'">Thông Số Form Dáng</button>
        <button :class="['tab-nav-btn', activeTab === 'shipping' ? 'active' : '']" type="button" @click="activeTab = 'shipping'">Vận Chuyển & Bảo Hành</button>
      </div>

      <div v-if="activeTab === 'details'" id="tab-details" class="tab-pane-content active">
        <div class="tab-split-grid">
          <div>
            <p class="tab-text-lead">{{ product.description }}</p>
            <ul class="tab-feature-bullets">
              <li v-if="brand"><span class="bullet-icon">✓</span><span><strong>Thương hiệu:</strong> {{ brand }}</span></li>
              <li v-if="product.collectionName"><span class="bullet-icon">✓</span><span><strong>Bộ sưu tập:</strong> {{ product.collectionName }}</span></li>
              <li><span class="bullet-icon">✓</span><span><strong>Danh mục:</strong> {{ product.categoryName || 'Thời trang cao cấp' }}</span></li>
              <li v-if="product.countryOfOrigin"><span class="bullet-icon">✓</span><span><strong>Xuất xứ:</strong> {{ product.countryOfOrigin }}</span></li>
              <li><span class="bullet-icon">✓</span><span><strong>Mã sản phẩm (SKU):</strong> {{ selectedVariant?.sku || product.sku }}</span></li>
            </ul>
          </div>
          <div class="tab-visual-banner">
            <img :src="gallery[1] || gallery[0]" :alt="`Chi tiết ${product.name}`" @error="onImgError" />
            <div class="tab-visual-overlay">
              <h4>TAY NGHỀ CHẾ TÁC {{ (brand || 'Aethelgard').toUpperCase() }}</h4>
              <p>{{ product.collectionName || 'Phân phối chính hãng tại Aethelgard Mall' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'materials'" id="tab-materials" class="tab-pane-content active">
        <p class="tab-text-lead">
          <strong>Thành phần / Chất liệu:</strong> {{ product.material || 'Đang cập nhật từ thương hiệu' }}
          <br />
          <strong>Hướng dẫn bảo quản:</strong>
        </p>
        <ul class="tab-feature-bullets">
          <template v-if="product.careInstructions">
            <li v-for="line in product.careInstructions.split(/[.;\n]/).map((s) => s.trim()).filter(Boolean)" :key="line">
              <span class="bullet-icon">✓</span> {{ line }}
            </li>
          </template>
          <template v-else>
            <li><span class="bullet-icon">✓</span> Bảo quản nơi khô ráo, tránh ánh nắng trực tiếp và độ ẩm cao.</li>
            <li><span class="bullet-icon">✓</span> Vệ sinh theo hướng dẫn trên nhãn mác của thương hiệu.</li>
            <li><span class="bullet-icon">✓</span> Cất trong túi chống bụi đi kèm khi không sử dụng.</li>
          </template>
        </ul>
      </div>

      <div v-if="activeTab === 'sizefit'" id="tab-sizefit" class="tab-pane-content active">
        <template v-if="footwear">
          <p class="tab-text-lead">Quy đổi size giày theo chiều dài bàn chân:</p>
          <ul class="tab-feature-bullets">
            <li><span class="bullet-icon">✓</span> <strong>EU 38–39:</strong> Chiều dài chân 24.0 – 24.8 cm</li>
            <li><span class="bullet-icon">✓</span> <strong>EU 40–41:</strong> Chiều dài chân 25.0 – 26.0 cm</li>
            <li><span class="bullet-icon">✓</span> <strong>EU 42–43:</strong> Chiều dài chân 26.5 – 27.5 cm</li>
            <li><span class="bullet-icon">✓</span> <strong>EU 44–45:</strong> Chiều dài chân 28.0 – 29.0 cm</li>
          </ul>
        </template>
        <template v-else>
          <p class="tab-text-lead">Gợi ý chọn size dựa theo chiều cao và cân nặng chuẩn:</p>
          <ul class="tab-feature-bullets">
            <li><span class="bullet-icon">✓</span> <strong>Size S:</strong> Chiều cao 1m55 - 1m65 | Cân nặng 48kg - 58kg</li>
            <li><span class="bullet-icon">✓</span> <strong>Size M:</strong> Chiều cao 1m65 - 1m75 | Cân nặng 58kg - 70kg</li>
            <li><span class="bullet-icon">✓</span> <strong>Size L:</strong> Chiều cao 1m72 - 1m80 | Cân nặng 70kg - 82kg</li>
            <li><span class="bullet-icon">✓</span> <strong>Size XL/XXL:</strong> Chiều cao trên 1m80 | Cân nặng 82kg - 100kg</li>
          </ul>
        </template>
      </div>

      <div v-if="activeTab === 'shipping'" id="tab-shipping" class="tab-pane-content active">
        <p class="tab-text-lead">Chính sách vận chuyển & đổi trả minh bạch tại Aethelgard Mall:</p>
        <ul class="tab-feature-bullets">
          <li><span class="bullet-icon">✓</span> <strong>Phí vận chuyển:</strong> Miễn phí cho đơn trên {{ formatVND(FREE_SHIPPING_THRESHOLD) }}, các đơn khác đồng giá 50.000 đ.</li>
          <li><span class="bullet-icon">✓</span> <strong>Thời gian giao:</strong> Dự kiến 3 ngày làm việc, theo dõi hành trình trong mục Đơn Hàng Của Tôi.</li>
          <li><span class="bullet-icon">✓</span> <strong>Đồng kiểm khi nhận hàng:</strong> Bạn được kiểm tra hàng trước khi thanh toán (COD).</li>
          <li><span class="bullet-icon">✓</span> <strong>Đổi hàng miễn phí:</strong> Hỗ trợ đổi size tận nhà trong vòng 30 ngày.</li>
        </ul>
      </div>
    </section>

    <AIStylistPanel :product="product" :catalog="catalog" />

    <section id="reviews-anchor" class="reviews-section-wrapper">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 28px">
        <h2 class="reviews-section-header" style="margin: 0">Đánh Giá & Nhận Xét Từ Khách Hàng</h2>
        <span style="font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 6px">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block" />
          100% Đánh giá từ người mua hàng thực tế đã xác thực
        </span>
      </div>

      <div class="reviews-breakdown-grid">
        <div class="overall-score-card">
          <div class="big-rating-number">{{ reviewStats.avg }}<span> / 5</span></div>
          <div class="stars-gold">{{ starText }}</div>
          <div class="review-verified-tag">Dựa trên {{ reviewStats.total }} lượt đánh giá thực tế từ khách hàng</div>

          <div class="rating-histogram" style="margin: 20px 0; padding: 16px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9">
            <div
              v-for="stars in [5, 4, 3, 2, 1]"
              :key="stars"
              :style="{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.84rem',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                background: selectedStarFilter === stars ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
              }"
              @click="selectedStarFilter = selectedStarFilter === stars ? null : stars"
            >
              <span style="width: 42px; font-weight: 600">{{ stars }} <span style="color: #d97706">★</span></span>
              <div class="histo-bar" style="flex: 1; height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden">
                <div :style="{ width: `${reviewStats.percents[stars] || 0}%`, height: '100%', background: '#d97706', borderRadius: '999px' }" />
              </div>
              <span style="width: 46px; text-align: right; color: #64748b; font-size: 0.78rem">
                {{ reviewStats.counts[stars] || 0 }} ({{ reviewStats.percents[stars] || 0 }}%)
              </span>
            </div>
          </div>

          <form class="customer-review-form" @submit.prevent="submitReview">
            <label class="customer-form-label" style="font-weight: 700; display: block; margin-bottom: 6px">Chia sẻ trải nghiệm của bạn</label>
            <div style="margin-bottom: 12px">
              <div class="customer-star-input" role="radiogroup" aria-label="Chọn số sao">
                <button
                  v-for="n in [1, 2, 3, 4, 5]"
                  :key="n"
                  type="button"
                  :class="n <= reviewRating ? 'on' : ''"
                  @click="reviewRating = n"
                >
                  ★
                </button>
              </div>
            </div>
            <div style="margin-bottom: 12px">
              <input v-model="customerNameInput" type="text" class="form-control" placeholder="Tên hiển thị của bạn" maxlength="50" />
            </div>
            <div style="margin-bottom: 12px">
              <textarea v-model="reviewComment" class="form-control" rows="3" placeholder="Nhận xét tối thiểu 10 ký tự..." />
            </div>
            <button
              type="submit"
              class="customer-ai-submit"
              :disabled="isSubmittingReview"
              style="width: 100%; padding: 10px 16px; border-radius: 8px; font-weight: 700; background: #18181b; color: #fff; border: none; cursor: pointer"
            >
              {{ isSubmittingReview ? 'Đang gửi đánh giá...' : '✦ Gửi Đánh Giá Ngay' }}
            </button>
          </form>
        </div>

        <div class="customer-reviews-feed">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9">
            <div style="display: flex; gap: 6px; flex-wrap: wrap">
              <button
                type="button"
                :style="{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: selectedStarFilter === null ? '#18181b' : '#e2e8f0',
                  background: selectedStarFilter === null ? '#18181b' : '#ffffff',
                  color: selectedStarFilter === null ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }"
                @click="selectedStarFilter = null"
              >
                Tất cả ({{ reviewStats.total }})
              </button>
              <button
                v-for="s in [5, 4, 3, 2, 1]"
                :key="s"
                type="button"
                :style="{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: selectedStarFilter === s ? '#d97706' : '#e2e8f0',
                  background: selectedStarFilter === s ? '#d97706' : '#ffffff',
                  color: selectedStarFilter === s ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }"
                @click="selectedStarFilter = selectedStarFilter === s ? null : s"
              >
                {{ s }} ★ ({{ reviewStats.counts[s] || 0 }})
              </button>
            </div>
          </div>

          <div v-if="filteredReviews.length === 0" class="review-testimonial-card customer-review-empty" style="text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 12px">
            <p class="review-comment-text" style="color: #64748b; margin: 0">
              {{ selectedStarFilter !== null ? `Chưa có đánh giá nào đạt ${selectedStarFilter} sao.` : 'Chưa có nhận xét nào cho sản phẩm này.' }}
            </p>
          </div>

          <div
            v-for="r in filteredReviews"
            v-else
            :key="r.id"
            class="review-testimonial-card"
            style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px"
          >
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px">
              <div style="display: flex; align-items: center; gap: 12px">
                <div style="width: 42px; height: 42px; border-radius: 50%; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700">
                  {{ getInitials(r.author) }}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a">{{ r.author }}</div>
                  <span style="font-size: 0.74rem; color: #059669; font-weight: 600">✓ Đã mua hàng tại Aethelgard</span>
                </div>
              </div>
              <span style="font-size: 0.8rem; color: #94a3b8">{{ new Date(r.createdAt).toLocaleDateString('vi-VN') }}</span>
            </div>
            <div style="color: #d97706; margin-bottom: 8px">{{ '★★★★★'.slice(0, r.rating) }}{{ '☆☆☆☆☆'.slice(0, 5 - r.rating) }}</div>
            <p style="font-size: 0.92rem; line-height: 1.6; color: #334155; margin: 0 0 12px 0">"{{ r.comment }}"</p>
            <button
              type="button"
              :style="{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: r.liked ? '#10b981' : '#e2e8f0',
                background: r.liked ? '#ecfdf5' : '#ffffff',
                color: r.liked ? '#059669' : '#64748b',
                cursor: 'pointer',
              }"
              @click="handleVoteHelpful(r.id)"
            >
              <span>👍 Hữu ích</span>
              <span v-if="(r.helpfulCount || 0) > 0" style="font-weight: 700">({{ r.helpfulCount }})</span>
            </button>
            <div v-if="r.shopReply" style="margin-top: 14px; padding: 12px 16px; background: #f8fafc; border-left: 3px solid #d97706; border-radius: 0 8px 8px 0">
              <div style="font-weight: 700; color: #92400e; margin-bottom: 4px">👑 Phản hồi từ {{ brand || 'Aethelgard Boutique' }}</div>
              <p style="margin: 0; color: #334155">{{ r.shopReply }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="related.length > 0" class="related-products-section">
      <div class="related-section-header">
        <h2>Sản Phẩm Tương Tự</h2>
        <router-link :to="`/shop?category=${product.categoryId}`" class="view-all-link">
          <span>Xem tất cả {{ product.categoryName || 'sản phẩm' }}</span>
          <span>→</span>
        </router-link>
      </div>
      <div class="related-grid">
        <router-link
          v-for="p in related"
          :key="p.id"
          :to="`/product-detail/${p.id}`"
          class="related-card"
          style="text-decoration: none; color: inherit"
        >
          <div class="related-img-box">
            <img :src="p.imageUrl || FALLBACK_IMAGE" :alt="p.name" loading="lazy" @error="onImgError" />
            <button
              class="btn-card-wishlist"
              type="button"
              @click.stop.prevent="toggleRelatedWishlist(p)"
            >
              {{ isInWishlist(p.id) ? '♥' : '♡' }}
            </button>
          </div>
          <div class="related-info">
            <div class="related-title">{{ p.name }}</div>
            <div class="related-price-row">
              <span class="related-price">{{ formatVND(p.basePrice) }}</span>
              <span class="stars-gold" style="font-size: 0.82rem">★ {{ (p.rating || 0).toFixed(1) }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </section>

    <Modal :is-open="isZoomOpen" size="xl" :title="product.name" @close="isZoomOpen = false">
      <img :src="activeImage || FALLBACK_IMAGE" :alt="product.name" class="customer-zoom-img" />
      <div class="customer-zoom-thumbs">
        <button v-for="(src, i) in gallery" :key="src + i" type="button" :class="activeImage === src ? 'active' : ''" @click="activeImage = src">
          <img :src="src" :alt="`Ảnh ${i + 1}`" />
        </button>
      </div>
    </Modal>
  </div>
</template>
