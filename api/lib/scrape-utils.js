const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

function randomDelay(min, max) {
  return sleep(min + Math.floor(Math.random() * (max - min)));
}

const cache = {};
const CACHE_TTL = 30 * 60 * 1000;
const requestLog = {};
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

function getCached(key) {
  var entry = cache[key];
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data: data, time: Date.now() };
  var keys = Object.keys(cache);
  if (keys.length > 50) delete cache[keys[0]];
}

function checkRateLimit(platform) {
  var now = Date.now();
  if (!requestLog[platform]) requestLog[platform] = [];
  requestLog[platform] = requestLog[platform].filter(function(t) { return now - t < RATE_LIMIT_WINDOW; });
  if (requestLog[platform].length >= MAX_REQUESTS_PER_WINDOW) return false;
  requestLog[platform].push(now);
  return true;
}

module.exports = { randomUA, sleep, randomDelay, getCached, setCache, checkRateLimit };
