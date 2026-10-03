/* Batas pemakaian supaya tagihan AI tidak membengkak.
   - Jika UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN diisi: batas berlaku di semua server (disarankan untuk produksi).
   - Jika tidak: batas sederhana per server (cukup untuk uji coba). */

const memory = new Map();

function memoryHit(key, windowSec) {
  const now = Date.now();
  const e = memory.get(key);
  if (!e || e.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSec * 1000 });
    if (memory.size > 5000) for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
    return 1;
  }
  e.count += 1;
  return e.count;
}

async function redisHit(key, windowSec) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(url + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSec), "NX"]])
  });
  if (!res.ok) throw new Error("redis " + res.status);
  const data = await res.json();
  return Number(data[0].result);
}

/* Mengembalikan true jika permintaan masih boleh. */
export async function allow(key, limit, windowSec) {
  let count;
  try {
    count = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? await redisHit("dh:" + key, windowSec)
      : memoryHit(key, windowSec);
  } catch (e) {
    count = memoryHit(key, windowSec); // Redis bermasalah: tetap jalan dengan batas lokal
  }
  return count <= limit;
}

export function clientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "");
  return (fwd.split(",")[0] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown").trim();
}
