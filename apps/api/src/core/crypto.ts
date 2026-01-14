import crypto from "crypto";

const KEY_ENV = "STEAM_SECRET_KEY";
const IV_LENGTH = 12;

export type EncryptedPayload = {
  payloadEnc: string;
  payloadIv: string;
  payloadTag: string;
};

function getKey(): Buffer {
  const rawKey = process.env[KEY_ENV];

  if (!rawKey) {
    throw new Error(`${KEY_ENV} is not set`);
  }

  const key = Buffer.from(rawKey, "base64");

  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be 32 bytes (base64-encoded)`);
  }

  return key;
}

export function encryptJson(payload: unknown): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    payloadEnc: ciphertext.toString("base64"),
    payloadIv: iv.toString("base64"),
    payloadTag: tag.toString("base64")
  };
}

export function decryptJson<T>(encrypted: EncryptedPayload): T {
  const key = getKey();
  const iv = Buffer.from(encrypted.payloadIv, "base64");
  const tag = Buffer.from(encrypted.payloadTag, "base64");
  const ciphertext = Buffer.from(encrypted.payloadEnc, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return JSON.parse(plaintext.toString("utf8")) as T;
}
