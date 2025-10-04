const STORAGE_KEY = "task_manager_client_id";

function getCrypto(): Crypto | null {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  return null;
}

function generateClientId(): string {
  const crypto = getCrypto();

  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  if (crypto?.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return (
      `${hex.slice(0, 4).join("")}-` +
      `${hex.slice(4, 6).join("")}-` +
      `${hex.slice(6, 8).join("")}-` +
      `${hex.slice(8, 10).join("")}-` +
      `${hex.slice(10, 16).join("")}`
    );
  }

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  let clientId = localStorage.getItem(STORAGE_KEY);
  if (clientId && clientId.length > 0) {
    return clientId;
  }

  clientId = generateClientId();
  localStorage.setItem(STORAGE_KEY, clientId);
  return clientId;
}
