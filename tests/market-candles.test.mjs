import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import marketRoutes from '../server/routes/market.ts';

test('Quidax candle normalization preserves array/object forms and rejects invalid data', async (t) => {
  const app = express();
  app.use('/api/market', marketRoutes);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const request = globalThis.fetch;
  let payload;
  const upstream = t.mock.method(globalThis, 'fetch', async () => Response.json(payload));
  const url = `http://127.0.0.1:${server.address().port}/api/market/candles/btcusdt`;
  const expected = { time: 1700000000000, open: 100, close: 105, high: 110, low: 90, volume: 20 };
  for (const data of [
    [[1700000000000, '100', '105', '110', '90', '20']],
    { data: [{ timestamp: 1700000000, open: '100', close: '105', high: '110', low: '90', vol: '20' }] },
  ]) {
    payload = data;
    const response = await request(url);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.provider, 'quidax');
    assert.deepEqual(body.candles, [expected]);
  }
  payload = [[1700000000000, 100, 105, 90, 110, -1], null, 'invalid'];
  assert.equal((await request(url)).status, 502);
  const calls = upstream.mock.callCount();
  assert.equal((await request(`${url}?interval=2`)).status, 400);
  assert.equal(upstream.mock.callCount(), calls);
});
