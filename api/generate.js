// DoodleAI — Backend API Route
// This file runs on Vercel's servers — your API key NEVER reaches the browser.
// Deploy instructions are in DEPLOY_INSTRUCTIONS.txt

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — allow your frontend to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { prompt, style, tier } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // ── Validate the purchase token ──────────────────────────
  // In production this is where you verify the Stripe session
  // For now we check a simple token passed from the frontend
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '');

  // Free tier — use Pollinations (no key needed, handled client-side)
  // This endpoint is only called for paid tiers
  if (!token || token === 'free') {
    return res.status(401).json({ error: 'Paid tier required for this endpoint' });
  }

  // ── Call Stability AI ────────────────────────────────────
  // Your API key lives here as an environment variable — never in the HTML
  const STABILITY_KEY = process.env.STABILITY_API_KEY;

  if (!STABILITY_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const fullPrompt = `${prompt}, ${style || 'detailed illustration'}, masterpiece, highly detailed, no text, no watermark`;

    const stabilityRes = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            { text: fullPrompt, weight: 1 },
            { text: 'blurry, text, watermark, ugly, distorted, bad anatomy, low quality', weight: -1 }
          ],
          cfg_scale: 7,
          width: 1024,
          height: 1024,
          steps: 30,
          samples: 1,
        }),
      }
    );

    if (!stabilityRes.ok) {
      const errText = await stabilityRes.text();
      console.error('Stability AI error:', errText);
      return res.status(502).json({ error: 'Image generation failed', detail: errText });
    }

    const data = await stabilityRes.json();
    const base64Image = data.artifacts[0].base64;

    // Return base64 image to frontend
    return res.status(200).json({ image: base64Image, format: 'png' });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
