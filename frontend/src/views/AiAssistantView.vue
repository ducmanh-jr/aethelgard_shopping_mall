<script setup lang="ts">
import { ref } from 'vue';
import { aiService } from '../services/apiServices';

const query = ref('');
const productId = ref<number | undefined>(undefined);
const recommendResult = ref<unknown>(null);
const loadingRecommend = ref(false);
const recommendError = ref('');

const descForm = ref({
  productName: '',
  categoryName: '',
  brand: '',
  material: '',
  keywords: ''
});
const descResult = ref<unknown>(null);
const loadingDesc = ref(false);
const descError = ref('');

async function askStylist() {
  recommendError.value = '';
  recommendResult.value = null;
  loadingRecommend.value = true;
  try {
    const params: Record<string, unknown> = {};
    if (query.value.trim()) params.query = query.value.trim();
    if (productId.value && productId.value > 0) params.productId = productId.value;
    recommendResult.value = await aiService.recommend(params);
  } catch (err: any) {
    recommendError.value = err?.response?.data?.message || 'Không thể gọi AI Stylist.';
  } finally {
    loadingRecommend.value = false;
  }
}

async function generateDescription() {
  descError.value = '';
  descResult.value = null;
  loadingDesc.value = true;
  try {
    descResult.value = await aiService.generateDescription(descForm.value);
  } catch (err: any) {
    descError.value = err?.response?.data?.message || 'Không thể tạo mô tả sản phẩm.';
  } finally {
    loadingDesc.value = false;
  }
}
</script>

<template>
  <div>
    <h2>Trợ lý AI (AI Stylist & Tạo mô tả sản phẩm)</h2>

    <div class="card">
      <h3>1. AI Tư vấn phối đồ (GET /api/ai/recommend)</h3>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <input v-model="query" class="input" placeholder="Ví dụ: Phối đồ đi làm lịch sự..." style="flex: 1; min-width: 220px;" />
        <input v-model.number="productId" type="number" class="input" placeholder="Product ID (tuỳ chọn)" style="width: 180px;" />
        <button class="btn btn-primary" :disabled="loadingRecommend" @click="askStylist">
          {{ loadingRecommend ? 'Đang tư vấn...' : 'Hỏi AI Stylist' }}
        </button>
      </div>
      <p v-if="recommendError" style="color: #dc2626;">{{ recommendError }}</p>
      <pre v-if="recommendResult" style="background: #f1f5f9; padding: 12px; border-radius: 6px; overflow: auto; margin-top: 10px;">{{ JSON.stringify(recommendResult, null, 2) }}</pre>
    </div>

    <div class="card">
      <h3>2. AI Tạo mô tả sản phẩm (POST /api/ai/generate-description)</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <input v-model="descForm.productName" class="input" placeholder="Tên sản phẩm (*)" />
        <input v-model="descForm.categoryName" class="input" placeholder="Danh mục" />
        <input v-model="descForm.brand" class="input" placeholder="Thương hiệu" />
        <input v-model="descForm.material" class="input" placeholder="Chất liệu" />
        <input v-model="descForm.keywords" class="input" placeholder="Từ khóa nổi bật" style="grid-column: span 2;" />
      </div>
      <button class="btn btn-primary" style="margin-top: 10px;" :disabled="loadingDesc" @click="generateDescription">
        {{ loadingDesc ? 'Đang tạo...' : 'Tạo mô tả bằng AI' }}
      </button>
      <p v-if="descError" style="color: #dc2626;">{{ descError }}</p>
      <pre v-if="descResult" style="background: #f1f5f9; padding: 12px; border-radius: 6px; overflow: auto; margin-top: 10px;">{{ JSON.stringify(descResult, null, 2) }}</pre>
    </div>
  </div>
</template>

<!-- Draft AI prompt preset 1 -->
<!-- Draft AI prompt preset 2 -->
<!-- Draft AI prompt preset 3 -->
<!-- Draft AI prompt preset 4 -->
<!-- Draft AI prompt preset 5 -->
<!-- Draft AI prompt preset 6 -->
<!-- Draft AI prompt preset 7 -->
<!-- Draft AI prompt preset 8 -->
<!-- Draft AI prompt preset 9 -->
<!-- Draft AI prompt preset 10 -->
<!-- Draft AI prompt preset 11 -->
<!-- Draft AI prompt preset 12 -->
<!-- Draft AI prompt preset 13 -->
<!-- Draft AI prompt preset 14 -->
<!-- Draft AI prompt preset 15 -->
<!-- Draft AI prompt preset 16 -->
<!-- Draft AI prompt preset 17 -->
<!-- Draft AI prompt preset 18 -->
<!-- Draft AI prompt preset 19 -->
<!-- Draft AI prompt preset 20 -->
<!-- Draft AI prompt preset 21 -->
<!-- Draft AI prompt preset 22 -->
<!-- Draft AI prompt preset 23 -->
<!-- Draft AI prompt preset 24 -->
<!-- Draft AI prompt preset 25 -->
