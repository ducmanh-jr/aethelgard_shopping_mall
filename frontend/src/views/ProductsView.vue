<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import CartCheckoutPanel from '../components/CartCheckoutPanel.vue';
import ProductFormModal from '../components/ProductFormModal.vue';
import { orderService, productService } from '../services/apiServices';
import { authState } from '../stores/auth';
import type { CartItem, Category, Product, ProductPayload } from '../types/models';

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const message = ref('');
const error = ref('');

const filter = reactive({
  search: '',
  categoryId: '' as string | number,
  page: 1,
  pageSize: 10
});

const showForm = ref(false);
const editingProduct = ref<Product | null>(null);
const cart = ref<CartItem[]>([]);
const showCheckout = ref(false);

const canManage = () =>
  authState.user?.role === 'Seller' || authState.user?.role === 'Admin';

async function loadCategories() {
  categories.value = await productService.getCategories();
}

async function loadProducts() {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, unknown> = {
      page: filter.page,
      pageSize: filter.pageSize
    };
    if (filter.search.trim()) params.search = filter.search.trim();
    if (filter.categoryId) params.categoryId = Number(filter.categoryId);

    const data = await productService.getPaged(params);
    products.value = data.items;
    totalCount.value = data.totalCount;
  } catch {
    error.value = 'Không thể tải danh sách sản phẩm. Hãy kiểm tra Backend API đang chạy.';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingProduct.value = null;
  showForm.value = true;
}

function openEdit(p: Product) {
  editingProduct.value = p;
  showForm.value = true;
}

async function handleSaveProduct(payload: ProductPayload, editingId: number | null) {
  error.value = '';
  message.value = '';
  try {
    if (editingId) {
      await productService.update(editingId, payload);
      message.value = 'Cập nhật sản phẩm thành công.';
    } else {
      await productService.create(payload);
      message.value = 'Thêm sản phẩm thành công.';
    }
    showForm.value = false;
    await loadProducts();
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Thao tác thất bại.';
  }
}

async function deleteProduct(id: number) {
  if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
  try {
    await productService.remove(id);
    message.value = 'Đã xóa sản phẩm.';
    await loadProducts();
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Không thể xóa sản phẩm.';
  }
}

function addToCart(p: Product) {
  const existing = cart.value.find((c) => c.product.id === p.id);
  if (existing) {
    if (existing.quantity < p.stockQuantity) existing.quantity++;
  } else {
    cart.value.push({ product: p, quantity: 1 });
  }
  showCheckout.value = true;
}

function removeFromCart(productId: number) {
  cart.value = cart.value.filter((c) => c.product.id !== productId);
  if (cart.value.length === 0) showCheckout.value = false;
}

async function handleOrderSubmit(checkout: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
}) {
  error.value = '';
  message.value = '';
  if (cart.value.length === 0) return;
  try {
    const data = await orderService.create({
      customerName: checkout.customerName || 'Khách hàng',
      customerEmail: checkout.customerEmail || 'customer@smartshop.local',
      customerPhone: checkout.customerPhone,
      shippingAddress: checkout.shippingAddress,
      paymentMethod: checkout.paymentMethod,
      items: cart.value.map((c) => ({
        productId: c.product.id,
        specs: 'Tiêu chuẩn',
        quantity: c.quantity
      }))
    });
    message.value = `Đặt hàng thành công! Mã đơn: ${data.orderCode}`;
    cart.value = [];
    showCheckout.value = false;
    await loadProducts();
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Không thể đặt hàng.';
  }
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadProducts()]);
});
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h2 style="margin: 0;">Quản lý & Danh mục Sản phẩm</h2>
      <div style="display: flex; gap: 8px;">
        <button v-if="cart.length > 0" class="btn" @click="showCheckout = !showCheckout">
          Giỏ hàng ({{ cart.reduce((s, i) => s + i.quantity, 0) }})
        </button>
        <button v-if="canManage()" class="btn btn-primary" @click="openCreate">+ Thêm sản phẩm</button>
      </div>
    </div>

    <div class="card" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
      <input
        v-model="filter.search"
        class="input"
        placeholder="Tìm theo tên hoặc SKU..."
        style="flex: 1; min-width: 200px;"
        @keyup.enter="filter.page = 1; loadProducts()"
      />
      <select v-model="filter.categoryId" class="input" @change="filter.page = 1; loadProducts()">
        <option value="">Tất cả danh mục</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn btn-primary" @click="filter.page = 1; loadProducts()">Tìm kiếm</button>
    </div>

    <p v-if="message" style="color: #15803d; font-weight: 500;">{{ message }}</p>
    <p v-if="error" style="color: #dc2626; font-weight: 500;">{{ error }}</p>

    <CartCheckoutPanel
      v-if="showCheckout && cart.length > 0"
      :cart="cart"
      @remove="removeFromCart"
      @close="showCheckout = false"
      @submit="handleOrderSubmit"
    />

    <ProductFormModal
      v-if="showForm"
      :categories="categories"
      :editing-product="editingProduct"
      @save="handleSaveProduct"
      @cancel="showForm = false"
      @error="(msg) => (error = msg)"
    />

    <div class="card">
      <p v-if="loading">Đang tải dữ liệu...</p>
      <table v-else>
        <thead>
          <tr>
            <th>ID</th>
            <th>SKU</th>
            <th>Tên sản phẩm</th>
            <th>Danh mục</th>
            <th>Giá bán</th>
            <th>Tồn kho</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.sku }}</td>
            <td>{{ p.name }}</td>
            <td>{{ p.categoryName }}</td>
            <td>{{ formatVnd(p.basePrice) }}</td>
            <td>{{ p.stockQuantity }} ({{ p.stockStatus }})</td>
            <td style="display: flex; gap: 6px;">
              <template v-if="canManage()">
                <button class="btn" @click="openEdit(p)">Sửa</button>
                <button class="btn btn-danger" @click="deleteProduct(p.id)">Xóa</button>
              </template>
              <button v-else class="btn btn-primary" :disabled="p.stockQuantity <= 0" @click="addToCart(p)">
                + Giỏ hàng
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
        <span>Tổng: {{ totalCount }} sản phẩm</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn" :disabled="filter.page <= 1" @click="filter.page--; loadProducts()">Trước</button>
          <span>Trang {{ filter.page }}</span>
          <button
            class="btn"
            :disabled="filter.page * filter.pageSize >= totalCount"
            @click="filter.page++; loadProducts()"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
