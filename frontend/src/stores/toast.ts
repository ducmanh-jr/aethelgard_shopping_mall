import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
  isClosing?: boolean;
}

const toasts = ref<ToastItem[]>([]);

function removeToast(id: string) {
  toasts.value = toasts.value.map((t) => (t.id === id ? { ...t, isClosing: true } : t));
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 250);
}

function showToast(message: string, typeOrDuration?: ToastType | number, durationMs?: number) {
  let type: ToastType = 'info';
  let duration = 3500;

  if (typeof typeOrDuration === 'number') {
    duration = typeOrDuration;
  } else if (typeof typeOrDuration === 'string') {
    type = typeOrDuration;
    if (typeof durationMs === 'number') duration = durationMs;
  }

  if (!typeOrDuration || typeof typeOrDuration === 'number') {
    const lower = message.toLowerCase();
    if (
      lower.includes('thành công') ||
      lower.includes('đã lưu') ||
      lower.includes('đã xóa') ||
      lower.includes('hoàn tất') ||
      lower.includes('cảm ơn') ||
      lower.includes('chúc mừng') ||
      lower.includes('đã thêm') ||
      lower.includes('đã theo dõi')
    ) {
      type = 'success';
    } else if (
      lower.includes('lỗi') ||
      lower.includes('thất bại') ||
      lower.includes('không thể') ||
      lower.includes('sai') ||
      lower.includes('tạm hết hàng') ||
      lower.includes('hết hàng')
    ) {
      type = 'error';
    } else if (
      lower.includes('chú ý') ||
      lower.includes('cảnh báo') ||
      lower.includes('vui lòng') ||
      lower.includes('yêu cầu') ||
      lower.includes('hủy')
    ) {
      type = 'warning';
    }
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  toasts.value = [...toasts.value, { id, message, type, durationMs: duration }];

  setTimeout(() => {
    removeToast(id);
  }, duration);
}

export function useToast() {
  return {
    toasts,
    showToast,
    removeToast,
  };
}
