/** Пауза между HTTP-запросами. */
export function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

export async function throttle(lastAt, delayMs){
  if(lastAt == null) return Date.now();
  const elapsed = Date.now() - lastAt;
  if(elapsed < delayMs) await sleep(delayMs - elapsed);
  return Date.now();
}
