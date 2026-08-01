import { api } from './api';

export interface OpenTradePayload {
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  tournamentId?: string;
}

export interface CloseTradePayload {
  tradeId: string;
  exitPrice: number;
}

/**
 * Open a trade (automatically attaches Authorization Bearer JWT)
 */
export const openTradeApi = async (payload: OpenTradePayload) => {
  const response = await api.post('/trades/open', payload);
  return response.data;
};

/**
 * Close an active trade (automatically attaches Authorization Bearer JWT)
 */
export const closeTradeApi = async (payload: CloseTradePayload) => {
  const response = await api.post('/trades/close', payload);
  return response.data;
};