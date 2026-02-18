import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// --- Types ---
export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  amount: number;
  status: 'OPEN' | 'CLOSED';
  pnlPercentage?: number;
}

interface TradeState {
  positions: Trade[];
  loading: boolean;
}

const initialState: TradeState = {
  positions: [],
  loading: false,
};

// --- Thunks (Phase 2: Backend Sync) ---
export const openTrade = createAsyncThunk(
  'trades/open',
  async (tradeData: { userId: string; symbol: string; side: string; entryPrice: number }) => {
    const response = await fetch('http://localhost:3001/api/trades/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeData),
    });
    return (await response.json()) as Trade;
  }
);

export const closeTrade = createAsyncThunk(
  'trades/close',
  async (data: { tradeId: string; exitPrice: number }) => {
    const response = await fetch('http://localhost:3001/api/trades/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await response.json()) as Trade;
  }
);

// --- Slice ---
const tradeSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    // Manual state sync if needed
    setPositions: (state, action: PayloadAction<Trade[]>) => {
      state.positions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      /* Handle Opening */
      .addCase(openTrade.fulfilled, (state, action) => {
        state.positions.push(action.payload);
      })
      /* Handle Closing (The "Merge" Logic) */
      .addCase(closeTrade.fulfilled, (state, action) => {
        // Remove the position from the active list as it is now CLOSED
        state.positions = state.positions.filter(
          (t) => t.id !== action.meta.arg.tradeId
        );
      });
  },
});

export const { setPositions } = tradeSlice.actions;
export default tradeSlice.reducer;