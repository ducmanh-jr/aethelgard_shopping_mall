import { ref } from 'vue';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
}

const isOpen = ref(false);
const options = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy',
  tone: 'default',
});

let resolver: ((value: boolean) => void) | null = null;

export function useConfirmDialog() {
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = {
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      tone: 'default',
      ...opts,
    };
    isOpen.value = true;
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function handleResolve(result: boolean) {
    isOpen.value = false;
    if (resolver) {
      resolver(result);
      resolver = null;
    }
  }

  return {
    isOpen,
    options,
    confirm,
    handleResolve,
  };
}
