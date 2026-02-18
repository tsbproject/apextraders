import { useEffect, useState, useRef } from 'react';

export const usePriceFeed = (symbol: string = 'btcusdt') => {
  const [price, setPrice] = useState<number | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Only connect if we don't have an active socket or if it's closed
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const streamUrl = `wss://stream.binance.com:9443/ws/${symbol}@trade`;
    const socket = new WebSocket(streamUrl);

    socket.onopen = () => {
      console.log(`[ApexTraders] WebSocket Connected to ${symbol}`);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // 'p' is the price field in Binance trade streams
      if (data.p) {
        setPrice(parseFloat(data.p));
      }
    };

    socket.onerror = (error) => {
      console.error("[ApexTraders] WebSocket Error:", error);
    };

    socket.onclose = () => {
      console.log("[ApexTraders] WebSocket Disconnected");
    };

    ws.current = socket;

    // CLEANUP: This is the most important part to stop the errors
    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [symbol]);

  return price;
};