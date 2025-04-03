import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { box, randomBytes } from 'tweetnacl';
import { Message } from '@/types/chat';
import _sodium from 'libsodium-wrappers';

// Initialize sodium
let sodium: typeof _sodium;
const initSodium = async () => {
  await _sodium.ready;
  sodium = _sodium;
};
initSodium();

// Key management
const KEY_STORAGE_KEY = 'chat_encryption_keys';

interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

interface StoredKeys {
  publicKey: string;
  secretKey: string;
}

// Generate new keypair for user
export const generateKeyPair = (): KeyPair => {
  const keyPair = box.keyPair();
  
  // Store keys securely
  const storedKeys: StoredKeys = {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  };
  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(storedKeys));
  
  return keyPair;
};

// Get stored keypair or generate new one
export const getKeyPair = (): KeyPair => {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    const keys: StoredKeys = JSON.parse(stored);
    return {
      publicKey: decodeBase64(keys.publicKey),
      secretKey: decodeBase64(keys.secretKey)
    };
  }
  return generateKeyPair();
};

// Encrypt message content
export const encryptMessage = async (
  message: string,
  recipientPublicKey: Uint8Array
): Promise<{ encrypted: string; nonce: string }> => {
  const senderKeyPair = getKeyPair();
  const nonce = randomBytes(box.nonceLength);
  
  const messageUint8 = new TextEncoder().encode(message);
  const encrypted = box(
    messageUint8,
    nonce,
    recipientPublicKey,
    senderKeyPair.secretKey
  );

  return {
    encrypted: encodeBase64(encrypted),
    nonce: encodeBase64(nonce)
  };
};

// Decrypt message content
export const decryptMessage = async (
  encrypted: string,
  nonce: string,
  senderPublicKey: Uint8Array
): Promise<string> => {
  const recipientKeyPair = getKeyPair();
  
  const decrypted = box.open(
    decodeBase64(encrypted),
    decodeBase64(nonce),
    senderPublicKey,
    recipientKeyPair.secretKey
  );

  if (!decrypted) {
    throw new Error('Failed to decrypt message');
  }

  return new TextDecoder().decode(decrypted);
};

// Encrypt entire message object
export const encryptMessageObject = async (
  message: Message,
  recipientPublicKey: Uint8Array
): Promise<Message> => {
  const { encrypted, nonce } = await encryptMessage(
    message.content,
    recipientPublicKey
  );

  return {
    ...message,
    content: encrypted,
    metadata: {
      ...message.metadata,
      nonce,
      encrypted: true
    }
  };
};

// Decrypt entire message object
export const decryptMessageObject = async (
  message: Message,
  senderPublicKey: Uint8Array
): Promise<Message> => {
  if (!message.metadata?.encrypted) {
    return message;
  }

  const decrypted = await decryptMessage(
    message.content,
    message.metadata.nonce as string,
    senderPublicKey
  );

  return {
    ...message,
    content: decrypted,
    metadata: {
      ...message.metadata,
      encrypted: false,
      nonce: undefined
    }
  };
};

// Verify message integrity
export const verifyMessage = async (message: Message): Promise<boolean> => {
  if (!message.metadata?.signature) {
    return false;
  }

  const messageBytes = new TextEncoder().encode(message.content);
  const signatureBytes = decodeBase64(message.metadata.signature as string);
  const publicKeyBytes = decodeBase64(message.metadata.senderPublicKey as string);

  return sodium.crypto_sign_verify_detached(
    signatureBytes,
    messageBytes,
    publicKeyBytes
  );
};

// Sign message
export const signMessage = async (message: Message): Promise<Message> => {
  const keyPair = getKeyPair();
  const messageBytes = new TextEncoder().encode(message.content);
  
  const signature = sodium.crypto_sign_detached(
    messageBytes,
    keyPair.secretKey
  );

  return {
    ...message,
    metadata: {
      ...message.metadata,
      signature: encodeBase64(signature),
      senderPublicKey: encodeBase64(keyPair.publicKey)
    }
  };
};