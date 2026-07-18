import { storage } from './storage.js';

export function getAIKeys() {
  return storage.get('api_keys', { provider: 'openai' });
}

export async function callAI(systemPrompt, userPrompt) {
  const keys = getAIKeys();
  const provider = keys.provider || 'openai';

  if (provider === 'openai') {
    if (!keys.openai) throw new Error('No OpenAI API Key found. Configure in Settings.');
    return callOpenAI(keys.openai, systemPrompt, userPrompt);
  } else if (provider === 'gemini') {
    if (!keys.gemini) throw new Error('No Gemini API Key found. Configure in Settings.');
    return callGemini(keys.gemini, systemPrompt, userPrompt);
  } else if (provider === 'openrouter') {
    if (!keys.openrouter) throw new Error('No OpenRouter API Key found. Configure in Settings.');
    return callOpenRouter(keys.openrouter, systemPrompt, userPrompt);
  } else {
    throw new Error('Unknown AI provider selected.');
  }
}

async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callGemini(apiKey, systemPrompt, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: { text: systemPrompt } },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text.trim();
  }
  throw new Error('Unexpected response format from Gemini API');
}

async function callOpenRouter(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href, // Recommended by OpenRouter
      'X-Title': 'LaunchPad AI'
    },
    body: JSON.stringify({
      model: 'openrouter/free', // Automatically routes to the best available free model that is online
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenRouter HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
