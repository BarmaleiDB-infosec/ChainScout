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

function buildAiPrompt({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples, language = "ru" }) {
  return [
    'Ты — senior аудитор смарт-контрактов. Пиши на русском. Изучи базу знаний ниже.',
    '',
    '=== БАЗА ЗНАНИЙ: РЕАЛЬНЫЕ ЭКСПЛОЙТЫ ===',
    '',
    'REENTRANCY:',
    '- The DAO (2016, $60M): fallback() вызвал withdraw() повторно до обновления баланса',
    '- Cream Finance (2021, $130M): reentrancy через токен ERC-777',
    '- Fei Protocol (2022, $80M): reentrancy через flashloan + deposit',
    '- Исправление: использовать ReentrancyGuard или CEI (Checks-Effects-Interactions)',
    '',
    'ACCESS CONTROL:',
    '- Poly Network (2021, $600M): отсутствие проверки прав на вызов функции',
    '- Wormhole (2022, $325M): отсутствие валидации guardian подписей',
    '- Qubit Finance (2022, $80M): устаревшая функция без модификатора',
    '- Исправление: onlyOwner, RBAC, multi-sig, временные блокировки',
    '',
    'DELEGATECALL:',
    '- Parity Wallet (2017, $150M): delegatecall в незащищённую библиотеку с selfdestruct',
    '- Исправление: использовать immutable для адреса библиотеки, проверять код',
    '',
    'INTEGER OVERFLOW:',
    '- PoWH Coin (2018): арифметическое переполнение через '+=' 
    '- BeautyChain (2018): переполнение uint256 через умножение',
    '- Исправление: Solidity 0.8+ или SafeMath библиотека',
    '',
    'ORACLE/MANIPULATION:',
    '- Inverse Finance (2022, $15M): манипуляция ценовым оракулом через flashloan',
    '- Cream Finance (2021): манипуляция ценой через низколиквидный пул',
    '- Исправление: TWAP (средневзвешенная цена), множественные источники цен',
    '',
    'FLASHLOAN ATTACKS:',
    '- PancakeBunny (2021, $200M): манипуляция ценой через flashloan + mint',
    '- Harvest Finance (2020, $33M): flashloan для арбитража кривой',
    '- Исправление: проверка slippage, минимальное время между действиями',
    '',
    'UNCHECKED RETURN VALUES:',
    '- Lendf.Me (2020, $25M): не проверен результат .call()',
    '- Исправление: require(success, "Call failed")',
    '',
    'FRONT-RUNNING:',
    '- Bancor (2020): фронт-раннинг через публичный mempool',
    '- Исправление: commit-reveal схема, лимит slippage',
    '',
    'LOGIC ERRORS:',
    '- bZx (2020, $8M): логическая ошибка в проверке состояния',
    '- Yearn Finance (2021, $11M): ошибка в расчёте доли',
    '- Исправление: тщательное тестирование, формальная верификация',
    '',
    '=== ЗАДАЧА ===',
    'Проанализируй находки ниже и для каждой:',
    '1. Конкретный уязвимый код из контракта',
    '2. Исправленный код (Solidity)',
    '3. Сценарий атаки с суммой потенциального ущерба',
    '4. Вероятность эксплуатации (Low/Medium/High)',
    '5. Похожий реальный эксплойт из базы знаний',
    '',
    'Формат: JSON с ключами executiveSummary, criticalRisks, remediationRoadmap, trainingSignals',
    'Пиши ТОЛЬКО на русском. Никаких общих фраз.',
    '',
    `Контракт: ${targetUrl || 'артефакт'} (${targetType}, ${sourceKind})`,
    `Уровень: ${level} | Risk Score: ${vulnerabilities?.riskScore || 'N/A'}/100`,
    `Находки: ${JSON.stringify((findings || []).slice(0, 25))}`,
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
