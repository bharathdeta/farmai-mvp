const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const cropProfiles = {
  Rice: 'Agriculture — Rice/paddy farming in India. Consider crop stage, water management, nutrient issues, common pests and diseases.',
  Cotton: 'Agriculture — Cotton farming in India. Consider crop stage, soil moisture, nutrient issues, boll development, and common pests.',
  Maize: 'Agriculture — Maize cultivation in India. Consider crop stage, leaf symptoms, nutrient deficiency, soil moisture and common pests/diseases.',
  Groundnut: 'Agriculture — Groundnut cultivation in India. Consider crop stage, soil moisture, nutrient issues, leaf symptoms and common diseases.',

  Tomato: 'Horticulture — Tomato cultivation in India. Consider crop stage, leaf, stem and fruit symptoms, irrigation, nutrition and fungal/bacterial/viral possibilities.',
  Chilli: 'Horticulture — Chilli cultivation in India. Consider crop stage, leaf curl, flowering, fruit symptoms, irrigation, nutrition and common pest/disease possibilities.',
  Brinjal: 'Horticulture — Brinjal/eggplant cultivation in India. Consider crop stage, leaf and fruit symptoms, irrigation, nutrition and common pests/diseases.',
  Okra: 'Horticulture — Okra/bhendi cultivation in India. Consider crop stage, leaf, flower and fruit symptoms, irrigation, nutrition and common pests/diseases.',
  Onion: 'Horticulture — Onion cultivation in India. Consider crop stage, bulb development, irrigation, nutrient issues and common pests/diseases.',
  Mango: 'Horticulture — Mango cultivation in India. Consider tree age, flowering, fruit development, irrigation, nutrition and common pests/diseases.',
  Banana: 'Horticulture — Banana cultivation in India. Consider plant stage, leaf symptoms, bunch development, irrigation, nutrition and common pests/diseases.',

  Fisheries: 'Fisheries — Fish farming and pond management in India. Consider fish species, pond water quality, dissolved oxygen, feeding, stocking, fish behavior and possible disease signs.',
  Livestock: 'Livestock — Cattle, buffalo, goat, sheep and poultry management in India. Consider animal species, age, feeding, housing, behavior and visible symptoms. For illness, recommend veterinary assessment when needed.',

  Other: 'General FarmAI guidance. Use the selected sector and supplied farm details. Ask for the specific crop, fish species or animal when genuinely needed.'
};

