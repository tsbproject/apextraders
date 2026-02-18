import { configureStore } from '@reduxjs/toolkit';
import priceReducer from './priceSlice';
import tradeReducer from './tradeSlice';
import { socketMiddleware } from './middleware/socketMiddleware';

export const store = configureStore({
  reducer: {
    // Manages real-time BTC price and connection status
    price: priceReducer,
    // Manages active and closed trading positions
    trades: tradeReducer,
  },
  // Adding the custom WebSocket middleware to the default middleware stack
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Recommended when handling high-frequency WebSocket data
    }).concat(socketMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;