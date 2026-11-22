import { onMounted, onUnmounted, ref } from 'vue';
import type { Category, Product } from '@/types';
import { productService } from '@/services/product.service';

const CATALOG_PAGE_SIZE = 10000;

let cachedProducts: Product[] | null = null;
let cachedCategories: Category[] | null = null;
let inflight: Promise<void> | null = null;
let usedFallback = false;

type CatalogListener = (data: { products: Product[]; categories: Category[]; isOffline: boolean }) => void;
const listeners = new Set<CatalogListener>();

function notifySubscribers() {
  const data = {
    products: cachedProducts || [],
    categories: cachedCategories || [],
    isOffline: usedFallback,
  };
  listeners.forEach((listener) => {
    try {
      listener(data);
    } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aethelgard:catalog-updated', { detail: data }));
  }
}

export async function reloadCatalog(force = false): Promise<void> {
  if (force) {
    cachedProducts = null;
    cachedCategories = null;
  }
  if (!inflight) {
    inflight = (async () => {
      try {
        const [productRes, categoryRes] = await Promise.allSettled([
          productService.getProducts({ pageSize: CATALOG_PAGE_SIZE }),
          productService.getCategories(),
        ]);
        const items = productRes.status === 'fulfilled' ? productRes.value.items : [];
        usedFallback = false;
        cachedProducts = items;
        const cats = categoryRes.status === 'fulfilled' ? categoryRes.value : [];
        cachedCategories = cats;
      } catch {
        if (!cachedProducts) cachedProducts = [];
        if (!cachedCategories) cachedCategories = [];
        usedFallback = true;
      }
    })().finally(() => {
      inflight = null;
    });
  }
  await inflight;
  notifySubscribers();
}

async function loadCatalog() {
  if (cachedProducts && cachedCategories) return;
  await reloadCatalog(false);
}

if (typeof window !== 'undefined') {
  window.addEventListener('aethelgard:request-catalog-reload', () => {
    reloadCatalog(true);
  });
}

export function useCatalog() {
  const products = ref<Product[]>(cachedProducts || []);
  const categories = ref<Category[]>(cachedCategories || []);
  const isLoading = ref(!cachedProducts);
  const isOffline = ref(usedFallback);

  const listener: CatalogListener = (data) => {
    products.value = data.products;
    categories.value = data.categories;
    isOffline.value = data.isOffline;
    isLoading.value = false;
  };

  onMounted(() => {
    listeners.add(listener);
    if (!cachedProducts || !cachedCategories) {
      isLoading.value = true;
      loadCatalog().then(() => {
        products.value = cachedProducts || [];
        categories.value = cachedCategories || [];
        isOffline.value = usedFallback;
        isLoading.value = false;
      });
    } else {
      products.value = cachedProducts;
      categories.value = cachedCategories;
      isOffline.value = usedFallback;
      isLoading.value = false;
    }
  });

  onUnmounted(() => {
    listeners.delete(listener);
  });

  return {
    products,
    categories,
    isLoading,
    isOffline,
    refresh: () => reloadCatalog(true),
  };
}

export async function invalidateCatalog(): Promise<void> {
  await reloadCatalog(true);
}
