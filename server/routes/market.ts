// server/routes/market.ts

import { Router, Request, Response } from 'express';

const router = Router();

const QUIDAX_BASE_URL =
  'https://openapi.quidax.io/exchange-open-api/api/v1';

const MARKET_REQUEST_TIMEOUT_MS = 10_000;

// ==========================================
// TYPES
// ==========================================

interface QuidaxTicker {
  high?: string | number;
  vol?: string | number;
  last?: string | number;
  low?: string | number;
  buy?: string | number;
  sell?: string | number;
  open?: string | number;
}

interface QuidaxMarketData {
  ticker?: QuidaxTicker;
  at?: number;
}

interface QuidaxResponse {
  status?: string;
  message?: string;
  data?: Record<string, QuidaxMarketData>;
}

export interface MarketPriceResponse {
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
// HELPERS
// ==========================================

const normalizeMarket = (
  value: string
): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\/_-]/g, '');
};

const parseOptionalNumber = (
  value: string | number | undefined
): number | null => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const createMarketTimestamp = (
  value: number | undefined
): string => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

// ==========================================
// GET MARKET PRICE
//
// GET /api/market/price/:symbol
//
// Examples:
//
// /api/market/price/btcusdt
// /api/market/price/btcngn
// /api/market/price/ethusdt
// /api/market/price/ethngn
// /api/market/price/usdtngn
// ==========================================

router.get(
  '/price/:symbol',

  async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      // ------------------------------------------
      // Normalize requested market
      // ------------------------------------------

      const symbol = normalizeMarket(
        String(req.params.symbol ?? '')
      );

      if (
        !symbol ||
        !/^[a-z0-9]+$/.test(symbol)
      ) {
        return res.status(400).json({
          message:
            'Invalid market symbol.',
        });
      }

      // ------------------------------------------
      // Build Quidax endpoint
      // ------------------------------------------

      const url =
        `${QUIDAX_BASE_URL}/markets/tickers/` +
        encodeURIComponent(symbol);

      // ------------------------------------------
      // Request Quidax
      // ------------------------------------------

      const upstream = await fetch(
        url,
        {
          method: 'GET',

          headers: {
            Accept: 'application/json',

            'User-Agent':
              'ApexTraders/1.0',
          },

          signal: AbortSignal.timeout(
            MARKET_REQUEST_TIMEOUT_MS
          ),
        }
      );

      // ------------------------------------------
      // Handle provider HTTP errors
      // ------------------------------------------

      if (!upstream.ok) {
        console.error(
          `[Market] Quidax returned HTTP ${upstream.status} for ${symbol}`
        );

        return res.status(502).json({
          message:
            'Market data provider request failed.',
        });
      }

      // ------------------------------------------
      // Parse provider response
      // ------------------------------------------

      const payload =
        (await upstream.json()) as QuidaxResponse;

      if (
        payload.status !== 'success'
      ) {
        console.error(
          `[Market] Quidax unsuccessful response for ${symbol}:`,
          payload
        );

        return res.status(502).json({
          message:
            'Market data provider returned an unsuccessful response.',
        });
      }

      // ------------------------------------------
      // Extract requested market
      //
      // Quidax structure:
      //
      // data: {
      //   btcusdt: {
      //     ticker: {...},
      //     at: ...
      //   }
      // }
      // ------------------------------------------

      const market =
        payload.data?.[symbol];

      if (!market) {
        console.error(
          `[Market] Market ${symbol} missing from Quidax response.`
        );

        return res.status(404).json({
          message:
            'Requested market is unavailable.',
        });
      }

      const ticker =
        market.ticker;

      if (!ticker) {
        console.error(
          `[Market] Ticker missing for ${symbol}.`
        );

        return res.status(502).json({
          message:
            'Ticker data unavailable for requested market.',
        });
      }

      // ------------------------------------------
      // Current market price
      // ------------------------------------------

      const price =
        Number(ticker.last);

      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        console.error(
          `[Market] Invalid last price for ${symbol}:`,
          ticker.last
        );

        return res.status(502).json({
          message:
            'Market provider returned an invalid price.',
        });
      }

      // ------------------------------------------
      // Normalize response
      // ------------------------------------------

      const response: MarketPriceResponse = {
        symbol,

        price,

        bid:
          parseOptionalNumber(
            ticker.buy
          ),

        ask:
          parseOptionalNumber(
            ticker.sell
          ),

        high:
          parseOptionalNumber(
            ticker.high
          ),

        low:
          parseOptionalNumber(
            ticker.low
          ),

        volume:
          parseOptionalNumber(
            ticker.vol
          ),

        provider: 'quidax',

        timestamp:
          createMarketTimestamp(
            market.at
          ),
      };

      // ------------------------------------------
      // Prevent long-lived browser/proxy caching.
      //
      // This endpoint represents live market data.
      // ------------------------------------------

      res.setHeader(
        'Cache-Control',
        'no-store, max-age=0'
      );

      return res
        .status(200)
        .json(response);
    } catch (error: unknown) {
      // ------------------------------------------
      // Timeout
      // ------------------------------------------

      if (
        error instanceof Error &&
        (
          error.name === 'TimeoutError' ||
          error.name === 'AbortError'
        )
      ) {
        console.error(
          '[Market] Quidax request timed out:',
          error.message
        );

        return res.status(504).json({
          message:
            'Market data provider timed out.',
        });
      }

      // ------------------------------------------
      // Network / DNS / unexpected error
      // ------------------------------------------

      console.error(
        '[Market] Price fetch error:',
        error
      );

      return res.status(502).json({
        message:
          'Unable to retrieve live market price.',
      });
    }
  }
);

export default router;