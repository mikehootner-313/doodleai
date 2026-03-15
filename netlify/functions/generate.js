exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

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

    const fullPrompt = `${prompt}, ${style}, masterpiece, highly detailed`;

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [
          { text: fullPrompt, weight: 1 },
          { text: 'blurry, ugly, watermark, text, distorted, low quality', weight: -1 }
        ],
        cfg_scale: 7,
        width: 1024,
        height: 1024,
        steps: 30,
        samples: 1,
        style_preset: 'digital-art'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log('Stability AI error:', response.status, errText);
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Stability AI error ${response.status}: ${errText}` }) };
    }

    const data = await response.json();

    if (!data.artifacts || !data.artifacts[0]) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'No image returned' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ image: data.artifacts[0].base64 })
    };

  } catch(err) {
    console.log('Function error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
