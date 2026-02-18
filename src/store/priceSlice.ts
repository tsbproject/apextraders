import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PriceState {
  btc: number | null;
  status: 'connected' | 'disconnected' | 'connecting';
}

const initialState: PriceState = {
  btc: null,
  status: 'disconnected',
};

const priceSlice = createSlice({
  name: 'price',
  initialState,
  reducers: {
    updatePrice: (state, action: PayloadAction<number>) => {
      state.btc = action.payload;
    },
    setConnectionStatus: (state, action: PayloadAction<PriceState['status']>) => {
      state.status = action.payload;
    },
  },
});

export const { updatePrice, setConnectionStatus } = priceSlice.actions;
export default priceSlice.reducer;