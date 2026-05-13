import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const OAUTH_BASE = process.env.OAUTH_BASE!;
const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, redirect_uri, code_verifier } = req.body as {
    code: string;
    redirect_uri: string;
    code_verifier: string;
  };

  if (!code || !redirect_uri || !code_verifier) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post(
      `${OAUTH_BASE}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        code_verifier,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return res.status(200).json(response.data);
  } catch (err: any) {
    const data = err.response?.data ?? { error: 'token_exchange_failed' };
    return res.status(err.response?.status ?? 500).json(data);
  }
}
