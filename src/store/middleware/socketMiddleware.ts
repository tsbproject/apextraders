// src/store/middleware/socketMiddleware.ts

import {
  Middleware,
  UnknownAction,
} from '@reduxjs/toolkit';

import {
  updatePrice,
  setConnectionStatus,
} from '../priceSlice';

import { api } from '../../services/api';
import { NotifyError } from '../../utils/notifications';

// ==========================================
// TYPES
// ==========================================

interface MarketPriceResponse {
  symbol: string;
  price: number;
  bid: number | null;
  ask: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  provider: 'quidax';
  timestamp: string;
}

// ==========================================
// CONFIGURATION
// ==========================================

const DEFAULT_SYMBOL = 'btcusdt';

const POLL_INTERVAL_MS = 2500;

// ==========================================
// SINGLETON STATE
//
// Middleware exists for the lifetime of the
// Redux store, so keep one polling instance.
// ==========================================

let pollingTimer: ReturnType<
  typeof setInterval
> | null = null;

let requestInProgress = false;

let isStreaming = false;

let hasShownConnectionError = false;

let activeSymbol = DEFAULT_SYMBOL;

// ==========================================
// HELPERS
// ==========================================

const normalizeSymbol = (
  value: string
): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\/_-]/g, '');
};

// ==========================================
// SOCKET MIDDLEWARE
//
// Historical filename kept so existing store
// imports do not need to change.
//
// This NO LONGER creates a WebSocket.
//
// Price flow:
//
// Redux
//   ↓
// Apex API
//   ↓
// /api/market/price/:symbol
//   ↓
// Quidax
// ==========================================

export const socketMiddleware:
  Middleware =
  (store) => {

    // ========================================
    // FETCH PRICE
    // ========================================

    const fetchPrice =
      async (): Promise<void> => {
        if (
          requestInProgress ||
          !isStreaming
        ) {
          return;
        }

        requestInProgress = true;

        try {
          const response =
            await api.get<MarketPriceResponse>(
              `/market/price/${encodeURIComponent(
                activeSymbol
              )}`
            );

          const nextPrice =
            Number(
              response.data.price
            );

          if (
            !Number.isFinite(
              nextPrice
            ) ||
            nextPrice <= 0
          ) {
            throw new Error(
              'Market provider returned an invalid price.'
            );
          }

          // ----------------------------------
          // Update Redux market price
          // ----------------------------------

          store.dispatch(
            updatePrice(nextPrice)
          );

          // ----------------------------------
          // Feed is healthy
          // ----------------------------------

          store.dispatch(
            setConnectionStatus(
              'connected'
            )
          );

          // Allow another error notification
          // if the connection later fails.
          hasShownConnectionError =
            false;

        } catch (error: unknown) {
          console.error(
            `[ApexTraders] Market feed error for ${activeSymbol}:`,
            error
          );

          store.dispatch(
            setConnectionStatus(
              'disconnected'
            )
          );

          // Avoid displaying a notification
          // every 2.5 seconds during an outage.
          if (
            !hasShownConnectionError
          ) {
            hasShownConnectionError =
              true;

            NotifyError(
              'ApexTraders: Live market feed temporarily unavailable.'
            );
          }
        } finally {
          requestInProgress =
            false;
        }
      };

    // ========================================
    // START STREAMING
    // ========================================

    const startStreaming =
      (
        requestedSymbol?: string
      ): void => {

        if (
          requestedSymbol &&
          requestedSymbol.trim()
        ) {
          activeSymbol =
            normalizeSymbol(
              requestedSymbol
            );
        }

        if (!activeSymbol) {
          activeSymbol =
            DEFAULT_SYMBOL;
        }

        // Already running.
        if (
          isStreaming &&
          pollingTimer
        ) {
          return;
        }

        console.log(
          `🔗 ApexTraders: Starting Quidax market feed for ${activeSymbol}...`
        );

        isStreaming = true;

        store.dispatch(
          setConnectionStatus(
            'connecting'
          )
        );

        // Fetch immediately instead of waiting
        // for the first interval.
        void fetchPrice();

        pollingTimer =
          setInterval(
            () => {
              void fetchPrice();
            },
            POLL_INTERVAL_MS
          );
      };

    // ========================================
    // STOP STREAMING
    // ========================================

    const stopStreaming =
      (): void => {

        isStreaming = false;

        requestInProgress = false;

        if (pollingTimer) {
          clearInterval(
            pollingTimer
          );

          pollingTimer = null;
        }

        store.dispatch(
          setConnectionStatus(
            'disconnected'
          )
        );

        console.log(
          '🛑 ApexTraders: Market feed stopped.'
        );
      };

    // ========================================
    // REDUX ACTION HANDLER
    // ========================================

    return (next) =>
      (
        action: unknown
      ) => {

        const result =
          next(action);

        if (
          typeof action !== 'object' ||
          action === null ||
          !('type' in action)
        ) {
          return result;
        }

        const reduxAction =
          action as UnknownAction & {
            payload?: unknown;
          };

        // ------------------------------------
        // START
        // ------------------------------------

        if (
          reduxAction.type ===
          'price/startStreaming'
        ) {
          const requestedSymbol =
            typeof reduxAction.payload ===
            'string'
              ? reduxAction.payload
              : undefined;

          startStreaming(
            requestedSymbol
          );
        }

        // ------------------------------------
        // STOP
        // ------------------------------------

        if (
          reduxAction.type ===
          'price/stopStreaming'
        ) {
          stopStreaming();
        }

        return result;
      };
  };

export default socketMiddleware;