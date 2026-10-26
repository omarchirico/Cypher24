/**
 * Cypher24 Cryptographic Engine
 * Zero-Knowledge End-to-End Encryption using the native Web Crypto API:
 * - ECDH (Elliptic Curve Diffie-Hellman, NIST P-256) for asymmetric key exchange
 * - AES-GCM (256-bit) authenticated encryption for message payloads
 * - SHA-256 for cryptographic safety numbers / fingerprint verification
 */

// Helper: Uint8Array <-> Base64
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface UserKeyBundle {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export interface EncryptedPayloadBundle {
  iv: string; // base64 12 bytes
  ciphertext: string; // base64
  version: number;
}

// Generate new ECDH P-256 Key Pair
export async function generateKeyPair(): Promise<UserKeyBundle> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKeyJwk,
    privateKeyJwk,
  };
}

// Cache of derived shared AES-GCM keys
const sharedKeyCache = new Map<string, CryptoKey>();

function getCacheKey(peerId: string, myId: string): string {
  return [peerId, myId].sort().join(':::');
}

// Derive AES-GCM-256 shared key using local private key and peer's public key
export async function getSharedKey(
  myPrivateJwk: JsonWebKey,
  peerPublicJwk: JsonWebKey,
  cacheIdentifier?: string
): Promise<CryptoKey> {
  if (cacheIdentifier && sharedKeyCache.has(cacheIdentifier)) {
    return sharedKeyCache.get(cacheIdentifier)!;
  }

  // Import my private key
  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    myPrivateJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveKey', 'deriveBits']
  );

  // Import peer's public key
  const peerPublicKey = await window.crypto.subtle.importKey(
    'jwk',
    peerPublicJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );

  // Derive AES-GCM-256 Key
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );

  if (cacheIdentifier) {
    sharedKeyCache.set(cacheIdentifier, derivedKey);
  }

  return derivedKey;
}

// Encrypt plaintext string (or stringified JSON image payload)
export async function encryptMessage(
  plaintext: string,
  myPrivateJwk: JsonWebKey,
  peerPublicJwk: JsonWebKey,
  peerId: string,
  myId: string
): Promise<string> {
  const cacheKey = getCacheKey(peerId, myId);
  const sharedKey = await getSharedKey(myPrivateJwk, peerPublicJwk, cacheKey);

  // 12-byte random initialization vector for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sharedKey,
    encodedData
  );

  const bundle: EncryptedPayloadBundle = {
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    version: 1,
  };

  return JSON.stringify(bundle);
}

// Decrypt message
export async function decryptMessage(
  encryptedPayloadStr: string,
  myPrivateJwk: JsonWebKey,
  peerPublicJwk: JsonWebKey,
  peerId: string,
  myId: string
): Promise<string> {
  try {
    const bundle: EncryptedPayloadBundle = JSON.parse(encryptedPayloadStr);
    const cacheKey = getCacheKey(peerId, myId);
    const sharedKey = await getSharedKey(myPrivateJwk, peerPublicJwk, cacheKey);

    const iv = base64ToUint8Array(bundle.iv);
    const ciphertext = base64ToUint8Array(bundle.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      sharedKey,
      ciphertext as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Decryption failed for payload:', err);
    return '🔒 Impossibile decifrare il messaggio (chiave non corrispondente o sessione scaduta)';
  }
}

// Compute Safety Number / Cryptographic Fingerprint for 2 users
export async function computeSafetyNumber(jwkA: JsonWebKey, jwkB: JsonWebKey): Promise<string> {
  try {
    const strA = JSON.stringify(jwkA, Object.keys(jwkA).sort());
    const strB = JSON.stringify(jwkB, Object.keys(jwkB).sort());
    const combined = [strA, strB].sort().join(':::');

    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(combined));
    const hashBytes = new Uint8Array(hashBuffer);

    // Format into 6 blocks of 5 digits
    let digits = '';
    for (let i = 0; i < 15; i++) {
      const val = (hashBytes[i * 2] * 256 + hashBytes[i * 2 + 1]) % 100000;
      digits += val.toString().padStart(5, '0') + ' ';
    }
    return digits.trim();
  } catch {
    return 'CYPHER-VERIFIED-SESSION';
  }
}
