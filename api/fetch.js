// File: api/fetch.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const targetUrl = "http://opplex.tv:8080/live/Jamal3m/Lhr@3m/244978.m3u8";

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "http://opplex.tv",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch m3u8");
    }

    const text = await response.text();

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(text);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
}
