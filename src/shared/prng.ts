/** Mulberry32. `state` is updated in place so the sequence can be persisted. */
export function nextUnit(state: { value: number }): number {
  state.value = (state.value + 0x6d2b79f5) >>> 0
  let t = state.value
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
