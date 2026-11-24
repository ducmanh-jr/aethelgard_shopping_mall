<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Product } from '@/types';
import { formatVND, detectBrand, generateSkuCode } from '@/lib/utils';
import { inventoryService } from '@/services/inventory.service';
import { productService } from '@/services/product.service';
import { CheckCircle2, AlertCircle, Edit3, Trash2, Eye, EyeOff, Loader2, Plus } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  product: Product | null;
}>();

const emit = defineEmits<{
  close: [];
  showToast: [message: string];
  editProduct: [product: Product];
  deleteProduct: [product: Product];
  productUpdated: [product: Product];
}>();

const isTogglingStatus = ref(false);
const isRestocking = ref(false);
const isStockBumped = ref(false);

const brandName = computed(() => (props.product ? detectBrand(props.product.name) : 'AETHELGARD'));
const skuCode = computed(() =>
  props.product ? props.product.sku || generateSkuCode(props.product.name, props.product.id) : 'AE-00101'
);
const isStockAvailable = computed(() => (props.product?.stockQuantity || 0) > 0);
const isCurrentlyActive = computed(() => props.product?.isActive !== false);

async function quickRestock() {
  if (!props.product) return;
  isRestocking.value = true;
  try {
    await inventoryService.restock({ productId: props.product.id, additionalQuantity: 10 });
    const newStock = (props.product.stockQuantity || 0) + 10;
    emit('productUpdated', {
      ...props.product,
      stockQuantity: newStock,
      stockStatus: newStock > 10 ? 'IN_STOCK' : 'LOW_STOCK',
    });
    isStockBumped.value = true;
    setTimeout(() => (isStockBumped.value = false), 500);
    emit('showToast', `Đã nhập thêm thành công +10 tồn kho cho "${props.product.name}"!`);
  } catch {
    emit('showToast', 'Không thể nhập kho lúc này.');
  } finally {
    isRestocking.value = false;
  }
}

async function toggleActiveStatus() {
  if (!props.product) return;
  isTogglingStatus.value = true;
  try {
    const res = await productService.toggleProductStatus(props.product.id);
    emit('productUpdated', { ...props.product, isActive: res.isActive });
    emit('showToast', res.message || (res.isActive ? 'Sản phẩm đã hiển thị lên sàn!' : 'Sản phẩm đã chuyển sang nháp (ẩn).'));
  } catch {
    emit('showToast', 'Không thể thay đổi trạng thái sản phẩm lúc này.');
  } finally {
    isTogglingStatus.value = false;
  }
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = '/img/products/adidas-samba.jpg';
}
</script>

<template>
  <div
    v-if="product"
    id="seller-dual-drawer-backdrop"
    :class="['seller-dual-drawer-backdrop', isOpen ? 'active' : '']"
    @click.self="emit('close')"
  >
    <div class="seller-drawer-wrapper">
      <div class="seller-panel seller-panel-secondary">
        <div class="seller-panel-header">
          <h4 class="text-slate-900 font-bold text-sm">Kho Hàng & Vận Hành</h4>
          <span class="sku-tag">SKU #{{ skuCode }}</span>
        </div>

        <div class="seller-panel-body">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tồn Kho Sẵn Có</span>
              <span
                :class="[
                  'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                  isStockAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200',
                ]"
              >
                <CheckCircle2 v-if="isStockAvailable" class="w-3 h-3" />
                <AlertCircle v-else class="w-3 h-3" />
                <span>{{ isStockAvailable ? 'Còn hàng' : 'Hết hàng' }}</span>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span :class="['text-3xl font-black inline-block transition-all duration-300', isStockBumped ? 'scale-125 text-sky-600' : 'scale-100 text-slate-900']">
                {{ product.stockQuantity ?? 0 }}
              </span>
              <span class="text-xs font-medium text-slate-500">sản phẩm khả dụng</span>
            </div>
          </div>

          <div class="p-3.5 rounded-xl border border-slate-200/80 bg-white mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-700">Trạng Thái Hiển Thị Sàn</span>
              <span :class="['text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md', isCurrentlyActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800']">
                {{ isCurrentlyActive ? 'Đang Hiển Thị' : 'Tạm Ẩn / Nháp' }}
              </span>
            </div>
            <button
              type="button"
              :disabled="isTogglingStatus"
              :class="[
                'w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer',
                isCurrentlyActive ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
              ]"
              @click="toggleActiveStatus"
            >
              <Loader2 v-if="isTogglingStatus" class="w-3.5 h-3.5 animate-spin" />
              <EyeOff v-else-if="isCurrentlyActive" class="w-3.5 h-3.5 text-amber-700" />
              <Eye v-else class="w-3.5 h-3.5 text-emerald-700" />
              <span>{{ isCurrentlyActive ? 'Chuyển Sang Bản Nháp (Tạm Ẩn)' : 'Kích Hoạt Hiển Thị Lên Sàn' }}</span>
            </button>
          </div>

          <div class="flex flex-col gap-2.5">
            <button
              type="button"
              :disabled="isRestocking"
              class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              @click="quickRestock"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>{{ isRestocking ? 'Đang nhập kho...' : 'Nhập Nhanh +10 Tồn Kho' }}</span>
            </button>

            <button
              type="button"
              class="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              @click="emit('editProduct', product)"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Chỉnh Sửa Sản Phẩm</span>
            </button>

            <button
              type="button"
              class="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              @click="emit('deleteProduct', product)"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Xóa Sản Phẩm</span>
            </button>
          </div>
        </div>
      </div>

      <div class="seller-panel seller-panel-primary">
        <div class="seller-panel-header">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ brandName }}</span>
            <h3 class="text-slate-900 font-bold text-base m-0">{{ product.name }}</h3>
          </div>
          <button type="button" class="close-btn" aria-label="Đóng" @click="emit('close')">&times;</button>
        </div>
        <div class="seller-panel-body">
          <div class="aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-4 mb-4">
            <img :src="product.imageUrl" :alt="product.name" class="max-w-full max-h-full object-contain" @error="onImgError" />
          </div>
          <div class="flex items-baseline justify-between mb-3">
            <span class="text-xl font-extrabold text-slate-900">{{ formatVND(product.basePrice) }}</span>
            <span class="text-xs text-slate-500">{{ product.categoryName || 'Thời trang' }}</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed mb-4">{{ product.description }}</p>
          <router-link
            :to="`/product-detail/${product.id}`"
            class="block text-center w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
            @click="emit('close')"
          >
            Xem Trang Chi Tiết Sản Phẩm →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
