export function getSecureRandomInt(maxExclusive: number) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive integer");
  }

  const maxUint32 = 0x100000000;
  const upperBound = maxUint32 - (maxUint32 % maxExclusive);
  const randomBuffer = new Uint32Array(1);

  while (true) {
    globalThis.crypto.getRandomValues(randomBuffer);
    const value = randomBuffer[0] ?? 0;

    if (value < upperBound) {
      return value % maxExclusive;
    }
  }
}
