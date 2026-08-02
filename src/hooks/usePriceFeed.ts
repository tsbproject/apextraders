// src/hooks/usePriceFeed.ts

import {
  useEffect,
  useState,
} from 'react';

import { api } from '../services/api';

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
// CONFIG
// ==========================================

// Quidax is REST-based here, so we poll the
// ApexTraders backend instead of opening a
// Binance WebSocket.
//
// 2500ms is frequent enough for the current
// trading simulator without hammering Quidax.
const PRICE_REFRESH_INTERVAL = 2500;

// ==========================================
// NORMALIZE SYMBOL
// ==========================================

const normalizeSymbol = (
  symbol: string
): string => {
  return symbol
    .trim()
    .toLowerCase()
    .replace(/[\/_-]/g, '');
};

// ==========================================
// PRICE FEED HOOK
// ==========================================

export const usePriceFeed = (
  symbol: string = 'btcusdt'
): number | null => {
  const [price, setPrice] =
    useState<number | null>(null);

  useEffect(() => {
    const market =
      normalizeSymbol(symbol);

    if (!market) {
      setPrice(null);
      return;
    }

    let mounted = true;

    let requestInProgress = false;

    const controller =
      new AbortController();

    // ========================================
    // FETCH PRICE
    // ========================================

    const fetchPrice =
      async (): Promise<void> => {
        // Prevent overlapping requests if
        // Quidax/backend responds slowly.
        if (requestInProgress) {
          return;
        }

        requestInProgress = true;

        try {
          const response =
            await api.get<MarketPriceResponse>(
              `/market/price/${encodeURIComponent(
                market
              )}`,
              {
                signal:
                  controller.signal,
              }
            );

          if (!mounted) {
            return;
          }

          const nextPrice =
            Number(
              response.data.price
            );

          if (
            Number.isFinite(
              nextPrice
            ) &&
            nextPrice > 0
          ) {
            setPrice(nextPrice);
          }
        } catch (error: unknown) {
          if (!mounted) {
            return;
          }

          // Do not destroy the last valid
          // market price because of one
          // temporary provider/network failure.
          console.error(
            `[ApexTraders] Failed to retrieve ${market} price:`,
            error
          );
        } finally {
          requestInProgress =
            false;
        }
      };

    // ========================================
    // INITIAL REQUEST
    // ========================================

    void fetchPrice();

    // ========================================
    // POLLING
    // ========================================

    const intervalId =
      window.setInterval(
        () => {
          void fetchPrice();
        },
        PRICE_REFRESH_INTERVAL
      );

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      mounted = false;

      window.clearInterval(
        intervalId
      );

      controller.abort();
    };
  }, [symbol]);

  return price;
};

export default usePriceFeed;