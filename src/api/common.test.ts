import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

type RequestHandler = (config: {
  headers: Record<string, string>;
}) => { headers: Record<string, string> };

type ResponseHandler = (error: unknown) => Promise<unknown>;

const { mockClient, mockAxios } = vi.hoisted(() => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((onFulfilled: RequestHandler) => Number(Boolean(onFulfilled))),
      },
      response: {
        use: vi.fn((onFulfilled: unknown, onRejected: ResponseHandler) =>
          Number(Boolean(onFulfilled)) + Number(Boolean(onRejected))
        ),
      },
    },
  };
  const mockAxios = Object.assign(vi.fn(), {
    create: vi.fn(() => mockClient),
    get: vi.fn(),
    post: vi.fn(),
  });
  return { mockClient, mockAxios };
});

vi.mock('axios', () => ({
  default: mockAxios,
}));

import {
  setRequestInterceptor,
  setResponseInterceptior,
  uploadPdfs,
} from './common';

describe('common api', () => {
  beforeEach(() => {
    mockClient.interceptors.request.use.mockClear();
    mockClient.interceptors.response.use.mockClear();
    mockAxios.mockReset();
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.post).mockReset();
  });

  it('attaches a bearer token when Authorization is missing', () => {
    setRequestInterceptor({
      token: { access_token: 'access', refresh_token: 'refresh' },
    });

    const onFulfilled = mockClient.interceptors.request.use.mock.calls[0][0];
    const config = { headers: {} as Record<string, string> };

    expect(onFulfilled?.(config).headers.Authorization).toBe('Bearer access');
  });

  it('leaves an existing Authorization header in place', () => {
    setRequestInterceptor({
      token: { access_token: 'access', refresh_token: 'refresh' },
    });

    const onFulfilled = mockClient.interceptors.request.use.mock.calls[0][0];
    const config = {
      headers: { Authorization: 'Bearer existing' },
    };

    expect(onFulfilled?.(config).headers.Authorization).toBe('Bearer existing');
  });

  it('refreshes the access token after a 401', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    setResponseInterceptior({
      token: { access_token: 'old', refresh_token: 'refresh' },
      refresh,
    });

    const onRejected = mockClient.interceptors.response.use.mock.calls[0][1];
    vi.mocked(axios.get).mockResolvedValueOnce({
      status: 200,
      data: { access_token: 'new-access' },
    });
    mockAxios.mockResolvedValueOnce({ data: { ok: true } });

    const originalRequest = {
      _retry: false,
      headers: {} as Record<string, string>,
    };

    const result = await onRejected?.({
      config: originalRequest,
      response: { status: 401 },
    } as unknown as AxiosError);

    expect(refresh).toHaveBeenCalledWith(
      { access_token: 'new-access', refresh_token: 'new-access' },
      false
    );
    expect(originalRequest.headers.Authorization).toBe('Bearer new-access');
    expect(result).toEqual({ data: { ok: true } });
  });

  it('logs the user out when token refresh fails', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    setResponseInterceptior({
      token: { access_token: 'old', refresh_token: 'refresh' },
      refresh,
    });

    const onRejected = mockClient.interceptors.response.use.mock.calls[0][1];
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('network'));
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(
      onRejected?.({
        config: { _retry: false, headers: {} } as InternalAxiosRequestConfig & {
          _retry?: boolean;
        },
        response: { status: 401 },
      } as unknown as AxiosError)
    ).rejects.toBeDefined();

    expect(refresh).toHaveBeenCalledWith(null, true);
    log.mockRestore();
  });

  it('rejects a network error when the response is missing', async () => {
    const refresh = vi.fn();
    setResponseInterceptior({
      token: { access_token: 'old', refresh_token: 'refresh' },
      refresh,
    });

    const onRejected = mockClient.interceptors.response.use.mock.calls[0][1];
    const error = Object.assign(new Error('network'), { config: undefined });

    await expect(onRejected?.(error)).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('uploads pdfs as multipart form data', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { ok: true } });
    const files = {
      length: 1,
      0: new File(['pdf'], 'cv.pdf', { type: 'application/pdf' }),
    } as unknown as FileList;

    await uploadPdfs('https://example.com/upload', files);

    expect(axios.post).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.any(FormData),
      expect.objectContaining({
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  });
});
