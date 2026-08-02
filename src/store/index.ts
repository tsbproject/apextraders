// src/store/store.ts
// Use your existing filename if different.

import { configureStore } from '@reduxjs/toolkit';

import priceReducer from './priceSlice';
import tradeReducer from './tradeSlice';
import authReducer from './authSlice';

import { socketMiddleware } from './middleware/socketMiddleware';

// ==========================================
// REDUX STORE
// ==========================================

export const store = configureStore({
  reducer: {
    // Authentication, JWT session and roles
    auth: authReducer,

    // Live market price + provider connection state
    price: priceReducer,

    // Open and closed trading positions
    trades: tradeReducer,
  },

  // ========================================
  // MARKET DATA MIDDLEWARE
  //
  // socketMiddleware is the historical name.
  // It now polls the ApexTraders backend,
  // which retrieves market data from Quidax.
  // ========================================

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      socketMiddleware
    ),
});

// ==========================================
// STORE TYPES
// ==========================================

export type RootState =
  ReturnType<typeof store.getState>;

export type AppDispatch =
  typeof store.dispatch;