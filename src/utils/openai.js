import { storage } from './storage.js';

export function getOpenAIKey() {
  const keys = storage.get('api_keys', {});
  return keys.openai || '';
}

export async function callOpenAI(systemPrompt, userPrompt) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('No OpenAI API Key found. Please configure your key in the Settings tab.');
  }

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
    const errorMessage = errorData.error?.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