const systemInstruction = `
You are FarmAI, a careful agriculture assistant for farmers in India.

Answer in the user's language:
- If the user writes Telugu, answer in Telugu.
- If the user writes English, answer in English.
- If the user mixes Telugu and English, respond naturally in the same style.

Your job is to provide practical, easy-to-understand guidance.

IMPORTANT SAFETY RULES:
- Never claim that a photo provides a certain diagnosis.
- Say "possible issue", "possible causes", or "this may be consistent with" when discussing diseases or pests.
- A photo alone cannot reliably confirm a disease, pest, nutrient deficiency, or treatment.
- Do not recommend unsafe, restricted, banned, or unregistered chemicals.
- Do not provide dangerous pesticide mixing instructions.
- Do not invent pesticide names, doses, waiting periods, or legal approvals.
- For chemical treatment decisions, advise checking the product label and a local agriculture officer/qualified expert.
- For severe crop loss, poisoning, animal illness, or urgent situations, recommend appropriate local professional help.

When crop information is available, use it to make the answer more relevant.

For crop/photo questions, structure the answer using these headings where useful:

🔍 Possible issue
👀 What I can observe
🛠️ What to do now
🛡️ Prevention & monitoring
👨‍🌾 When to contact an expert

Keep the response practical and concise.
Ask for missing information such as crop, crop age/stage, location, soil type, irrigation, recent fertilizer/pesticide use, and symptoms when those details would materially improve the answer.
`;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', chunk => {
      data += chunk;

      if (data.length > 7 * 1024 * 1024) {
        reject(new Error('Request is too large. Choose an image under 5 MB.'));
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        reject(new Error('Invalid request.'));
      }
    });

    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Use POST.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return send(res, 503, {
      error: 'FarmAI needs a Gemini API key. Add GEMINI_API_KEY to the server environment.'
    });
  }

  try {
    const {
      message,
      image,
      history = [],
      sector = 'Agriculture',
      crop = 'Other',
      cropStage = '',
      landArea = '',
      landUnit = 'Acres',
      location = '',
      language = 'te',
      languageName = 'Telugu',
      photoCheck = false,
      fishType = '',
      pondArea = '',
      pondUnit = 'Acres',
      animalType = '',
      animalCount = '',
      animalLocation = ''
    } = await readJson(req);

    if ((!message || !message.trim()) && !image) {
      return send(res, 400, {
        error: 'Write a question or attach an image.'
      });
    }

    if (
      image &&
      (
        !image.data ||
        !image.mimeType ||
        image.data.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3)
      )
    ) {
      return send(res, 400, {
        error: 'Please use a JPG, PNG, or WebP image smaller than 5 MB.'
      });
    }

    const contents = history
      .slice(-8)
      .map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.text }]
      }));

    const cropContext =
      ['Agriculture', 'Horticulture'].includes(sector)
        ? (cropProfiles[crop] || cropProfiles.Other)
        : (cropProfiles[sector] || `Sector: ${sector}. Provide guidance appropriate to this sector.`);

    const selectedLanguage =
      language === 'hi' ? 'Hindi' :
      language === 'en' ? 'English' :
      'Telugu';

    const isPhotoCheck = Boolean(photoCheck);

    const sectorDetails = sector === 'Fisheries'
      ? `Fish type: ${fishType || 'Not provided'}
Pond area: ${pondArea ? `${pondArea} ${pondUnit}` : 'Not provided'}
Farm location: ${animalLocation || location || 'Not provided'}`
      : sector === 'Livestock'
        ? `Animal type: ${animalType || 'Not provided'}
Number of animals: ${animalCount || 'Not provided'}
Farm location: ${animalLocation || location || 'Not provided'}`
        : `Crop: ${crop || 'Not provided'}
Crop stage: ${cropStage || 'Not provided'}
Land area: ${landArea ? `${landArea} ${landUnit}` : 'Not provided'}
Location: ${location || 'Not provided'}`;

    const universal = `
UNIVERSAL PHOTO EXPLAINER + FARMAI

Analyze the uploaded image based only on what is visibly present. Do not assume that every image is agricultural.

First determine the most likely category:

1. Agriculture — field crops such as rice, cotton, maize, groundnut
2. Horticulture — vegetables, fruits, garden/plant crops such as tomato, chilli, brinjal, okra, onion, mango, banana
3. Fisheries — fish, shrimp, crab, aquaculture pond or fish-farming situation
4. Livestock — cow, buffalo, goat, sheep, poultry or livestock-farming situation
5. General — anything not meaningfully related to the four FarmAI sectors

For EVERY photo, give a useful explanation using these sections:

📸 What I can see
Describe the main visible subject, objects, environment and important visual details.

🔎 Visual observations
State useful observations that can actually be supported by the image. Separate visible facts from interpretation.

💡 What this may be
Explain what the scene, object, plant, animal or situation may represent when reasonably supported by the image. Do not invent details.

🌱 FarmAI connection
This must ALWAYS be the final user-facing section.
- If the image is agriculture, horticulture, fisheries or livestock related, explain briefly how FarmAI can help and give the safest useful next step.
- If the image is general/non-farm, clearly say that it does not appear to be farm-related and invite the user to upload a crop, plant, fish, pond or animal photo for FarmAI guidance.

IMPORTANT:
- Never claim certainty when the image does not support certainty.
- Clearly distinguish visible observations from possible explanations.
- If the image is unclear, say what cannot be determined.
- Do not force a farm interpretation onto a general image.
- Do not identify a real person by name.
- Do not give exact pesticide, medicine or chemical doses.
- For animal illness, recommend veterinary assessment when appropriate.
- For crop/fish problems, give practical safe next steps.
- Keep the explanation useful and concise.

At the END of your response, output exactly one routing marker on its own line in this format:

[FARMAI_ROUTE]
sector=agriculture|horticulture|fisheries|livestock|general
crop=<crop name or empty>
animalType=<animal type or empty>
fishType=<fish type or empty>
[/FARMAI_ROUTE]

Do not explain the routing marker. Keep it at the very end.

Selected response language: ${selectedLanguage}

User request:
${message || 'Please explain this photo.'}
`;

    const farm_body = `
FARM SECTOR CHAT

Selected sector: ${sector}
Crop context: ${cropContext}

Farm details:
${sectorDetails}

Selected response language: ${selectedLanguage}

User request:
${message || 'Please answer using the supplied farm context.'}

Provide practical guidance appropriate to this farm context.
`;

    const userContext = isPhotoCheck ? `
HOME UNIVERSAL PHOTO CHECK MODE

Selected response language: ${selectedLanguage}

${universal}

` : `
${farm_body}
`;

    const parts = [{ text: userContext }];

    if (image) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    contents.push({
      role: 'user',
      parts
    });

    const preferredModel =
      process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    const models = [
      ...new Set([
        preferredModel,
        'gemini-3.1-flash-lite'
      ])
    ];

    const payload = JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents,
      generationConfig: {
        maxOutputTokens: 2400,
        temperature: 0.3
      }
    });

    let response;
    let data;

    for (const model of models) {
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (response.status === 429 || response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 1300));

        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: payload
        });
      }

      data = await response.json();

      if (
        response.ok ||
        ![429, 503].includes(response.status)
      ) {
        break;
      }
    }

    if (!response.ok) {
      return send(res, response.status, {
        error:
          data?.error?.message ||
          'Gemini could not answer right now.'
      });
    }

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason || 'UNKNOWN';
    console.log('FarmAI Gemini finishReason:', finishReason);

    const rawAnswer = candidate?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!rawAnswer) {
      return send(res, 502, {
        error: 'No answer was returned. Please try again.'
      });
    }

    let answer = rawAnswer;
    let route = null;

    const routeMatch = rawAnswer.match(
      /\[FARMAI_ROUTE\]([\s\S]*?)\[\/FARMAI_ROUTE\]/i
    );

    if (routeMatch) {
      const routeText = routeMatch[1];

      const readRouteValue = key => {
        const match = routeText.match(
          new RegExp(`^${key}\\s*=\\s*(.*?)\\s*$`, 'im')
        );
        return match ? match[1].trim() : '';
      };

      route = {
        sector: readRouteValue('sector').toLowerCase(),
        crop: readRouteValue('crop'),
        animalType: readRouteValue('animalType'),
        fishType: readRouteValue('fishType')
      };

      answer = rawAnswer.replace(routeMatch[0], '').trim();
    }

    // Fallback routing when Gemini does not return the routing marker.
    if (isPhotoCheck && !route) {
      const text = rawAnswer.toLowerCase();

      if (/\\b(rice|paddy|cotton|maize|corn|groundnut|peanut)\\b/.test(text)) {
        route = { sector: 'agriculture', crop: '', animalType: '', fishType: '' };
      } else if (/\\b(tomato|chilli|chili|brinjal|eggplant|okra|bhendi|onion|mango|banana|vegetable|fruit|horticulture)\\b/.test(text)) {
        route = { sector: 'horticulture', crop: '', animalType: '', fishType: '' };
      } else if (/\\b(fish|fishes|shrimp|prawn|crab|aquaculture|pond)\\b/.test(text)) {
        route = { sector: 'fisheries', crop: '', animalType: '', fishType: '' };
      } else if (/\\b(cow|cattle|buffalo|goat|sheep|poultry|chicken|hen|livestock)\\b/.test(text)) {
        route = { sector: 'livestock', crop: '', animalType: '', fishType: '' };
      } else {
        route = { sector: 'general', crop: '', animalType: '', fishType: '' };
      }
    }

    return send(res, 200, { answer, route });

  } catch (error) {
    return send(res, 400, {
      error: error.message || 'Something went wrong.'
    });
  }
};