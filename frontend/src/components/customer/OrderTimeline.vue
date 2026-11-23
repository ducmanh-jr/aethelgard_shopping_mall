<script setup lang="ts">
import { computed } from 'vue';
import { CUSTOMER_ORDER_STEPS, statusToStepIndex } from '@/lib/customer';

const props = defineProps<{
  status?: string;
  lastLocation?: string;
}>();

const current = computed(() => statusToStepIndex(props.status));
</script>

<template>
  <div v-if="current < 0" class="customer-timeline-cancelled">
    <strong>Đơn hàng đã bị hủy</strong>
    <span v-if="lastLocation">{{ lastLocation }}</span>
  </div>
  <ol v-else class="customer-timeline">
    <li
      v-for="(step, idx) in CUSTOMER_ORDER_STEPS"
      :key="step.key"
      :class="['customer-timeline-step', idx < current ? 'done' : idx === current ? 'current' : 'pending']"
    >
      <span class="customer-timeline-dot">{{ idx < current ? '✓' : idx + 1 }}</span>
      <div class="customer-timeline-text">
        <strong>{{ step.title }}</strong>
        <span>{{ idx === current && lastLocation ? lastLocation : step.desc }}</span>
      </div>
    </li>
  </ol>
</template>
