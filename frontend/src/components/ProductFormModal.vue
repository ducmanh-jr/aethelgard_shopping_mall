<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { aiService } from '../services/apiServices';
import type { Category, Product, ProductPayload } from '../types/models';

const props = defineProps<{
  categories: Category[];
  editingProduct: Product | null;
}>();

const emit = defineEmits<{
  save: [payload: ProductPayload, editingId: number | null];
  cancel: [];
  error: [message: string];
}>();

const generatingAi = ref(false);
const form = reactive<ProductPayload>({
  name: '',
  sku: '',
  categoryId: props.categories[0]?.id || 1,
  basePrice: 0,
  stockQuantity: 10,
  description: ''
});

watch(
  () => props.editingProduct,
  (p) => {
    if (p) {
      form.name = p.name;
      form.sku = p.sku;
      form.categoryId = p.categoryId;
      form.basePrice = p.basePrice;
      form.stockQuantity = p.stockQuantity;
      form.description = p.description;
    } else {
      form.name = '';
      form.sku = '';
      form.categoryId = props.categories[0]?.id || 1;
      form.basePrice = 0;
      form.stockQuantity = 10;
      form.description = '';
    }
  },
  { immediate: true }
);

async function generateAiDescription() {
  if (!form.name.trim()) {
    emit('error', 'Vui lòng nhập tên sản phẩm trước khi tạo mô tả AI.');
    return;
  }
  generatingAi.value = true;
  try {
    const categoryName = props.categories.find((c) => c.id === form.categoryId)?.name || '';
    const data = await aiService.generateDescription({ productName: form.name, categoryName });
    form.description = data.description || form.description;
  } catch (err: any) {
    emit('error', err?.response?.data?.message || 'Không thể tạo mô tả bằng AI.');
  } finally {
    generatingAi.value = false;
  }
}

function submit() {
  if (!form.name.trim() || (!props.editingProduct && !form.sku.trim())) {
    emit('error', 'Tên sản phẩm và mã SKU không được để trống.');
    return;
  }
  if (form.basePrice < 0 || form.stockQuantity < 0) {
    emit('error', 'Giá bán và số lượng tồn kho không được âm.');
    return;
  }
  emit('save', { ...form }, props.editingProduct?.id ?? null);
}
</script>

<template>
  <div class="card">
    <h3>{{ editingProduct ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới' }}</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <input v-model="form.name" class="input" placeholder="Tên sản phẩm" />
      <input v-model="form.sku" class="input" placeholder="Mã SKU" :disabled="editingProduct !== null" />
      <select v-model="form.categoryId" class="input">
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <input v-model.number="form.basePrice" type="number" class="input" placeholder="Giá (VND)" />
      <input v-model.number="form.stockQuantity" type="number" class="input" placeholder="Tồn kho" />
      <div style="display: flex; gap: 6px;">
        <input v-model="form.description" class="input" placeholder="Mô tả" style="flex: 1;" />
        <button class="btn" :disabled="generatingAi" @click="generateAiDescription">
          {{ generatingAi ? '...' : 'AI mô tả' }}
        </button>
      </div>
    </div>
    <div style="margin-top: 12px; display: flex; gap: 8px;">
      <button class="btn btn-primary" @click="submit">Lưu</button>
      <button class="btn" @click="$emit('cancel')">Hủy</button>
    </div>
  </div>
</template>
