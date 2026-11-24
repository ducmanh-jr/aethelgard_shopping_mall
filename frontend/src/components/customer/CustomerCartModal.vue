<script setup lang="ts">
import { computed } from 'vue';
import { useCart } from '@/stores/cart';
import { useToast } from '@/stores/toast';
import { formatVND } from '@/lib/utils';
import { FALLBACK_IMAGE } from '@/lib/constants';
import { calcOrderTotals, FREE_SHIPPING_THRESHOLD } from '@/lib/customer';

const {
  cart,
  totalQty,
  totalAmount,
  updateQuantity,
  removeFromCart,
  clearCart,
  isCartOpen,
  setIsCartOpen,
  setIsCheckoutOpen,
} = useCart();
const { showToast } = useToast();

const totals = computed(() => calcOrderTotals(totalAmount.value));
const remainingForFreeShip = computed(() => Math.max(0, FREE_SHIPPING_THRESHOLD - totalAmount.value + 1));
const freeShipProgress = computed(() => Math.min(100, (totalAmount.value / FREE_SHIPPING_THRESHOLD) * 100));

function handleIncrease(productId: number, specs: string | undefined, qty: number, stock: number) {
  if (stock > 0 && qty >= stock) {
    showToast(`Chỉ còn ${stock} sản phẩm trong kho`);
    return;
  }
  updateQuantity(productId, qty + 1, specs);
}

function handleCheckout() {
  if (cart.value.length === 0) {
    showToast('Giỏ hàng đang trống!');
    return;
  }
  setIsCartOpen(false);
  setIsCheckoutOpen(true);
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <div
    v-if="isCartOpen"
    id="customer-cart-modal"
    class="modal-backdrop"
    @click.self="setIsCartOpen(false)"
  >
    <div class="modal-card customer-cart-card">
      <div class="modal-header">
        <h2>Giỏ Hàng Mua Sắm ({{ totalQty }})</h2>
        <button class="close-btn" type="button" aria-label="Đóng giỏ hàng" @click="setIsCartOpen(false)">
          &times;
        </button>
      </div>

      <div v-if="cart.length > 0" class="customer-freeship-box">
        <p v-if="remainingForFreeShip > 0 && totalAmount <= FREE_SHIPPING_THRESHOLD">
          Mua thêm <strong>{{ formatVND(remainingForFreeShip) }}</strong> để được <strong>miễn phí vận chuyển</strong>
        </p>
        <p v-else>🎉 Đơn hàng của bạn được <strong>miễn phí vận chuyển</strong></p>
        <div class="customer-freeship-track">
          <div class="customer-freeship-fill" :style="{ width: `${freeShipProgress}%` }" />
        </div>
      </div>

      <div class="cart-items-container customer-cart-list">
        <div v-if="cart.length === 0" class="customer-empty-state">
          <p class="empty-cart-msg">Giỏ hàng của bạn đang trống.</p>
          <router-link to="/shop" class="customer-link-btn" @click="setIsCartOpen(false)">
            Khám phá sản phẩm &rarr;
          </router-link>
        </div>

        <div v-for="{ product, quantity, specs } in cart" v-else :key="`${product.id}-${specs}`" class="cart-item-row">
          <img :src="product.imageUrl || FALLBACK_IMAGE" :alt="product.name" class="cart-item-thumb" @error="onImgError" />
          <div class="cart-item-details">
            <router-link :to="`/product-detail/${product.id}`" style="text-decoration: none; color: inherit" @click="setIsCartOpen(false)">
              <h4>{{ product.name }}</h4>
            </router-link>
            <p class="cart-item-sku">Phân loại: {{ specs || 'Tiêu chuẩn' }}</p>
            <p class="cart-item-price">{{ formatVND(product.basePrice) }}</p>
          </div>
          <div class="customer-cart-actions">
            <div class="cart-item-qty">
              <button type="button" class="btn-qty" aria-label="Giảm số lượng" @click="updateQuantity(product.id, quantity - 1, specs)">
                −
              </button>
              <span class="customer-qty-value">{{ quantity }}</span>
              <button
                type="button"
                class="btn-qty"
                aria-label="Tăng số lượng"
                @click="handleIncrease(product.id, specs, quantity, product.stockQuantity || 0)"
              >
                +
              </button>
            </div>
            <button
              type="button"
              class="btn-remove-item"
              style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem"
              @click="removeFromCart(product.id, specs)"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      <div class="cart-summary">
        <div class="summary-row">
          <span>Tạm tính ({{ totalQty }} món):</span>
          <strong>{{ formatVND(totals.subtotal) }}</strong>
        </div>
        <div class="summary-row">
          <span>Phí vận chuyển:</span>
          <strong>{{ totals.shipping === 0 ? 'Miễn phí' : formatVND(totals.shipping) }}</strong>
        </div>
        <div class="summary-row">
          <span>Thuế VAT (8%):</span>
          <strong>{{ formatVND(totals.taxes) }}</strong>
        </div>
        <div class="summary-row grand-total">
          <span>Tổng thanh toán:</span>
          <strong class="accent-price">{{ formatVND(totals.total) }}</strong>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" type="button" :disabled="cart.length === 0" @click="clearCart">Xóa tất cả</button>
        <button class="btn-primary" type="button" :disabled="cart.length === 0" @click="handleCheckout">
          Tiến hành thanh toán
        </button>
      </div>
    </div>
  </div>
</template>
