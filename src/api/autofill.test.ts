import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
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

import { downloadFile, getAutofill, setAutofill, uploadFile } from './autofill';

describe('autofill api', () => {
  beforeEach(() => {
    mockClient.get.mockReset();
    mockClient.post.mockReset();
  });

  it('fetches autofill profiles', async () => {
    mockClient.get.mockResolvedValueOnce({ data: [{ id: '1' }] });

    await expect(getAutofill()).resolves.toEqual([{ id: '1' }]);
    expect(mockClient.get).toHaveBeenCalledWith('autofill');
  });

  it('saves autofill profiles', async () => {
    mockClient.post.mockResolvedValueOnce({ data: { saved: true } });
    const data = [{ id: '1', first_name: 'Ada' }];

    await expect(setAutofill(data)).resolves.toEqual({ saved: true });
    expect(mockClient.post).toHaveBeenCalledWith('autofill', { data });
  });

  it('uploads a file as multipart form data', async () => {
    mockClient.post.mockResolvedValueOnce({ data: { url: '/file' } });
    const file = new File(['hi'], 'photo.png', { type: 'image/png' });

    await uploadFile(file);

    expect(mockClient.post).toHaveBeenCalledWith(
      'storage/upload',
      expect.any(FormData),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  });

  it('downloads a file as a blob from an absolute URL', async () => {
    mockClient.get.mockResolvedValueOnce({ data: new Blob(['x']) });

    await downloadFile('https://cdn.example.com/file.pdf');

    expect(mockClient.get).toHaveBeenCalledWith('', {
      baseURL: 'https://cdn.example.com/file.pdf',
      responseType: 'blob',
      withCredentials: true,
    });
  });
});
