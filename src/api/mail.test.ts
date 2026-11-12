import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  addAccount,
  delAccount,
  delMessage,
  getAccount,
  getDomain,
  getDomains,
  getMe,
  getMessage,
  getMessages,
  getToken,
  patchMessage,
} from './mail';

describe('mail api', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.patch).mockReset();
    vi.mocked(axios.delete).mockReset();
  });

  it('lists and fetches domains', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });

    await getDomains();
    await getDomain('abc');

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/domains?page=1')
    );
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/domains/abc')
    );
  });

  it('creates accounts and tokens', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    const account = { address: 'ada@mail.com', password: 'secret' };

    await addAccount(account);
    await getToken(account);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/accounts'),
      account
    );
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/token'),
      account
    );
  });

  it('sends bearer tokens on authenticated reads and deletes', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} });
    vi.mocked(axios.delete).mockResolvedValue({ data: {} });
    vi.mocked(axios.patch).mockResolvedValue({ data: {} });

    await getAccount('id-1', 'tok');
    await getMe('tok');
    await getMessages('tok');
    await getMessage('m1', 'tok');
    await patchMessage('m1', 'tok');
    await delMessage('m1', 'tok');
    await delAccount('id-1', 'tok');

    const auth = { headers: { Authorization: 'Bearer tok' } };
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/id-1'),
      auth
    );
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/me'), auth);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      auth
    );
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining('/messages/m1'),
      undefined,
      auth
    );
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/messages/m1'),
      auth
    );
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/id-1'),
      auth
    );
  });
});
