import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeCandleSample } from '../server/lib/marketCandleDiagnostics';

test('empty candle responses are safe to log', () => {
  assert.equal(summarizeCandleSample([]), '(empty array)');
});

test('valid candle samples are serialized', () => {
  assert.equal(summarizeCandleSample([[123, 1, 2]]), '[123,1,2]');
});

test('undefined candle samples do not throw', () => {
  assert.equal(summarizeCandleSample([undefined]), '(unserializable value)');
});

test('sample logging is bounded', () => {
  assert.equal(summarizeCandleSample([{ data: 'x'.repeat(1000) }]).length, 350);
});

test('circular samples do not throw', () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.equal(summarizeCandleSample([circular]), '(unserializable value)');
});
