import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../services/api';
import { extractErrorMessage } from './authSlice';

// --- Interfaces & Types ---
export type TradeSide = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED';

export interface Trade {
  id: string;
  userId?: string;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice?: number;
  pnlPercentage?: number;
  status: TradeStatus;
  createdAt?: string;
  closedAt?: string;
}

export interface OpenTradePayload {
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  tournamentId?: string;
}

export interface CloseTradePayload {
  tradeId: string;
  exitPrice: number;
}

interface TradeState {
  positions: Trade[];
  loading: boolean;
  error: string | null;
}

const initialState: TradeState = {
  positions: [],
  loading: false,
  error: null,
};

// --- Exported Async Thunks ---

export const openTrade = createAsyncThunk<
  Trade,
  OpenTradePayload,
  { rejectValue: string }
>('trades/open', async (tradeData, { rejectWithValue }) => {
  try {
    const response = await api.post<Trade>('/trades/open', tradeData);
    return response.data;
  } catch (error: unknown) {
    return rejectWithValue(extractErrorMessage(error, 'Failed to open trade position.'));
  }
});

export const closeTrade = createAsyncThunk<
  Trade,
  CloseTradePayload,
  { rejectValue: string }
>('trades/close', async (data, { rejectWithValue }) => {
  try {
    const response = await api.post<Trade>('/trades/close', data);
    return response.data;
  } catch (error: unknown) {
    return rejectWithValue(extractErrorMessage(error, 'Failed to close position.'));
  }
});

// --- Slice Definition ---

const tradeSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    setPositions: (state, action: PayloadAction<Trade[]>) => {
      state.positions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      /* Open Trade */
      .addCase(openTrade.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(openTrade.fulfilled, (state, action: PayloadAction<Trade>) => {
        state.loading = false;
        state.positions.unshift(action.payload);
      })
      .addCase(openTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error opening position';
      })

      /* Close Trade */
      .addCase(closeTrade.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        closeTrade.fulfilled,
        (state, action: PayloadAction<Trade, string, { arg: CloseTradePayload }>) => {
          state.loading = false;
          state.positions = state.positions.filter(
            (t) => t.id !== action.meta.arg.tradeId
          );
        }
      )
      .addCase(closeTrade.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Error closing position';
      });
  },
});

// Export Reducer Actions & Default Reducer
export const { setPositions } = tradeSlice.actions;
export default tradeSlice.reducer;