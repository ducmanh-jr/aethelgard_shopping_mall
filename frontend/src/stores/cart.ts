import { computed, ref, watch } from 'vue';
import type { Product } from '@/types';

export interface CartItem {
  product: Product;
  quantity: number;
  specs?: string;
}

const CART_STORAGE_KEY = 'aethelgard_cart';

const normalizeSpecs = (specs?: string) => (specs || 'Tiêu chuẩn').trim();
const isSameLine = (item: CartItem, productId: number, specs?: string) =>
  item.product.id === productId &&
  (specs === undefined || normalizeSpecs(item.specs) === normalizeSpecs(specs));

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

const cart = ref<CartItem[]>(loadCart());
const isCartOpen = ref(false);
const isCheckoutOpen = ref(false);

watch(
  cart,
  (val) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(val));
    } catch {
      // Ignore quota errors
    }
  },
  { deep: true }
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CART_STORAGE_KEY) {
      try {
        cart.value = e.newValue ? JSON.parse(e.newValue) : [];
      } catch {
        cart.value = [];
      }
    }
  });
  window.addEventListener('aethelgard:cart-cleared', () => {
    cart.value = [];
  });
}

export function useCart() {
  function addToCart(product: Product, quantity = 1, specs?: string) {
    const lineSpecs = normalizeSpecs(specs);
    const index = cart.value.findIndex((item) => isSameLine(item, product.id, lineSpecs));
    if (index > -1) {
      const updated = [...cart.value];
      updated[index] = {
        ...updated[index],
        product,
        quantity: updated[index].quantity + quantity,
      };
      cart.value = updated;
    } else {
      cart.value = [...cart.value, { product, quantity, specs: lineSpecs }];
    }
  }

  function removeFromCart(productId: number, specs?: string) {
    cart.value = cart.value.filter((item) => !isSameLine(item, productId, specs));
  }

  function updateQuantity(productId: number, quantity: number, specs?: string) {
    if (quantity <= 0) {
      removeFromCart(productId, specs);
      return;
    }
    cart.value = cart.value.map((item) =>
      isSameLine(item, productId, specs) ? { ...item, quantity } : item
    );
  }

  function clearCart() {
    cart.value = [];
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aethelgard:cart-cleared'));
    }
  }

  const totalQty = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0));
  const totalAmount = computed(() =>
    cart.value.reduce((sum, item) => sum + (item.product.basePrice || 0) * item.quantity, 0)
  );

  return {
    cart,
    totalQty,
    totalAmount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isCartOpen,
    setIsCartOpen: (open: boolean) => {
      isCartOpen.value = open;
    },
    isCheckoutOpen,
    setIsCheckoutOpen: (open: boolean) => {
      isCheckoutOpen.value = open;
    },
  };
}
