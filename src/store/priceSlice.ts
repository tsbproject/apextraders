// src/store/priceSlice.ts

import {
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

// ==========================================
// TYPES
// ==========================================

export type PriceConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting';

export interface PriceState {
  // Current BTC market price.
  btc: number | null;

  // Current market being streamed.
  symbol: string;

  // Market feed connection state.
  status: PriceConnectionStatus;

  // Timestamp of most recent successful update.
  lastUpdated: string | null;
}

// ==========================================
// INITIAL STATE
// ==========================================

const initialState: PriceState = {
  btc: null,

  symbol: 'btcusdt',

  status: 'disconnected',

  lastUpdated: null,
};

// ==========================================
// SLICE
// ==========================================

const priceSlice = createSlice({
  name: 'price',

  initialState,

  reducers: {
    // ========================================
    // START MARKET STREAM
    //
    // Middleware listens for this action.
    // ========================================

    startStreaming: (
      state,
      action: PayloadAction<
        string | undefined
      >
    ) => {
      const requestedSymbol =
        action.payload
          ?.trim()
          .toLowerCase()
          .replace(/[\/_-]/g, '');

      if (requestedSymbol) {
        state.symbol =
          requestedSymbol;
      }

      state.status =
        'connecting';
    },

    // ========================================
    // STOP MARKET STREAM
    // ========================================

    stopStreaming: (
      state
    ) => {
      state.status =
        'disconnected';
    },

    // ========================================
    // UPDATE CURRENT PRICE
    // ========================================

    updatePrice: (
      state,
      action: PayloadAction<number>
    ) => {
      const price =
        Number(action.payload);

      if (
        Number.isFinite(price) &&
        price > 0
      ) {
        state.btc = price;

        state.lastUpdated =
          new Date().toISOString();
      }
    },

    // ========================================
    // CONNECTION STATUS
    // ========================================

    setConnectionStatus: (
      state,
      action: PayloadAction<
        PriceConnectionStatus
      >
    ) => {
      state.status =
        action.payload;
    },

    // ========================================
    // CHANGE MARKET
    //
    // Useful later for ETH/USDT,
    // BTC/NGN, ETH/NGN, etc.
    // ========================================

    setMarketSymbol: (
      state,
      action: PayloadAction<string>
    ) => {
      const symbol =
        action.payload
          .trim()
          .toLowerCase()
          .replace(/[\/_-]/g, '');

      if (symbol) {
        state.symbol =
          symbol;
      }
    },

    // ========================================
    // RESET PRICE
    // ========================================

    resetPrice: (
      state
    ) => {
      state.btc = null;

      state.lastUpdated =
        null;

      state.status =
        'disconnected';
    },
  },
});

// ==========================================
// ACTION EXPORTS
// ==========================================

export const {
  startStreaming,
  stopStreaming,
  updatePrice,
  setConnectionStatus,
  setMarketSymbol,
  resetPrice,
} = priceSlice.actions;

// ==========================================
// REDUCER
// ==========================================

export default priceSlice.reducer;