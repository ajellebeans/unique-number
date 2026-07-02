/**
 * Unique number counter  --  Cloudflare Worker + Durable Object (backup option).
 *
 * A Durable Object gives a single, strongly-consistent counter, so even
 * simultaneous requests are serialized and no number is ever repeated.
 *
 * This is the alternative to the Apps Script version. Use whichever one
 * is deployed; the web page only needs the resulting URL in ENDPOINT.
 *
 * DEPLOY (needs a free Cloudflare account + wrangler, or the dashboard):
 *   wrangler.toml:
 *     name = "faculty-number-counter"
 *     main = "worker.js"
 *     compatibility_date = "2024-01-01"
 *     [[durable_objects.bindings]]
 *     name = "COUNTER"
 *     class_name = "Counter"
 *     [[migrations]]
 *     tag = "v1"
 *     new_sqlite_classes = ["Counter"]
 *   Then:  wrangler deploy
 *   The page should POST to the worker URL; put that URL in index.html ENDPOINT.
 */

const START_AT = 4000;
// Per-IP soft cap per day. Set well above any legitimate use (a person claims a
// handful of numbers) so it only bites scripted abuse of this public endpoint.
const RL_MAX_PER_DAY = 200;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }
    // One shared instance so every request hits the same counter.
    const id = env.COUNTER.idFromName("faculty-number");
    const stub = env.COUNTER.get(id);
    return stub.fetch(request);
  },
};

export class Counter {
  constructor(state) {
    this.state = state;
  }
  async fetch(request) {
    if (request.method === "GET") {
      const next = (await this.state.storage.get("next")) ?? START_AT;
      return json({ status: "ok", next_number: next, hint: "POST to claim a number" });
    }
    // Fail-open per-IP daily rate limit: deters scripted abuse of this public,
    // unauthenticated endpoint. It must NEVER block a real claim on error, so the
    // whole check is wrapped in try/catch and the atomic increment stays the
    // critical path below.
    try {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const day = new Date().toISOString().slice(0, 10);
      const key = `rl:${ip}:${day}`;
      const used = (await this.state.storage.get(key)) ?? 0;
      if (used >= RL_MAX_PER_DAY) {
        return json({ error: "rate_limited", hint: "Too many requests today; try again tomorrow." }, 429);
      }
      await this.state.storage.put(key, used + 1);
    } catch (e) {
      // fail open: a rate-limit hiccup must not stop a legitimate number claim
    }

    // POST: atomically claim the next number. blockConcurrencyWhile serializes.
    let issued;
    await this.state.blockConcurrencyWhile(async () => {
      const n = (await this.state.storage.get("next")) ?? START_AT;
      await this.state.storage.put("next", n + 1);
      issued = n;
    });
    return json({ number: issued });
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
