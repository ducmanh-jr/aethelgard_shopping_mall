import { reactive } from 'vue';

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  token: string;
}

const saved = localStorage.getItem('aethelgard_user');
const initialUser: AuthUser | null = saved ? JSON.parse(saved) : null;

export const authState = reactive<{ user: AuthUser | null }>({
  user: initialUser
});

export function setAuth(user: AuthUser) {
  authState.user = user;
  localStorage.setItem('aethelgard_token', user.token);
  localStorage.setItem('aethelgard_user', JSON.stringify(user));
}

export function clearAuth() {
  authState.user = null;
  localStorage.removeItem('aethelgard_token');
  localStorage.removeItem('aethelgard_user');
}
