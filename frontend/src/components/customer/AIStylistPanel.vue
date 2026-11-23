<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { Product } from '@/types';
import { aiService } from '@/services/ai.service';
import { formatVND } from '@/lib/utils';
import { FALLBACK_IMAGE } from '@/lib/constants';
import { extractBrand } from '@/lib/customer';

const QUICK_PROMPTS = [
  'Đi làm văn phòng thanh lịch',
  'Dạo phố cuối tuần năng động',
  'Dự tiệc cưới ngoài trời',
  'Hẹn hò buổi tối',
];

const props = defineProps<{
  product: Pick<Product, 'id' | 'name' | 'categoryId' | 'basePrice'> & { collectionName?: string };
  catalog: Product[];
}>();

const query = ref('');
const answer = ref('');
const isFallback = ref(false);
const isLoading = ref(false);
const askedFor = ref('');
let pendingController: AbortController | null = null;

async function ask(q: string) {
  const intent = q.trim() || `Phối đồ cùng ${props.product.name}`;
  pendingController?.abort();
  const controller = new AbortController();
  pendingController = controller;
  isLoading.value = true;
  askedFor.value = q.trim();
  try {
    const res = await aiService.getOutfitRecommendation(intent, props.product.id, controller.signal);
    if (pendingController !== controller || controller.signal.aborted) return;
    answer.value = res.text;
    isFallback.value = res.isFallback;
  } finally {
    if (pendingController === controller && !controller.signal.aborted) {
      pendingController = null;
      isLoading.value = false;
    }
  }
}

watch(
  () => props.product.id,
  () => {
    pendingController?.abort();
    pendingController = null;
    answer.value = '';
    query.value = '';
    askedFor.value = '';
    isFallback.value = false;
    isLoading.value = false;
  }
);

onUnmounted(() => {
  pendingController?.abort();
  pendingController = null;
});

const completeTheLook = computed(() => {
  const brand = extractBrand(props.product);
  const usedCategories = new Set<number>([props.product.categoryId]);
  const ranked = props.catalog
    .filter((p) => p.id !== props.product.id && p.categoryId !== props.product.categoryId && (p.stockQuantity ?? 1) > 0)
    .map((p) => {
      let score = (p.rating || 0) / 5;
      if (brand && extractBrand(p) === brand) score += 1.5;
      if (props.product.basePrice > 0) {
        score += Math.max(0, 1 - Math.abs(p.basePrice - props.product.basePrice) / props.product.basePrice);
      }
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const picks: Product[] = [];
  for (const { p } of ranked) {
    if (usedCategories.has(p.categoryId)) continue;
    usedCategories.add(p.categoryId);
    picks.push(p);
    if (picks.length === 3) break;
  }
  return picks;
});

const lookTotal = computed(() => completeTheLook.value.reduce((s, p) => s + p.basePrice, props.product.basePrice));

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <section class="customer-ai-panel" aria-labelledby="ai-stylist-title">
    <div class="customer-ai-header">
      <span
        class="customer-ai-badge"
        style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #8b5cf6 100%); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25)"
      >
        ✦ AI Stylist · Powered by Google Gemini
      </span>
      <h2 id="ai-stylist-title">Trợ Lý Phối Đồ Cá Nhân Hóa (Gemini AI)</h2>
      <p>Hỏi ý kiến trợ lý AI được tích hợp mô hình Google Gemini để nhận gợi ý phối đồ chuẩn phong cách thời thượng.</p>
    </div>

    <form class="customer-ai-form" @submit.prevent="ask(query)">
      <input
        v-model="query"
        class="form-control"
        placeholder="VD: Tôi cao 1m75, đi dự tiệc cưới ngoài trời buổi chiều..."
        aria-label="Mô tả dịp mặc"
      />
      <button type="submit" class="customer-ai-submit" :disabled="isLoading">
        {{ isLoading ? 'Đang phân tích...' : 'Hỏi AI' }}
      </button>
    </form>

    <div class="customer-ai-chips">
      <button
        v-for="q in QUICK_PROMPTS"
        :key="q"
        type="button"
        class="customer-chip"
        :disabled="isLoading"
        @click="query = q; ask(q)"
      >
        {{ q }}
      </button>
    </div>

    <div class="customer-ai-answer" aria-live="polite">
      <div v-if="isLoading" class="customer-ai-typing">
        <span />
        <span />
        <span />
      </div>
      <template v-else>
        <p v-if="askedFor" class="customer-ai-question">“{{ askedFor }}”</p>
        <p>{{ answer || 'Nhập câu hỏi hoặc chọn một dịp mặc để nhận gợi ý.' }}</p>
        <div
          v-if="!isFallback && Boolean(answer)"
          style="margin-top: 10px; display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #4f46e5; font-weight: 600"
        >
          <span>✨ Gợi ý thời trang tạo bởi Google Gemini</span>
        </div>
        <p v-if="isFallback" class="customer-ai-note">
          Đang hiển thị gợi ý phối đồ mẫu (chưa cấu hình Gemini API Key hoặc kết nối AI tạm gián đoạn).
        </p>
      </template>
    </div>

    <div v-if="completeTheLook.length > 0" class="customer-look">
      <div class="customer-look-header">
        <h3>Hoàn thiện set đồ</h3>
        <span>
          Trọn bộ ước tính: <strong>{{ formatVND(lookTotal) }}</strong>
        </span>
      </div>
      <div class="customer-look-grid">
        <router-link v-for="p in completeTheLook" :key="p.id" :to="`/product-detail/${p.id}`" class="customer-look-item">
          <img :src="p.imageUrl || FALLBACK_IMAGE" :alt="p.name" @error="onImgError" />
          <div>
            <span class="customer-look-cat">{{ p.categoryName || 'Phụ kiện' }}</span>
            <strong>{{ p.name }}</strong>
            <span class="customer-look-price">{{ formatVND(p.basePrice) }}</span>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>
