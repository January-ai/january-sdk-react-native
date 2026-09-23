import { describe, expect, it, jest } from '@jest/globals';

import { relayTokenProvider } from '../relayTokenProvider';

function relay(body: object, status = 201) {
  return jest.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      }) as Response
  );
}

describe('relay token provider', () => {
  it('asks the relay for a token for the end user the SDK names', async () => {
    const fetch = relay({
      token: 'ct-second',
      expires_in: 1800,
      end_user_id: 'second-user',
    });
    const provider = relayTokenProvider({
      endpoint: 'http://127.0.0.1:8787/api/january/client-token',
      fetch,
    });

    await expect(provider('second-user')).resolves.toEqual({
      token: 'ct-second',
      expiresIn: 1800,
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/api/january/client-token',
      {
        method: 'POST',
        headers: { 'January-End-User-ID': 'second-user' },
      }
    );
  });

  it('mints again for each user rather than reusing a token', async () => {
    const fetch = relay({ token: 'ct', expiresIn: 1800 });
    const provider = relayTokenProvider({ endpoint: 'http://relay', fetch });
    await provider('first-user');
    await provider('second-user');
    const users = fetch.mock.calls.map(
      ([, init]) =>
        (init?.headers as Record<string, string>)['January-End-User-ID']
    );
    expect(users).toEqual(['first-user', 'second-user']);
  });

  it('refuses a token minted for a different end user', async () => {
    const provider = relayTokenProvider({
      endpoint: 'http://relay',
      fetch: relay({
        token: 'ct-first',
        expires_in: 1800,
        end_user_id: 'first-user',
      }),
    });
    await expect(provider('second-user')).rejects.toThrow(
      'a token for first-user, not second-user'
    );
  });

  it('sends the relay token of a hosted relay', async () => {
    const fetch = relay({ token: 'ct', expires_in: 1800 });
    await relayTokenProvider({
      endpoint: 'https://relay.example.com/api/january/client-token',
      sessionToken: 'relay-secret',
      fetch,
    })('user');
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({
      'Authorization': 'Bearer relay-secret',
      'January-End-User-ID': 'user',
    });
  });

  it('fails clearly without an endpoint or with a bad answer', async () => {
    await expect(relayTokenProvider({})('user')).rejects.toThrow(
      'EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT is not configured.'
    );
    await expect(
      relayTokenProvider({ endpoint: 'http://relay', fetch: relay({}, 403) })(
        'user'
      )
    ).rejects.toThrow('Token endpoint returned 403.');
    await expect(
      relayTokenProvider({ endpoint: 'http://relay', fetch: relay({}) })('user')
    ).rejects.toThrow('Token response is malformed.');
  });
});
