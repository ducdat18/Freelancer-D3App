import type { NextApiRequest, NextApiResponse } from 'next';

const GATEWAYS = [
  process.env.NEXT_PUBLIC_IPFS_GATEWAY
    ? process.env.NEXT_PUBLIC_IPFS_GATEWAY.replace(/\/+$/, '') + '/'
    : null,
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
].filter(Boolean) as string[];

// Basic CID validation — only allow known-safe CID formats
function isValidCid(cid: string): boolean {
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{50,})$/.test(cid);
}

export const config = {
  api: { responseLimit: '20mb' },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cid } = req.query;

  if (typeof cid !== 'string' || !isValidCid(cid)) {
    return res.status(400).json({ error: 'Invalid CID' });
  }

  for (const gateway of GATEWAYS) {
    const url = `${gateway}${cid}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), 15000);

      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/pdf,text/plain,*/*' },
      });

      if (timer) { clearTimeout(timer); timer = null; }
      if (!upstream.ok) continue;

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await upstream.arrayBuffer());

      // Force inline display regardless of upstream Content-Disposition
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.status(200).send(buffer);
      return;
    } catch {
      if (timer) clearTimeout(timer);
      continue;
    }
  }

  res.status(502).json({ error: 'Could not fetch file from IPFS gateways' });
}
