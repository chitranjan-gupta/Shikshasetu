import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn(() => 1) },
      response: { use: vi.fn(() => 2) },
    },
  },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockClient),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import {
  changePassword,
  login,
  logout,
  me,
  oauth_google_callback,
  oauth_google_redirect,
  register,
} from './auth';

describe('auth api', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.post).mockReset();
    mockClient.get.mockReset();
    mockClient.post.mockReset();
  });

  it('posts login credentials', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { ok: true } });
    const payload = { email: 'ada@example.com', password: 'secret' };

    await login(payload);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/user/signin'),
      payload,
      { withCredentials: true }
    );
  });

  it('requests google oauth register and login URLs', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} });

    await oauth_google_redirect(true);
    await oauth_google_redirect(false);

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/user/oauth-register'),
      { withCredentials: true }
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/user/oauth-login'),
      { withCredentials: true }
    );
  });

  it('calls oauth success with the provided search params', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: {} });

    await oauth_google_callback('?code=abc');

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/user/oauth-success?code=abc'),
      { withCredentials: true }
    );
  });

  it('posts registration data', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });
    const payload = {
      name: 'Ada',
      email: 'ada@example.com',
      username: 'ada',
      password: 'secret',
    };

    await register(payload);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/user/signup'),
      payload,
      { withCredentials: true }
    );
  });

  it('uses the shared client for session endpoints', async () => {
    mockClient.get.mockResolvedValue({ data: {} });
    mockClient.post.mockResolvedValue({ data: {} });

    await logout();
    await me();
    await changePassword('old', 'new');

    expect(mockClient.get).toHaveBeenCalledWith('user/logout');
    expect(mockClient.get).toHaveBeenCalledWith('user/auth');
    expect(mockClient.post).toHaveBeenCalledWith('user/change-password', {
      currentPassword: 'old',
      newPassword: 'new',
    });
  });
});
