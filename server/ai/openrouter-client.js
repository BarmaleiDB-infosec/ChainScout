const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_ENDPOINT = process.env.OPENROUTER_ENDPOINT || 'https://api.openrouter.ai/v1/chat/completions';

function requireOpenRouterKey() {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }
}

async function sendOpenRouterChatCompletion({ model, messages, maxTokens = 1200 }) {
  requireOpenRouterKey();

  const response = await axios.post(
    OPENROUTER_ENDPOINT,
    {
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 1,
      n: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );

  return response.data;
}

module.exports = {
  sendOpenRouterChatCompletion,
};
