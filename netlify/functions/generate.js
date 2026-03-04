exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const { prompt, style } = JSON.parse(event.body);
    const STABILITY_KEY = process.env.STABILITY_API_KEY;

    if (!STABILITY_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [
          { text: `${prompt}, ${style}, masterpiece, highly detailed`, weight: 1 },
          { text: 'blurry, text, watermark, ugly, distorted', weight: -1 }
        ],
        cfg_scale: 7, width: 1024, height: 1024, steps: 30, samples: 1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: err }) };
    }

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify({ image: data.artifacts[0].base64 }) };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
