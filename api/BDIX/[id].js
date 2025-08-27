// api/BDIX/[id].js
export default async function handler(req, res) {
  try {
    // Accept either path param or ?id=
    let id = req.query?.id ?? null;
    if (Array.isArray(id)) id = id[0];
    if (!id && typeof req.query === 'object') id = req.query.id;
    if (!id) return res.status(400).send('Missing stream id');

    // Strip ".m3u8" if user requests /api/BDIX/244978.m3u8
    id = String(id).replace(/\.m3u8$/i, '');

    // Base Xtream URL (replace with your own if different)
    const baseXtream = 'http://opplex.tv:8080/live/Jamal3m/Lhr@3m';
    const sourceUrl = `${baseXtream}/${id}.m3u8`;

    // Fetch playlist, follow redirects
  const upstreamResp = await fetch(sourceUrl, {
  redirect: 'follow',
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "http://opplex.tv/",
    "Origin": "http://opplex.tv",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive"
  }
});


    if (!upstreamResp.ok) {
      return res
        .status(upstreamResp.status)
        .send(`Upstream returned ${upstreamResp.status}`);
    }

    const finalUrl = upstreamResp.url;
    if (!finalUrl) return res.status(500).send('Failed to resolve redirect.');

    let playlist = await upstreamResp.text();

    // Build base URL (scheme + host + optional port)
    const u = new URL(finalUrl);
    const baseUrl = `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;

    const isAbsolute = (s) =>
      s.startsWith('http://') ||
      s.startsWith('https://') ||
      s.startsWith('//') ||
      s.startsWith('data:');

    // Replace URIs inside quotes (URI="...ts", KEY="...key", etc.)
    playlist = playlist.replace(
      /(["'])([^"']+\.(?:ts|m4s|mp4|key|aac|m3u8)(?:\?[^"']*)?)\1/gi,
      (match, quote, url) => {
        if (isAbsolute(url)) {
          if (url.startsWith('//')) return `${quote}${u.protocol}${url}${quote}`;
          return `${quote}${url}${quote}`;
        }
        return `${quote}${baseUrl}${url.startsWith('/') ? '' : '/'}${url}${quote}`;
      }
    );

    // Fix plain segment lines
    const lines = playlist.split(/\r?\n/).map((ln) => {
      const t = ln.trim();
      if (!t || t.startsWith('#')) return ln;
      if (isAbsolute(t)) {
        if (t.startsWith('//')) return u.protocol + t;
        return ln;
      }
      return `${baseUrl}${t.startsWith('/') ? '' : '/'}${t}`;
    });

    const finalPlaylist = lines.join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(finalPlaylist);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error: ' + (err.message || err));
  }
}
