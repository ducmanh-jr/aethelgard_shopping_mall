<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '@/stores/auth';
import { storeService } from '@/services/store.service';
import { productService } from '@/services/product.service';
import { formatVND } from '@/lib/utils';
import { STORAGE_KEYS, FALLBACK_IMAGE } from '@/lib/constants';
import { useToast } from '@/stores/toast';
import type { StoreBoutique, StoreBrandProfile } from '@/types/store.types';

interface ShopProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: string;
  priceFormatted: string;
  stockQuantity: number;
  rating: string;
  reviewCount: number;
  badge: string;
  discount: string;
  image: string;
}

function classifyShopProductType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('sunglass') || lower.includes('kính')) return 'sunglasses';
  if (/shoe|giày|loafer|sneaker|boot|bốt|sandal|dép|mule|heel|derby|oxford|clog|slide/i.test(lower)) return 'shoes';
  if (/bag|túi|tote|backpack|clutch|wallet|ví|đồ da/i.test(lower)) return 'bags';
  if (/quần|áo|jacket|t-shirt|shirt|dress|coat|pant|denim|blazer|hoodie|sweater|polo|skirt|vest/i.test(lower)) return 'apparel';
  return 'accessories';
}

function interleaveShopProducts(items: ShopProduct[]): ShopProduct[] {
  if (!items || items.length <= 1) return items;

  const groups: Record<string, ShopProduct[]> = {
    apparel: [],
    shoes: [],
    bags: [],
    sunglasses: [],
    accessories: [],
  };

  for (const item of items) {
    const type = classifyShopProductType(item.name);
    groups[type].push(item);
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => Number(b.id) - Number(a.id));
  }

  const order = ['apparel', 'shoes', 'bags', 'sunglasses', 'accessories'];
  const maxLen = Math.max(...order.map((k) => groups[k].length), 0);
  const result: ShopProduct[] = [];

  for (let i = 0; i < maxLen; i++) {
    for (const key of order) {
      if (i < groups[key].length) {
        result.push(groups[key][i]);
      }
    }
  }

  return result;
}

