import type {
  JanuaryClientToken,
  JanuaryTokenProvider,
} from '@januaryai/react-native';

interface RelayOptions {
  /** The token endpoint, such as the local relay's /api/january/client-token. */
  endpoint?: string;
  /** The relay's RELAY_TOKEN, for a relay that is not on this computer. */
  sessionToken?: string;
  fetch?: typeof fetch;
}

/**
 * The demo's client token provider: asks the token relay for a token for the
 * end user the SDK names. A client token decides whose data the API reads and
 * writes, so the SDK asks again, for the new user, whenever the demo switches
 * users (it makes a new client for them); nothing here is cached.
 */
export function relayTokenProvider({
  endpoint,
  sessionToken,
  fetch: request = fetch,
}: RelayOptions): JanuaryTokenProvider {
  return async (endUserId: string): Promise<JanuaryClientToken> => {
    if (!endpoint) {
      throw new Error('EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT is not configured.');
    }
    const response = await request(endpoint, {
      method: 'POST',
      headers: {
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        'January-End-User-ID': endUserId,
      },
    });
    if (!response.ok) {
      throw new Error(`Token endpoint returned ${response.status}.`);
    }
    const body = (await response.json()) as {
      end_user_id?: string;
      expiresIn?: number;
      expires_in?: number;
      token?: string;
    };
    const expiresIn = body.expiresIn ?? body.expires_in;
    if (!body.token || !expiresIn) {
      throw new Error('Token response is malformed.');
    }
    // A token for someone else would read and write their data.
    if (body.end_user_id && body.end_user_id !== endUserId) {
      throw new Error(
        `Token endpoint returned a token for ${body.end_user_id}, not ${endUserId}.`
      );
    }
    return { token: body.token, expiresIn };
  };
}
