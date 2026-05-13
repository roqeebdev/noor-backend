import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const OAUTH_BASE = process.env.OAUTH_BASE!;
const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { refresh_token } = req.body as { refresh_token: string };

  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh_token' });
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  try {
    const response = await axios.post(
      `${OAUTH_BASE}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
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
    const data = err.response?.data ?? { error: 'refresh_failed' };
    return res.status(err.response?.status ?? 500).json(data);
  }
}
