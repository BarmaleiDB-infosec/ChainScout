const { sendOpenRouterChatCompletion } = require('./openrouter-client');
const axios = require('axios');

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseJsonObject(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const candidate = start !== -1 && end !== -1 && start < end ? text.slice(start, end + 1) : text;
  return safeJsonParse(candidate);
}

function buildAiPrompt({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples }) {
  return [
    'You are ChainScout, a senior web3 security analyst.',
    'Produce a JSON object with keys: executiveSummary, criticalRisks, remediationRoadmap, trainingSignals.',
    'Do not produce any additional commentary outside the JSON object.',
    `Target type: ${targetType}`,
    `Target url: ${targetUrl || 'uploaded artifact'}`,
    `Source kind: ${sourceKind}`,
    `Scan level: ${level}`,
    `Severity breakdown: ${JSON.stringify(vulnerabilities)}`,
    `Tools used: ${JSON.stringify(toolsUsed)}`,
    `Coverage: ${artifact ? artifact.kind : 'unknown'}`,
    `Recent dataset examples: ${JSON.stringify(datasetExamples || [])}`,
    `Findings: ${JSON.stringify(findings.slice(0, 20))}`,
  ].join('\n');
}

async function getOpenRouterAiAnalysis({ prompt, maxTokens }) {
  const response = await sendOpenRouterChatCompletion({
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You write actionable web3 audit reports with security severity, exploitability guidance and remediation steps.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    maxTokens,
  });

  const content = response?.choices?.[0]?.message?.content || response?.output?.[0]?.content || '';
  return parseJsonObject(String(content));
}

async function getOpenAIAiAnalysis({ prompt, maxTokens }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You write actionable web3 audit reports with security severity, exploitability guidance and remediation steps.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content || '';
  return parseJsonObject(String(content));
}

async function generateAiAnalysis({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples }) {
  const prompt = buildAiPrompt({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples });
  const maxTokens = 1200;

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const parsed = await getOpenRouterAiAnalysis({ prompt, maxTokens });
      if (parsed?.executiveSummary) {
        return parsed;
      }
    } catch (error) {
      console.warn('OpenRouter analysis failed:', error?.message || error);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const parsed = await getOpenAIAiAnalysis({ prompt, maxTokens });
      if (parsed?.executiveSummary) {
        return parsed;
      }
    } catch (error) {
      console.warn('OpenAI analysis failed:', error?.message || error);
    }
  }

  throw new Error('AI provider not available or failed to return a valid analysis');
}

module.exports = {
  generateAiAnalysis,
};
