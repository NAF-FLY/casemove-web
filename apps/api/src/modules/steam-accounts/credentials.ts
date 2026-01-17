import { supabaseAdmin } from "../../core/supabase";
import { encryptJson, decryptJson, type EncryptedPayload } from "../../core/crypto";

type StoredCredentials = {
  refreshToken: string;
};

export async function saveRefreshToken(
  steamAccountId: string,
  refreshToken: string
): Promise<void> {
  const payload: StoredCredentials = { refreshToken };
  const encrypted = encryptJson(payload);

  await supabaseAdmin
    .from("steam_credentials")
    .upsert({
      steam_account_id: steamAccountId,
      payload_enc: encrypted.payloadEnc,
      payload_iv: encrypted.payloadIv,
      payload_tag: encrypted.payloadTag,
      key_version: 1,
      updated_at: new Date().toISOString(),
      revoked_at: null
    });

  console.log(`Refresh token saved for account ${steamAccountId}`);
}

export async function getRefreshToken(
  steamAccountId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("steam_credentials")
    .select("payload_enc, payload_iv, payload_tag, revoked_at")
    .eq("steam_account_id", steamAccountId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Check if token was revoked
  if (data.revoked_at) {
    return null;
  }

  try {
    const encrypted: EncryptedPayload = {
      payloadEnc: data.payload_enc,
      payloadIv: data.payload_iv,
      payloadTag: data.payload_tag
    };
    const decrypted = decryptJson<StoredCredentials>(encrypted);
    return decrypted.refreshToken;
  } catch {
    console.warn(`Failed to decrypt refresh token for account ${steamAccountId}`);
    return null;
  }
}

export async function revokeRefreshToken(steamAccountId: string): Promise<void> {
  await supabaseAdmin
    .from("steam_credentials")
    .update({ revoked_at: new Date().toISOString() })
    .eq("steam_account_id", steamAccountId);
}
