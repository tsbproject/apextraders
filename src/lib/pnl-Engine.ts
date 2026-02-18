export type TradeSide = 'BUY' | 'SELL';

/**
 * Calculates percentage PnL for a non-leveraged trade
 */
export const calculatePnL = (
  entryPrice: number, 
  currentPrice: number, 
  side: TradeSide
): number => {
  if (entryPrice === 0) return 0;

  let pnl = 0;
  if (side === 'BUY') {
    pnl = ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    pnl = ((entryPrice - currentPrice) / entryPrice) * 100;
  }

  return parseFloat(pnl.toFixed(4));
};