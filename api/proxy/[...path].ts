import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios, { AxiosError } from 'axios';

const QURAN_API_BASE = process.env.QURAN_API_BASE!;  // https://apis-prelive.quran.foundation
const CLIENT_ID = process.env.CLIENT_ID!;
const OAUTH_BASE = process.env.OAUTH_BASE!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getContentToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.value;
  }
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await axios.post(
    `${OAUTH_BASE}/oauth2/token`,
    new URLSearchParams({ grant_type: 'client_credentials', scope: 'content search' }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  cachedToken = {
    value: res.data.access_token,
    expiresAt: Date.now() + res.data.expires_in * 1000,
  };
  return cachedToken.value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const upstreamPath = '/' + pathSegments.join('/');

  // Forward query params (minus the internal `path` param)
  const { path: _, ...queryParams } = req.query;

  // Use the user's bearer token if provided, otherwise fall back to client_credentials
  const authHeader = req.headers['authorization'];
  let token: string;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = await getContentToken();
  }

  try {
    const upstream = await axios.request({
      method: req.method as any,
      url: `${QURAN_API_BASE}${upstreamPath}`,
      params: queryParams,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method ?? '') ? req.body : undefined,
      headers: {
        'x-auth-token': token,
        'x-client-id': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });
    return res.status(upstream.status).json(upstream.data);
  } catch (err) {
    const axiosErr = err as AxiosError;
    const data = axiosErr.response?.data ?? { error: 'proxy_error' };
    return res.status(axiosErr.response?.status ?? 500).json(data);
  }
}
