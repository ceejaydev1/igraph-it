// Tiny in-memory TTL cache — deliberately not Redis/anything external. This
// app runs as a single Node process with no load balancer (see the
// production-readiness conversation this came out of), so a per-process
// Map is the correct amount of infrastructure for it: it cuts real Firestore
// read load and per-request latency on hot, repeated reads (a user's own
// saved-diagrams list, hit on every visit to that screen) without adding a
// service that would only start mattering once this ever runs as more than
// one instance.

const store = new Map();

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
};

const set = (key, value, ttlMs) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const invalidate = (key) => {
  store.delete(key);
};

module.exports = { get, set, invalidate };
