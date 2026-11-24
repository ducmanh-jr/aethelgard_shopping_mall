<script setup lang="ts">
import { computed } from 'vue';
import { evaluatePasswordStrength } from '@/lib/password-strength';

const props = defineProps<{
  password: string;
  id: string;
}>();

const strength = computed(() => (props.password ? evaluatePasswordStrength(props.password) : null));
</script>

<template>
  <div v-if="strength" :id="id" class="mt-2 space-y-1" aria-live="polite">
    <div class="flex items-center justify-between text-xs text-slate-600">
      <span>Độ mạnh mật khẩu</span>
      <span class="font-semibold" :style="{ color: strength.color }">{{ strength.label }}</span>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
      <div
        class="h-full origin-left rounded-full transition-transform duration-200 motion-reduce:transition-none"
        :style="{ transform: `scaleX(${strength.level / 4})`, backgroundColor: strength.color }"
      />
    </div>
    <p class="text-xs text-slate-500">{{ strength.hint }}</p>
  </div>
</template>
