const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const systemInstruction = `You are FarmAI, a helpful agriculture assistant for India. Answer in the user's language: Telugu when they write Telugu, otherwise English. Give practical, concise guidance for agriculture, horticulture, fisheries, and livestock. For images, identify visible symptoms or species cautiously; say what cannot be confirmed from a photo. Never present a diagnosis as certain. Ask for crop/fish type, location, crop age, and symptoms when useful. Recommend local agricultural extension officers or a qualified veterinarian for urgent, severe, or chemical-treatment decisions. Do not prescribe restricted pesticides or unsafe dosages.`;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 7 * 1024 * 1024) reject(new Error('Request is too large. Choose an image under 5 MB.'));
    });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid request.')); } });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  if (!process.env.GEMINI_API_KEY) return send(res, 503, { error: 'FarmAI needs a Gemini API key. Add GEMINI_API_KEY to the server environment.' });
  try {
    const { message, image, history = [], sector = 'Agriculture' } = await readJson(req);
    if ((!message || !message.trim()) && !image) return send(res, 400, { error: 'Write a question or attach an image.' });
    if (image && (!image.data || !image.mimeType || image.data.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3))) return send(res, 400, { error: 'Please use a JPG, PNG, or WebP image smaller than 5 MB.' });
    const contents = history.slice(-8).map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.text }] }));
    const parts = [{ text: `Sector: ${sector}\nUser question: ${message || 'Please analyze this image.'}` }];
    if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
    contents.push({ role: 'user', parts });
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const models = [...new Set([preferredModel, 'gemini-3.1-flash-lite'])];
    const payload = JSON.stringify({ system_instruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig: { maxOutputTokens: 700 } });
    let response, data;
    // Capacity is shared on the free tier. A retry and a lightweight multimodal fallback handle brief spikes.
    for (const model of models) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      if (response.status === 429 || response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 1300));
        response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      }
      data = await response.json();
      if (response.ok || ![429, 503].includes(response.status)) break;
    }
    if (!response.ok) return send(res, response.status, { error: data?.error?.message || 'Gemini could not answer right now.' });
    const answer = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    return answer ? send(res, 200, { answer }) : send(res, 502, { error: 'No answer was returned. Please try again.' });
  } catch (error) { return send(res, 400, { error: error.message || 'Something went wrong.' }); }
};
