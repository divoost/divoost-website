// SNS 액세스 토큰 암/복호화 (AES-256-GCM)
// 키는 Edge Function 환경변수 TOKEN_ENC_KEY(base64 32바이트)에만 존재. DB엔 암호문만 저장.
// 저장 형식: base64(iv) + "." + base64(ciphertext+tag)

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(rawKeyB64: string): Promise<CryptoKey> {
  const raw = b64decode(rawKeyB64);
  if (raw.length !== 32) {
    throw new Error("TOKEN_ENC_KEY는 base64 인코딩된 32바이트(256비트)여야 합니다");
  }
  // @ts-ignore Deno/Web Crypto
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plain: string, rawKeyB64: string): Promise<string> {
  if (!rawKeyB64) throw new Error("TOKEN_ENC_KEY 미설정");
  const key = await importKey(rawKeyB64);
  // @ts-ignore Web Crypto
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plain);
  // @ts-ignore Web Crypto
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
  return b64encode(iv) + "." + b64encode(cipher);
}

export async function decryptToken(stored: string, rawKeyB64: string): Promise<string> {
  if (!rawKeyB64) throw new Error("TOKEN_ENC_KEY 미설정");
  const dot = stored.indexOf(".");
  if (dot < 0) throw new Error("암호문 형식 오류");
  const iv = b64decode(stored.slice(0, dot));
  const cipher = b64decode(stored.slice(dot + 1));
  const key = await importKey(rawKeyB64);
  // @ts-ignore Web Crypto
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}
