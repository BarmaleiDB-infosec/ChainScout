const { sendOpenRouterChatCompletion } = require('./openrouter-client');
const axios = require('axios');

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function safeJsonParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function parseJsonObject(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const candidate = start !== -1 && end !== -1 && start < end ? text.slice(start, end + 1) : text;
  return safeJsonParse(candidate);
}

function buildAiPrompt({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples }) {
  return [
    'Ты — senior аудитор смарт-контрактов. Пиши ТОЛЬКО на русском языке. Давай КОНКРЕТНЫЕ примеры кода Solidity для каждого исправления.',
    'Analyze the findings below and produce a JSON object with these keys:',
    '- executiveSummary: 2-3 sentence summary of risk level and key issues',
    '- criticalRisks: array of CRITICAL/HIGH findings with exploit scenario for each',
    '- remediationRoadmap: SPECIFIC, NUMBERED steps with Solidity code examples for fixes',
    '- trainingSignals: 2-3 suggestions for improving automated detection in future scans',
    '',
    'RULES:',
    '- For each finding, provide a CONCRETE code fix (not generic advice)',
    '- If finding is "coverage-limited" or "web3-surface", suggest specific manual checks',
    '- Risk score 0-10: LOW, 11-40: MEDIUM, 41-70: HIGH, 71-100: CRITICAL',
    '- Do not output anything outside the JSON object',
    '',
    `Target: ${targetUrl || 'uploaded artifact'} (${targetType}, ${sourceKind})`,
    `Scan level: ${level}`,
    `Risk score: ${vulnerabilities?.riskScore || 'N/A'}`,
    `Tools: ${JSON.stringify(toolsUsed || ['chainscout'])}`,
    `Findings (${findings?.length || 0}): ${JSON.stringify((findings || []).slice(0, 25))}`,
  ].join('\n');
}

async function getOpenRouterAiAnalysis({ prompt, maxTokens }) {
  const response = await sendOpenRouterChatCompletion({
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content: 'Ты — senior Web3 аудитор. Пиши на русском. Даёшь КОНКРЕТНЫЕ исправления с ПРИМЕРАМИ КОДА Solidity/Rust. Никаких общих советов — только точный код.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens,
  });
  const content = response?.choices?.[0]?.message?.content || response?.output?.[0]?.content || '';
  return parseJsonObject(String(content));
}

async function getOpenAIAiAnalysis({ prompt, maxTokens }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a senior Web3 security auditor. You provide SPECIFIC, ACTIONABLE recommendations with code examples.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  }, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 25000,
  });
  const content = response.data?.choices?.[0]?.message?.content || '';
  return parseJsonObject(String(content));
}

async function generateAiAnalysis({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples }) {
  const prompt = buildAiPrompt({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples });
  const maxTokens = 2000;

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const parsed = await getOpenRouterAiAnalysis({ prompt, maxTokens });
      if (parsed?.executiveSummary) return parsed;
    } catch (error) {
      console.warn('OpenRouter failed:', error?.message || error);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const parsed = await getOpenAIAiAnalysis({ prompt, maxTokens });
      if (parsed?.executiveSummary) return parsed;
    } catch (error) {
      console.warn('OpenAI failed:', error?.message || error);
    }
  }

  throw new Error('AI provider not available');
}

module.exports = { generateAiAnalysis };
