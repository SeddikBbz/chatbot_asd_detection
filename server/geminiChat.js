const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

/**
 * Sends a single message to Gemini and returns the plain-text reply.
 * A fresh chat session is started on every call on purpose: the original
 * code kept one shared `history: []` (i.e. no real memory) per request
 * anyway, so this preserves behaviour while removing the risk of two
 * concurrent users' prompts leaking into each other's "session".
 */
async function runChat(userInput, apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (or API_KEY) is not set in the environment');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1000,
  };

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  const chat = model.startChat({ generationConfig, safetySettings, history: [] });
  const result = await chat.sendMessage(userInput);
  let response = result.response.text();

  // Strip markdown bullet/emphasis stars so the plain chat UI looks clean.
  response = response
    .split('\n')
    .filter((line) => !line.includes('*'))
    .join('\n')
    .trim();

  return response || "Sorry, I couldn't come up with a reply to that.";
}

module.exports = { runChat };
