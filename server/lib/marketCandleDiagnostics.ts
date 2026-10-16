// Log only a bounded sample; empty upstream arrays must not throw.
export const summarizeCandleSample = (rows: unknown[]): string => {
  if (rows.length === 0) return '(empty array)';
  try {
    const encoded = JSON.stringify(rows[0]);
    return typeof encoded === 'string' ? encoded.slice(0, 350) : '(unserializable value)';
  } catch {
    return '(unserializable value)';
  }
};
