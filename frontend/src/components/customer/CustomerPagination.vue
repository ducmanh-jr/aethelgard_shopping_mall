<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  pageChange: [page: number];
}>();

const pages = computed(() => {
  const result: (number | '...')[] = [];
  const total = props.totalPages;
  const cur = props.currentPage;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) result.push(i);
  } else if (cur <= 4) {
    result.push(1, 2, 3, 4, 5, '...', total);
  } else if (cur >= total - 3) {
    result.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    result.push(1, '...', cur - 1, cur, cur + 1, '...', total);
  }
  return result;
});

function go(p: number) {
  if (p >= 1 && p <= props.totalPages && p !== props.currentPage) {
    emit('pageChange', p);
  }
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination-bar" aria-label="Phân trang sản phẩm">
    <button
      class="pagination-btn pagination-prev"
      type="button"
      :disabled="currentPage <= 1"
      :style="{ opacity: currentPage <= 1 ? 0.35 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }"
      @click="go(currentPage - 1)"
    >
      &larr; Trước
    </button>

    <div class="pagination-numbers">
      <template v-for="(p, idx) in pages" :key="idx">
        <span v-if="p === '...'" class="page-dots">...</span>
        <button
          v-else
          type="button"
          :class="['page-num', p === currentPage ? 'active' : '']"
          :aria-label="`Trang ${p}`"
          :aria-current="p === currentPage ? 'page' : undefined"
          style="border: none; outline: none"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
    </div>

    <button
      class="pagination-btn pagination-next"
      type="button"
      :disabled="currentPage >= totalPages"
      :style="{ opacity: currentPage >= totalPages ? 0.35 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }"
      @click="go(currentPage + 1)"
    >
      Sau &rarr;
    </button>
  </nav>
</template>
