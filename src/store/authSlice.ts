import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import { api } from '../services/api';

// --- Interfaces & Types ---
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'SUPERADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  rankTier?: string;
  demoBalance?: number;
  bio?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Safely load initial token and cached user from localStorage
const initialToken: string | null = localStorage.getItem('apex_token');
const initialUserRaw: string | null = localStorage.getItem('apex_user');

let initialUser: User | null = null;
if (initialUserRaw) {
  try {
    initialUser = JSON.parse(initialUserRaw);
  } catch {
    localStorage.removeItem('apex_user');
  }
}

const initialState: AuthState = {
  user: initialUser,
  token: initialToken,
  // Authenticated only if BOTH token and cached user exist
  isAuthenticated: Boolean(initialToken && initialUser),
  isLoading: false,
  error: null,
};

// --- Type Guard Helper ---
export const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorPayload | undefined;
    return data?.message || data?.error || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

// --- Async Thunks ---

export const fetchCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data.user;
  } catch (error: unknown) {
    return rejectWithValue(extractErrorMessage(error, 'Failed to restore session.'));
  }
});

// --- Slice ---

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    setAuthSuccess: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;

      // Sync both token & user to localStorage instantly
      localStorage.setItem('apex_token', action.payload.token);
      localStorage.setItem('apex_user', JSON.stringify(action.payload.user));
    },
    setAuthFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;

      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_user');
    },
    updateUserBalance: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.demoBalance = action.payload;
        localStorage.setItem('apex_user', JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        // Keep existing user state during background sync to avoid layout flashing
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('apex_user', JSON.stringify(action.payload));
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload ?? 'Session expired.';

        localStorage.removeItem('apex_token');
        localStorage.removeItem('apex_user');
      });
  },
});

export const {
  setAuthStart,
  setAuthSuccess,
  setAuthFailure,
  logout,
  updateUserBalance,
} = authSlice.actions;

export default authSlice.reducer;