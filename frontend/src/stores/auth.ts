import { computed, reactive } from 'vue';
import { STORAGE_KEYS } from '@/lib/constants';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

function loadInitialAuth(): { user: AuthUser | null; token: string | null } {
  try {
    const storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (storedToken && storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed && !parsed.id && parsed.userId) parsed.id = parsed.userId;
      return { user: parsed, token: storedToken };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }
  return { user: null, token: null };
}

const initial = loadInitialAuth();

export const authState = reactive<AuthState>({
  user: initial.user,
  token: initial.token,
  isLoading: false,
});

export function setAuthState(newToken: string, newUser: AuthUser) {
  const userWithId = { ...newUser, id: newUser.id ?? newUser.userId };
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userWithId));
  authState.token = newToken;
  authState.user = userWithId;
}

export function clearAuthState() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_PATH);
  authState.token = null;
  authState.user = null;
}

export function useAuth(router?: { replace: (path: string) => unknown }) {
  const isAuthenticated = computed(() => !!authState.token);

  function login(newToken: string, newUser: AuthUser) {
    setAuthState(newToken, newUser);
    if (!router) return;

    const isCustomer = newUser.role === 'Customer';
    const isAdmin = newUser.role === 'Admin';
    const defaultPath = isAdmin ? '/admin' : isCustomer ? '/shop' : '/';
    const saved = sessionStorage.getItem(STORAGE_KEYS.REDIRECT_PATH);
    const isInvalidSaved =
      !saved ||
      saved === '/' ||
      saved === '/login' ||
      (isCustomer &&
        (saved === '/' ||
          saved.startsWith('/inventory') ||
          saved.startsWith('/orders') ||
          saved.startsWith('/income')));
    const redirect = isInvalidSaved ? defaultPath : saved;
    sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_PATH);
    router.replace(redirect);
  }

  function logout() {
    clearAuthState();
    router?.replace('/login');
  }

  return {
    state: authState,
    user: computed(() => authState.user),
    token: computed(() => authState.token),
    isAuthenticated,
    isLoading: computed(() => authState.isLoading),
    login,
    logout,
  };
}
