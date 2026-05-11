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
    'Ты — senior аудитор смарт-контрактов с 10-летним опытом работы в Web3 security.',
    '',
    '=== РЕАЛЬНЫЕ ЭКСПЛОЙТЫ С ПРИМЕРАМИ КОДА ===',
    '',
    '1. REENTRANCY (The DAO, 2016, $60M):',
    '   УЯЗВИМЫЙ КОД:',
    '   ```solidity',
    '   function withdraw(uint _amount) public {',
    '       require(balances[msg.sender] >= _amount);',
    '       msg.sender.call{value: _amount}(""); // ВНЕШНИЙ ВЫЗОВ ДО ОБНОВЛЕНИЯ',
    '       balances[msg.sender] -= _amount;',
    '   }',
    '   ```',
    '   ИСПРАВЛЕНИЕ:',
    '   ```solidity',
    '   function withdraw(uint _amount) public {',
    '       require(balances[msg.sender] >= _amount);',
    '       balances[msg.sender] -= _amount; // СНАЧАЛА ОБНОВЛЕНИЕ',
    '       (bool success,) = msg.sender.call{value: _amount}("");',
    '       require(success, "Transfer failed");',
    '   }',
    '   ```',
    '',
    '2. ACCESS CONTROL (Poly Network, 2021, $600M):',
    '   УЯЗВИМЫЙ КОД: function mint(address to, uint amount) public { _mint(to, amount); }',
    '   ИСПРАВЛЕНИЕ: function mint(address to, uint amount) public onlyOwner { _mint(to, amount); }',
    '',
    '3. INTEGER OVERFLOW (BeautyChain BEC, 2018, $900M):',
    '   УЯЗВИМЫЙ КОД:',
    '   ```solidity',
    '   function batchTransfer(address[] _receivers, uint256 _value) public {',
    '       uint256 amount = _receivers.length * _value; // ПЕРЕПОЛНЕНИЕ',
    '       require(balances[msg.sender] >= amount);',
    '       balances[msg.sender] -= amount;',
    '   }',
    '   ```',
    '   ИСПРАВЛЕНИЕ:',
    '   ```solidity',
    '   using SafeMath for uint256;',
    '   function batchTransfer(address[] _receivers, uint256 _value) public {',
    '       uint256 amount = _receivers.length.mul(_value); // БЕЗОПАСНО',
    '       require(balances[msg.sender] >= amount);',
    '       balances[msg.sender] = balances[msg.sender].sub(amount);',
    '   }',
    '   ```',
    '',
    '4. DELEGATECALL (Parity Wallet, 2017, $150M):',
    '   УЯЗВИМЫЙ КОД:',
    '   ```solidity',
    '   address lib = 0x...;',
    '   (bool success,) = lib.delegatecall(data); // НЕПРОВЕРЕННЫЙ БИБЛИОТЕКА',
    '   ```',
    '   ИСПРАВЛЕНИЕ:',
    '   ```solidity',
    '   address immutable lib = 0x...; // immutable АДРЕС',
    '   require(isValidLibrary(lib), "Invalid library");',
    '   (bool success,) = lib.delegatecall(data);',
    '   require(success, "Delegatecall failed");',
    '   ```',
    '',
    '5. UNCHECKED CALL (Lendf.Me, 2020, $25M):',
    '   УЯЗВИМЫЙ КОД: (bool success,) = addr.call{value: amount}("");',
    '   ИСПРАВЛЕНИЕ:',
    '   ```solidity',
    '   (bool success,) = addr.call{value: amount}("");',
    '   require(success, "ETH transfer failed");',
    '   ```',
    '',
    '6. FRONT-RUNNING (Bancor, 2020):',
    '   УЯЗВИМЫЙ КОД:',
    '   ```solidity',
    '   function swap(uint amount) public {',
    '       require(balances[msg.sender] >= amount); // ПРОВЕРКА',
    '       uint price = getPrice(); // ЦЕНА МОЖЕТ ИЗМЕНИТЬСЯ',
    '       balances[msg.sender] -= amount; // ОБНОВЛЕНИЕ ПОЗДНО',
    '   }',
    '   ```',
    '   ИСПРАВЛЕНИЕ:',
    '   ```solidity',
    '   function swap(uint amount, uint minOut) public {',
    '       require(balances[msg.sender] >= amount);',
    '       balances[msg.sender] -= amount; // СНАЧАЛА ОБНОВЛЕНИЕ',
    '       uint price = getPrice();',
    '       require(price >= minOut, "Slippage too high");',
    '   }',
    '   ```',
    '',
    '=== ВАЖНЫЕ ПРАВИЛА АУДИТА ===',
    '',
    '1. Checks-Effects-Interactions: Всегда обновляй состояние ДО внешних вызовов',
    '2. Используй OpenZeppelin контракты (ReentrancyGuard, Ownable, SafeMath)',
    '3. Не доверяй tx.origin, используй msg.sender',
    '4. Проверяй возвращаемые значения низкоуровневых call',
    '5. Для дедлайнов используй блоки (block.timestamp + 30min buffer)',
    '6. Добавляй zero-address проверки для всех трансферов',
    '7. Используй immutable для неизменяемых адресов',
    '',
    '=== ТВОЯ ЗАДАЧА ===',
    '',
    'Проанализируй находки детекторов ниже и сгенерируй JSON отчёт.',
    '',
    'ТРЕБОВАНИЯ К ОТВЕТУ:',
    '- executiveSummary: 2-3 предложения, укажи общий риск (Low/Medium/High/Critical)',
    '- criticalRisks: массив строк, КАЖДАЯ строка содержит (1) описание уязвимости, (2) ссылку на реальный эксплойт, (3) пример суммы ущерба',
    '- remediationRoadmap: массив строк, КАЖДАЯ строка содержит (1) что исправить, (2) КОНКРЕТНЫЙ КОД исправления (Solidity)',
    '- trainingSignals: массив строк, 2-3 предложения как улучшить автоматическое обнаружение',
    '',
    'ФОРМАТ ОТВЕТА - ТОЛЬКО JSON, НИКАКОГО ДРУГОГО ТЕКСТА:',
    '{',
    '  "executiveSummary": "string",',
    '  "criticalRisks": ["string", "string"],',
    '  "remediationRoadmap": ["string", "string"],',
    '  "trainingSignals": ["string", "string"]',
    '}',
    '',
    `=== ДАННЫЕ ДЛЯ АНАЛИЗА ===`,
    `Тип цели: ${targetType}`,
    `Цель: ${targetUrl || 'загруженный контракт'}`,
    `Тип исходного кода: ${sourceKind}`,
    `Уровень сканирования: ${level}`,
    `Оценка риска: ${vulnerabilities?.riskScore || 'N/A'}/100`,
    `Инструменты: ${JSON.stringify(toolsUsed || ['chainscout'])}`,
    `Находки детекторов (${findings?.length || 0}):`,
    `${JSON.stringify((findings || []).slice(0, 30), null, 2)}`,
    '',
    'ВНИМАНИЕ: remediationRoadmap ДОЛЖЕН содержать примеры кода. Никаких общих фраз типа "убедитесь в безопасности".',
  ].join('\n');
}

async function getOpenRouterAiAnalysis({ prompt, maxTokens }) {
  const response = await sendOpenRouterChatCompletion({
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content: 'Ты — senior Web3 аудитор. Отвечаешь ТОЛЬКО валидным JSON. remediationRoadmap обязательно содержит конкретный код Solidity. Никогда не используй общие советы без примеров кода.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens,
    temperature: 0.3,
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
        content: 'You are a senior Web3 security auditor. Return ONLY valid JSON. remediationRoadmap MUST contain concrete Solidity code examples.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  }, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 25000,
  });
  const content = response.data?.choices?.[0]?.message?.content || '';
  return parseJsonObject(String(content));
}

async function generateAiAnalysis({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples }) {
  const prompt = buildAiPrompt({ targetType, targetUrl, sourceKind, level, findings, vulnerabilities, toolsUsed, artifact, datasetExamples });
  const maxTokens = 2500;

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