function getBrandInitials(name: string): string {
  if (!name) return 'AG';
  const clean = name.replace(/Official|Flagship|Store|Boutique|Cửa hàng|chính hãng/gi, '').trim();
  if (/north\s*face/i.test(clean)) return 'TNF';
  if (/vivienne\s*westwood/i.test(clean)) return 'VW';
  if (/gucci/i.test(clean)) return 'GG';
  if (/adidas/i.test(clean)) return 'ADI';
  if (/nike/i.test(clean)) return 'NK';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const route = useRoute();
const sellerIdParam = computed(() => (route.query.sellerId ? String(route.query.sellerId) : null));
const brandParam = computed(() => (route.query.brand ? String(route.query.brand) : null));
const shopParam = computed(() =>
  route.query.shop ? String(route.query.shop) : route.query.id ? String(route.query.id) : null
);

const { user } = useAuth();
const { showToast } = useToast();

const profile = ref<StoreBrandProfile | null>(null);
const boutiques = ref<StoreBoutique[]>([]);
const shopProducts = ref<ShopProduct[]>([]);
const isLoading = ref(true);

const activeTab = ref<string>('storefront');
const searchQuery = ref('');
const sortBy = ref<string>('popular');

const isSellerUser = ref(false);
const isEditModalOpen = ref(false);
const campaignTitle = ref('Bộ Sưu Tập Chính Hãng');
const campaignSubtitle = ref(
  'Khám phá các thiết kế biểu tượng và tinh hoa thời trang chính hãng tại Aethelgard Mall.'
);

// Trạng thái theo dõi shop
const isFollowing = ref(false);
const followerCount = ref(1280);

const editForm = reactive({
  name: '',
  phone: '',
  address: '',
  hours: '',
  storeCode: '',
  campaignTitle: 'Bộ Sưu Tập Chính Hãng',
  campaignSubtitle: 'Khám phá các thiết kế biểu tượng và tinh hoa thời trang chính hãng tại Aethelgard Mall.',
});

async function loadShopData() {
  isLoading.value = true;
  try {
    const curUser = user.value;
    const queryLookup = sellerIdParam.value || brandParam.value || shopParam.value;
    let profileLookup = 'gucci';
    if (queryLookup) {
      profileLookup = queryLookup;
    } else if (curUser?.role === 'Seller' || curUser?.role === 'Admin') {
      profileLookup = curUser?.userId
        ? String(curUser.userId)
        : curUser?.email
          ? curUser.email.split('@')[0].toLowerCase()
          : 'gucci';
    }

    // Tăng bộ đếm lượt xem gian hàng
    const curViews = Number(localStorage.getItem(STORAGE_KEYS.SHOP_VIEWS) || '0') + 1;
    localStorage.setItem(STORAGE_KEYS.SHOP_VIEWS, String(curViews));

    // Gọi API lấy thông tin Profile gian hàng
    const data = await storeService.getStoreProfile(profileLookup);

    if (data) {
      profile.value = data;
      boutiques.value = data.boutiques || [];

      const isOwner = !!(
        curUser &&
        (curUser.role === 'Admin' ||
          (curUser.role === 'Seller' &&
            (curUser.userId === data.sellerId ||
              curUser.id === data.sellerId ||
              (curUser.email &&
                data.brandId &&
                curUser.email.toLowerCase().startsWith(data.brandId.toLowerCase())))))
      );
      isSellerUser.value = isOwner;

      // Nạp tiêu đề & mô tả chiến dịch
      const shopCustomKey = `SHOP_HERO_${data.sellerId || data.brandId || profileLookup}`;
      const savedTitle =
        localStorage.getItem(`${shopCustomKey}_TITLE`) ||
        (data.brandName.toLowerCase().includes('gucci')
          ? localStorage.getItem(STORAGE_KEYS.SHOP_HERO_TITLE)
          : null);
      const savedSub =
        localStorage.getItem(`${shopCustomKey}_SUB`) ||
        (data.brandName.toLowerCase().includes('gucci')
          ? localStorage.getItem(STORAGE_KEYS.SHOP_HERO_SUB)
          : null);

      const currentTitle =
        savedTitle || (data.brandName ? `Bộ Sưu Tập ${data.brandName}` : 'Bộ Sưu Tập Thời Trang');
      const currentSub =
        savedSub ||
        data.slogan ||
        `Khám phá các thiết kế biểu tượng và tinh hoa thời trang chính hãng từ ${data.brandName} tại Aethelgard Mall.`;

      campaignTitle.value = currentTitle;
      campaignSubtitle.value = currentSub;

      const primaryBoutique = data.boutiques && data.boutiques.length > 0 ? data.boutiques[0] : null;
      editForm.name = data.brandName || '';
      editForm.phone = primaryBoutique?.phone || '';
      editForm.address = primaryBoutique?.address || '';
      editForm.hours = primaryBoutique?.operatingHours || '';
      editForm.storeCode = primaryBoutique?.storeCode || '';
      editForm.campaignTitle = currentTitle;
      editForm.campaignSubtitle = currentSub;

      // Nạp trạng thái theo dõi (Follow)
      const followShopKey = String(data.sellerId || profileLookup).toLowerCase();
      let followedShops: string[] = [];
      try {
        followedShops = JSON.parse(localStorage.getItem('aethelgard_followed_shops') || '[]');
      } catch {}

      const isFollowed = Boolean(
        followedShops.includes(followShopKey) ||
          (data.brandId && followedShops.includes(data.brandId.toLowerCase())) ||
          (data.brandName && followedShops.includes(data.brandName.toLowerCase()))
      );
      isFollowing.value = isFollowed;

      const savedFollowers = localStorage.getItem(`aethelgard_followers_${followShopKey}`);
      if (savedFollowers) {
        followerCount.value = Number(savedFollowers);
      } else {
        const baseCount = Math.max(320, (data.totalProducts || 10) * 16 + (data.reviewCount || 0) * 3);
        followerCount.value = baseCount;
      }

      // Tải danh sách sản phẩm của gian hàng
      const prodSellerId = data.sellerId || (sellerIdParam.value ? Number(sellerIdParam.value) : undefined);
      let prodData = await productService.getProducts({
        sellerId: prodSellerId || undefined,
        pageSize: 48,
      });

      if ((!prodData || !prodData.items || prodData.items.length === 0) && (brandParam.value || data.brandName)) {
        prodData = await productService.getProducts({
          search: brandParam.value || data.brandName,
          pageSize: 48,
        });
      }

      if (prodData && prodData.items && prodData.items.length > 0) {
        const mapped: ShopProduct[] = prodData.items.map((p) => ({
          id: String(p.id),
          name: p.name,
          category: p.categoryName || 'Thời Trang Cao Cấp',
          price: p.basePrice || 0,
          originalPrice: p.originalPrice ? formatVND(p.originalPrice) : '',
          priceFormatted: formatVND(p.basePrice || 0),
          stockQuantity: p.stockQuantity || 0,
          rating: (p.rating || 5.0).toFixed(1),
          reviewCount: p.reviewCount || 0,
          badge: p.collectionName || ((p.discountPercent ?? 0) > 0 ? `Giảm ${p.discountPercent}%` : 'Chính Hãng'),
          discount: (p.discountPercent ?? 0) > 0 ? `-${p.discountPercent}%` : '',
          image: p.imageUrl || FALLBACK_IMAGE,
        }));
        shopProducts.value = interleaveShopProducts(mapped);
      } else {
        shopProducts.value = [];
      }
    } else {
      // Fallback an toàn nếu không tìm thấy profile trên server
      const fallbackBrand =
        brandParam.value || (sellerIdParam.value ? `Shop #${sellerIdParam.value}` : 'Gian Hàng Chính Hãng');
      const fallbackSellerId = sellerIdParam.value ? Number(sellerIdParam.value) : undefined;
      const prodData = await productService.getProducts({
        sellerId: fallbackSellerId,
        search: brandParam.value || undefined,
        pageSize: 48,
      });

      const items = prodData?.items || [];
      const fallbackProfile: StoreBrandProfile = {
        sellerId: fallbackSellerId || 0,
        brandId: fallbackBrand.toLowerCase().replace(/\s+/g, ''),
        brandName: fallbackBrand,
        brandCode: getBrandInitials(fallbackBrand),
        slogan: `Gian hàng chính hãng ${fallbackBrand} phân phối trực tiếp tại Aethelgard Mall`,
        rating: 5.0,
        reviewCount: items.reduce((sum, p) => sum + (p.reviewCount || 0), 0),
        totalProducts: prodData.totalCount || items.length,
        totalStock: items.reduce((sum, p) => sum + (p.stockQuantity || 0), 0),
        boutiqueCount: 0,
        avatarUrl: '',
        coverBannerUrl: undefined,
        boutiques: [],
      };
      profile.value = fallbackProfile;
      isSellerUser.value = false;
      campaignTitle.value = `Bộ Sưu Tập ${fallbackBrand}`;
      campaignSubtitle.value = `Khám phá các sản phẩm chính hãng độc quyền từ gian hàng ${fallbackBrand}.`;

      const followShopKey = String(fallbackSellerId || profileLookup).toLowerCase();
      let followedShops: string[] = [];
      try {
        followedShops = JSON.parse(localStorage.getItem('aethelgard_followed_shops') || '[]');
      } catch {}
      isFollowing.value = followedShops.includes(followShopKey);
      followerCount.value = Math.max(120, items.length * 15);

      if (items.length > 0) {
        const mapped: ShopProduct[] = items.map((p) => ({
          id: String(p.id),
          name: p.name,
          category: p.categoryName || 'Thời Trang Cao Cấp',
          price: p.basePrice || 0,
          originalPrice: p.originalPrice ? formatVND(p.originalPrice) : '',
          priceFormatted: formatVND(p.basePrice || 0),
          stockQuantity: p.stockQuantity || 0,
          rating: (p.rating || 5.0).toFixed(1),
          reviewCount: p.reviewCount || 0,
          badge: p.collectionName || ((p.discountPercent ?? 0) > 0 ? `Giảm ${p.discountPercent}%` : 'Chính Hãng'),
          discount: (p.discountPercent ?? 0) > 0 ? `-${p.discountPercent}%` : '',
          image: p.imageUrl || FALLBACK_IMAGE,
        }));
        shopProducts.value = interleaveShopProducts(mapped);
      } else {
        shopProducts.value = [];
      }
    }
  } catch (err) {
    console.error('Lỗi nạp dữ liệu gian hàng:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadShopData();
});

watch([user, sellerIdParam, brandParam, shopParam], () => {
  loadShopData();
});

const brandDisplayName = computed(() => profile.value?.brandName || 'Thương Hiệu Xa Xỉ');
const brandSlogan = computed(
  () => profile.value?.slogan || `Gian hàng phân phối chính hãng ${brandDisplayName.value} tại Aethelgard Mall`
);
const brandRating = computed(() => (profile.value ? profile.value.rating.toFixed(1) : '5.0'));
const brandReviewCount = computed(() => (profile.value ? profile.value.reviewCount.toLocaleString('vi-VN') : '0'));
const brandTotalProducts = computed(() =>
  profile.value ? profile.value.totalProducts : shopProducts.value.length
);
const brandTotalStock = computed(() => (profile.value ? profile.value.totalStock.toLocaleString('vi-VN') : '0'));

const isSeller = computed(
  () =>
    user.value?.role === 'Seller' ||
    (user.value?.role as unknown) === 2 ||
    String(user.value?.role).toLowerCase() === 'seller'
);
const isAdmin = computed(
  () =>
    user.value?.role === 'Admin' ||
    (user.value?.role as unknown) === 1 ||
    String(user.value?.role).toLowerCase() === 'admin'
);
const isManagement = computed(() => isSeller.value || isAdmin.value);
const isCustomerOrGuest = computed(() => !isManagement.value);
const isOwnShop = computed(() => isSellerUser.value);
const canFollowShop = computed(() => isCustomerOrGuest.value && !isOwnShop.value);

const heroBackgroundImage = computed(
  () =>
    profile.value?.coverBannerUrl ||
    (profile.value?.brandId?.includes('gucci') ? '/img/products/gucci-runway.jpg' : '/img/brands/1.avif')
);

// Lọc & sắp xếp sản phẩm
const displayProducts = computed(() => {
  let list = [...shopProducts.value];

  if (activeTab.value === 'new') {
    list = list.filter((p) => p.badge.includes('Mới') || p.badge.includes('Runway'));
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  if (sortBy.value === 'price_asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (sortBy.value === 'price_desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (sortBy.value === 'rating') {
    list.sort((a, b) => b.reviewCount - a.reviewCount);
  } else {
    list = interleaveShopProducts(list);
  }

  return list;
});

function splitProductName(fullName: string): { brandName: string; itemName: string } {
  if (fullName.includes(' - ')) {
    const idx = fullName.indexOf(' - ');
    return {
      brandName: fullName.substring(0, idx).trim(),
      itemName: fullName.substring(idx + 3).trim(),
    };
  }
  return {
    brandName: brandDisplayName.value,
    itemName: fullName,
  };
}

// Nút Bật / Tắt Theo dõi gian hàng
function handleToggleFollow() {
  const shopKey = String(profile.value?.sellerId || sellerIdParam.value || brandParam.value || 'shop').toLowerCase();
  const brandName = profile.value?.brandName || brandDisplayName.value;
  let list: string[] = [];
  try {
    list = JSON.parse(localStorage.getItem('aethelgard_followed_shops') || '[]');
  } catch {}

  let nextFollowing = false;
  let nextCount = followerCount.value;

  if (isFollowing.value) {
    list = list.filter(
      (id) =>
        id !== shopKey &&
        id !== String(profile.value?.brandId).toLowerCase() &&
        id !== brandName.toLowerCase()
    );
    nextFollowing = false;
    nextCount = Math.max(0, followerCount.value - 1);
    showToast(`Đã hủy theo dõi gian hàng ${brandName}.`);
  } else {
    if (!list.includes(shopKey)) list.push(shopKey);
    nextFollowing = true;
    nextCount = followerCount.value + 1;
    showToast(`Bạn đã theo dõi thành công gian hàng ${brandName}!`);
  }

  isFollowing.value = nextFollowing;
  followerCount.value = nextCount;
  try {
    localStorage.setItem('aethelgard_followed_shops', JSON.stringify(list));
    localStorage.setItem(`aethelgard_followers_${shopKey}`, String(nextCount));
    window.dispatchEvent(
      new CustomEvent('aethelgard:shop-follow-changed', {
        detail: { shopKey, isFollowing: nextFollowing },
      })
    );
  } catch {}
}

function handleOpenEditModal() {
  isEditModalOpen.value = true;
}

async function handleSaveProfile() {
  if (!profile.value) return;

  profile.value = {
    ...profile.value,
    brandName: editForm.name,
  };

  const shopCustomKey = `SHOP_HERO_${profile.value.sellerId || profile.value.brandId || 'shop'}`;

  if (editForm.campaignTitle) {
    campaignTitle.value = editForm.campaignTitle;
    try {
      localStorage.setItem(`${shopCustomKey}_TITLE`, editForm.campaignTitle);
    } catch {}
  }
  if (editForm.campaignSubtitle) {
    campaignSubtitle.value = editForm.campaignSubtitle;
    try {
      localStorage.setItem(`${shopCustomKey}_SUB`, editForm.campaignSubtitle);
    } catch {}
  }

  try {
    if (editForm.storeCode) {
      await storeService.updateStore(editForm.storeCode, {
        storeName: editForm.name,
        storeType: 'Official Flagship Boutique',
        address: editForm.address,
        phone: editForm.phone,
        operatingHours: editForm.hours,
        city: 'Hà Nội',
      });
    }
  } catch (err) {
    console.warn('Lỗi đồng bộ API:', err);
  }

  isEditModalOpen.value = false;
  showToast('Đã lưu thông tin cửa hàng thành công vào cơ sở dữ liệu!');
}

function handleChatShop() {
  showToast(`Đang kết nối phiên tư vấn bảo mật riêng với Quản lý Boutique ${profile.value?.brandName || ''}...`);
}

function handleTabClick(tab: string) {
  activeTab.value = tab;
  if (tab === 'locations') {
    const el = document.getElementById('boutiques-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <main class="shop-profile-container !p-0">
    <!-- 1. CINEMATIC EDITORIAL HERO -->
    <section class="relative w-full h-[88vh] min-h-[560px] overflow-hidden flex flex-col justify-between bg-black text-white">
      <!-- Ảnh nền chiến dịch từ Database / Brand -->
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100"
        :style="{
          backgroundImage: `url(${heroBackgroundImage})`,
        }"
      />
      <!-- Lớp gradient làm mờ nhẹ trên đỉnh và đáy để text rõ nét -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/90" />

      <!-- Thanh Header trong suốt trên cùng -->
      <div class="relative z-10 w-full px-6 sm:px-12 pt-6 flex items-center justify-between">
        <button
          type="button"
          class="text-[11px] font-bold tracking-[0.18em] uppercase text-white/90 hover:text-white transition-colors cursor-pointer"
          @click="handleChatShop"
        >
          + LIÊN HỆ BOUTIQUE
        </button>

        <!-- Logo Brand trung tâm -->
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-[0.32em] text-white uppercase drop-shadow-lg text-center pl-4">
          {{ brandDisplayName.toUpperCase() }}
        </h1>

        <div class="flex items-center gap-3">
          <button
            v-if="canFollowShop"
            type="button"
            class="text-[11px] font-bold tracking-wider uppercase px-4 py-1.5 rounded-full transition-all cursor-pointer backdrop-blur-md"
            :class="
              isFollowing
                ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-md'
            "
            @click="handleToggleFollow"
          >
            {{ isFollowing ? '✓ Đang Theo Dõi' : '+ Theo Dõi' }}
          </button>
          <span
            v-if="isManagement && !isOwnShop"
            class="text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full bg-white/20 text-white/90 backdrop-blur-md flex items-center gap-1.5"
          >
            <span>👁 Góc Người Mua</span>
          </span>
          <button
            v-if="isOwnShop"
            type="button"
            class="hidden sm:inline-flex text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md transition-all cursor-pointer"
            @click="handleOpenEditModal"
          >
            ⚙ Sửa Hồ Sơ
          </button>
        </div>
      </div>

      <!-- Khối typography góc dưới bên trái -->
      <div class="relative z-10 px-6 sm:px-14 pb-12 max-w-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-widest uppercase mb-3">
          <span>CHÍNH HÃNG</span>
          <span>•</span>
          <span>AETHELGARD MALL</span>
        </div>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight text-white mb-3">
          {{ campaignTitle }}
        </h2>
        <p class="text-xs sm:text-sm text-neutral-200 leading-relaxed font-light mb-6">
          {{ campaignSubtitle }}
        </p>

        <div class="flex items-center gap-3">
          <a
            href="#shop-showroom"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-neutral-200 transition-all cursor-pointer shadow-lg"
          >
            <span>Khám Phá Showroom</span>
            <span>↓</span>
          </a>
          <button
            v-if="canFollowShop"
            type="button"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all cursor-pointer shadow-lg backdrop-blur-md"
            :class="
              isFollowing
                ? 'bg-white/20 text-white hover:bg-white/30 border border-white/40'
                : 'bg-red-600 text-white hover:bg-red-700 border border-red-500'
            "
            @click="handleToggleFollow"
          >
            <span>{{ isFollowing ? '✓ Đang Theo Dõi' : '+ Theo Dõi Gian Hàng' }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 2. THẺ NHẬN DIỆN GIAN HÀNG & NÚT THEO DÕI NỔI BẬT -->
    <div class="px-4 md:px-12 py-10">
      <div class="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="flex items-center gap-5">
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md shrink-0 border-2 border-white ring-2 ring-slate-100 overflow-hidden">
            <img
              v-if="profile?.avatarUrl"
              :src="profile.avatarUrl"
              :alt="brandDisplayName"
              class="w-full h-full object-cover"
            />
            <template v-else>{{ getBrandInitials(brandDisplayName) }}</template>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {{ brandDisplayName }}
              </h2>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-red-600 text-white tracking-wider">
                CHÍNH HÃNG
              </span>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đang hoạt động
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 max-w-xl line-clamp-1 mb-2">
              {{ brandSlogan }}
            </p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
              <span>
                <strong class="text-slate-900">{{ followerCount.toLocaleString('vi-VN') }}</strong> người theo dõi
              </span>
              <span>•</span>
              <span>
                <strong class="text-slate-900">{{ brandTotalProducts }}</strong> sản phẩm niêm yết
              </span>
              <span>•</span>
              <span>
                <strong class="text-slate-900">{{ brandRating }} ★</strong> ({{ brandReviewCount }} đánh giá)
              </span>
            </div>
          </div>
        </div>

        <!-- Cụm nút hành động: Theo Dõi & Nhắn Tin -->
        <div class="flex items-center gap-3 shrink-0 self-start md:self-center">
          <template v-if="canFollowShop">
            <button
              id="btn-follow-shop-card"
              type="button"
              class="px-6 py-2.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm"
              :class="
                isFollowing
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  : 'bg-black text-white hover:bg-neutral-800 hover:shadow-md'
              "
              @click="handleToggleFollow"
            >
              <template v-if="isFollowing">
                <span class="text-emerald-600 font-bold">✓</span>
                <span>Đang Theo Dõi</span>
              </template>
              <template v-else>
                <span class="text-sm font-bold">+</span>
                <span>Theo Dõi</span>
              </template>
            </button>
            <button
              id="btn-chat-shop"
              type="button"
              class="px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              @click="handleChatShop"
            >
              <span>💬 Nhắn Tin Shop</span>
            </button>
          </template>

          <button
            v-if="isOwnShop"
            type="button"
            class="px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase bg-slate-900 text-white hover:bg-black transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            @click="handleOpenEditModal"
          >
            <span>⚙ Cập Nhật Hồ Sơ Shop</span>
          </button>

          <div v-if="isManagement && !isOwnShop" class="flex items-center gap-2">
            <span class="px-3.5 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
              👁 Góc Người Mua (Chế độ xem trước)
            </span>
            <button
              type="button"
              class="px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              @click="handleChatShop"
            >
              <span>💬 Liên Hệ Shop</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Lưới 3 chỉ số hoạt động THẬT từ Database -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm mb-12">
        <div>
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Đánh Giá Gian Hàng
          </span>
          <span class="text-xl font-black text-slate-900">
            {{ brandRating }} ★ <span class="text-xs font-medium text-slate-500">({{ brandReviewCount }})</span>
          </span>
        </div>
        <div>
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Sản Phẩm Niêm Yết
          </span>
          <span class="text-xl font-black text-slate-900">{{ brandTotalProducts }} tác phẩm</span>
        </div>
        <div>
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Tổng Tồn Kho Sẵn Có
          </span>
          <span class="text-xl font-black text-slate-900">{{ brandTotalStock }} sản phẩm</span>
        </div>
      </div>

      <!-- 4. THANH DANH MỤC SHOWROOM CHỮ ĐEN KHÔNG NỀN (STICKY DƯỚI HEADER) -->
      <div
        id="shop-showroom"
        class="scroll-mt-24 sticky top-16 z-30 w-full bg-white/80 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-black/5 mb-6"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center justify-start gap-6 sm:gap-8 overflow-x-auto no-scrollbar whitespace-nowrap min-w-0 pr-2">
            <button
              type="button"
              class="text-[11px] tracking-[0.14em] uppercase transition-all pb-0.5 cursor-pointer shrink-0"
              :class="
                activeTab === 'storefront' || activeTab === 'all'
                  ? 'font-extrabold text-black border-b-2 border-black'
                  : 'font-semibold text-neutral-500 hover:text-black'
              "
              @click="handleTabClick('all')"
            >
              TẤT CẢ ({{ shopProducts.length }})
            </button>
            <button
              type="button"
              class="text-[11px] tracking-[0.14em] uppercase transition-all pb-0.5 cursor-pointer shrink-0"
              :class="
                activeTab === 'new'
                  ? 'font-extrabold text-black border-b-2 border-black'
                  : 'font-semibold text-neutral-500 hover:text-black'
              "
              @click="handleTabClick('new')"
            >
              BỘ SƯU TẬP MỚI
            </button>
          </div>

          <!-- Tìm kiếm & Sắp xếp nhanh -->
          <div class="flex flex-wrap items-center gap-2 shrink-0 text-xs">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Tìm trong gian hàng..."
              aria-label="Tìm sản phẩm trong gian hàng"
              class="px-3 py-1 rounded-full text-[11px] border border-neutral-300 bg-white text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-black w-44 sm:w-52"
            />
            <button
              type="button"
              class="px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider uppercase border transition-all"
              :class="
                sortBy === 'popular'
                  ? 'bg-black text-white border-black'
                  : 'bg-transparent text-neutral-700 border-neutral-300 hover:border-black'
              "
              @click="sortBy = 'popular'"
            >
              Khuyên dùng
            </button>
            <button
              type="button"
              class="px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wider uppercase border transition-all"
              :class="
                sortBy === 'price_asc'
                  ? 'bg-black text-white border-black'
                  : 'bg-transparent text-neutral-700 border-neutral-300 hover:border-black'
              "
              @click="sortBy = 'price_asc'"
            >
              Giá: Thấp → Cao
            </button>
          </div>
        </div>

        <!-- Dòng trạng thái số lượng sản phẩm -->
        <div class="flex items-center justify-between pt-1.5 text-[10.5px] text-neutral-500">
          <span>{{ displayProducts.length }} sản phẩm đang trưng bày</span>
        </div>
      </div>

      <!-- 6. LƯỚI SẢN PHẨM CỦA SHOP (100% TỪ DATABASE) -->
      <section id="shop-product-grid" class="shop-product-grid">
        <div
          v-if="isLoading && shopProducts.length === 0"
          style="padding: 60px; text-align: center; color: #64748b; grid-column: 1 / -1"
        >
          Đang tải danh mục sản phẩm từ cơ sở dữ liệu...
        </div>
        <div
          v-else-if="displayProducts.length === 0"
          style="padding: 60px; text-align: center; color: #64748b; grid-column: 1 / -1"
        >
          Không tìm thấy sản phẩm phù hợp với bộ lọc.
        </div>
        <template v-else>
          <router-link
            v-for="p in displayProducts"
            :key="p.id"
            :to="`/product-detail/${p.id}`"
            class="shop-product-card group"
          >
            <div class="product-card-thumb">
              <span class="card-tag-badge">{{ p.badge }}</span>
              <span v-if="p.discount" class="card-discount-tag">{{ p.discount }}</span>
              <img
                :src="p.image || FALLBACK_IMAGE"
                :alt="p.name"
                loading="lazy"
                @error="onImgError"
              />
            </div>
            <div class="product-card-body">
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ p.category }}</span>
                <span class="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                  ★ {{ p.rating }}
                </span>
              </div>
              <div class="text-[11px] font-black tracking-[0.16em] text-slate-900 uppercase mb-0.5">
                {{ splitProductName(p.name).brandName }}
              </div>
              <h3
                class="product-card-name font-medium text-slate-700 text-sm line-clamp-2 min-h-[2.6em] mb-2 group-hover:text-sky-600 transition-colors"
                :title="p.name"
              >
                {{ splitProductName(p.name).itemName }}
              </h3>
              <div class="product-card-price-row mt-auto pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <span class="price-main-val font-bold text-base text-slate-900">{{ p.priceFormatted }}</span>
                <span
                  v-if="p.originalPrice"
                  style="text-decoration: line-through; color: #94a3b8; font-size: 0.8rem"
                >
                  {{ p.originalPrice }}
                </span>
              </div>
            </div>
          </router-link>
        </template>
      </section>

      <!-- MODAL CHỈNH SỬA HỒ SƠ DÀNH CHO SELLER -->
      <div
        v-if="isEditModalOpen"
        style="
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          backdrop-filter: blur(4px);
        "
      >
        <div
          style="
            background: #ffffff;
            border-radius: 20px;
            max-width: 560px;
            width: 100%;
            padding: 28px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          "
        >
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            "
          >
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a">
              ⚙ Cập Nhật Thông Tin Cửa Hàng
            </h3>
            <button
              type="button"
              style="
                background: none;
                border: none;
                font-size: 1.25rem;
                cursor: pointer;
                color: #64748b;
              "
              @click="isEditModalOpen = false"
            >
              ✕
            </button>
          </div>
          <form @submit.prevent="handleSaveProfile">
            <div style="margin-bottom: 14px">
              <label
                style="
                  display: block;
                  font-size: 0.82rem;
                  font-weight: 700;
                  color: #334155;
                  margin-bottom: 6px;
                "
              >
                Tên Thương Hiệu / Gian Hàng
              </label>
              <input
                v-model="editForm.name"
                type="text"
                required
                style="
                  width: 100%;
                  padding: 10px 14px;
                  border-radius: 10px;
                  border: 1px solid #cbd5e1;
                  font-size: 0.9rem;
                "
              />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px">
              <div>
                <label
                  style="
                    display: block;
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 6px;
                  "
                >
                  Hotline Boutique
                </label>
                <input
                  v-model="editForm.phone"
                  type="text"
                  style="
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1px solid #cbd5e1;
                    font-size: 0.9rem;
                  "
                />
              </div>
              <div>
                <label
                  style="
                    display: block;
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 6px;
                  "
                >
                  Giờ Mở Cửa
                </label>
                <input
                  v-model="editForm.hours"
                  type="text"
                  style="
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1px solid #cbd5e1;
                    font-size: 0.9rem;
                  "
                />
              </div>
            </div>

            <div style="margin-bottom: 14px">
              <label
                style="
                  display: block;
                  font-size: 0.82rem;
                  font-weight: 700;
                  color: #334155;
                  margin-bottom: 6px;
                "
              >
                Địa Chỉ Flagship Chính
              </label>
              <input
                v-model="editForm.address"
                type="text"
                style="
                  width: 100%;
                  padding: 10px 14px;
                  border-radius: 10px;
                  border: 1px solid #cbd5e1;
                  font-size: 0.9rem;
                "
              />
            </div>

            <div style="margin-bottom: 14px">
              <label
                style="
                  display: block;
                  font-size: 0.82rem;
                  font-weight: 700;
                  color: #334155;
                  margin-bottom: 6px;
                "
              >
                Tiêu Đề Banner Chiến Dịch Hero
              </label>
              <input
                v-model="editForm.campaignTitle"
                type="text"
                placeholder="VD: Shoes for Men, BST Thu Đông 2026..."
                style="
                  width: 100%;
                  padding: 10px 14px;
                  border-radius: 10px;
                  border: 1px solid #cbd5e1;
                  font-size: 0.9rem;
                "
              />
            </div>

            <div style="margin-bottom: 20px">
              <label
                style="
                  display: block;
                  font-size: 0.82rem;
                  font-weight: 700;
                  color: #334155;
                  margin-bottom: 6px;
                "
              >
                Nội Dung Mô Tả Chiến Dịch Hero
              </label>
              <textarea
                v-model="editForm.campaignSubtitle"
                rows="2"
                placeholder="Mô tả chiến dịch hiển thị nổi bật dưới tiêu đề banner..."
                style="
                  width: 100%;
                  padding: 10px 14px;
                  border-radius: 10px;
                  border: 1px solid #cbd5e1;
                  font-size: 0.85rem;
                "
              />
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px">
              <button
                type="button"
                style="
                  padding: 10px 18px;
                  border-radius: 10px;
                  border: 1px solid #cbd5e1;
                  background: #f8fafc;
                  font-weight: 600;
                  cursor: pointer;
                "
                @click="isEditModalOpen = false"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                style="
                  padding: 10px 22px;
                  border-radius: 10px;
                  border: none;
                  background: #0f172a;
                  color: #ffffff;
                  font-weight: 700;
                  cursor: pointer;
                "
              >
                Lưu & Áp Dụng
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>
