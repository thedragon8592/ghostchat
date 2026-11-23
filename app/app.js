import { GHOST_CONFIG, translateChat, generateChatIdeas, processInterview, getActiveKey } from './core.js';

// DOM Elements
const tabBtns = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');
const inputText = document.getElementById('inputText');
const btnTranslate = document.getElementById('btnTranslate');
const outputText = document.getElementById('outputText');
const copyBadge = document.getElementById('copyBadge');
const btnManualCopy = document.getElementById('btnManualCopy');
const btnClear = document.getElementById('btnClear');
const clarifyCard = document.getElementById('clarifyCard');
const clarifyText = document.getElementById('clarifyText');
const clarifyInput = document.getElementById('clarifyInput');
const btnSendClarify = document.getElementById('btnSendClarify');
const toneChips = document.querySelectorAll('.tone-chip');
const modelBadge = document.getElementById('modelBadge');

// Ideas Tab Elements
const fanMessageInput = document.getElementById('fanMessageInput');
const btnGenerateIdeas = document.getElementById('btnGenerateIdeas');
const ideasContainer = document.getElementById('ideasContainer');

// Interview Tab Elements
const interviewPrompt = document.getElementById('interviewPrompt');
const btnRunInterview = document.getElementById('btnRunInterview');
const personaSummary = document.getElementById('personaSummary');

// Settings Elements
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const offlineBanner = document.getElementById('offlineBanner');

// State
let currentPersona = null;
let currentTone = 'flirty';

function initApp() {
  // Load stored persona or default
  const storedPersona = localStorage.getItem('ghost_persona');
  if (storedPersona) {
    try {
      currentPersona = JSON.parse(storedPersona);
    } catch (e) {
      currentPersona = GHOST_CONFIG.defaultPersona;
    }
  } else {
    currentPersona = GHOST_CONFIG.defaultPersona;
  }
  updatePersonaDisplay();

  // Load API Key
  apiKeyInput.value = getActiveKey();

  // Setup Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Network listeners
  window.addEventListener('online', () => offlineBanner.classList.add('hidden'));
  window.addEventListener('offline', () => offlineBanner.classList.remove('hidden'));
  if (!navigator.onLine) offlineBanner.classList.remove('hidden');

  bindEvents();
}

function updatePersonaDisplay() {
  if (currentPersona) {
    personaSummary.textContent = `${currentPersona.role || 'OF Chatter'}: ${currentPersona.summary || currentPersona.context}`;
  }
}

function bindEvents() {
  // Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(targetTab)?.classList.add('active');
    });
  });

  // Tone Chips
  toneChips.forEach(chip => {
    chip.addEventListener('click', () => {
      toneChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentTone = chip.dataset.tone;
    });
  });

  // Translate Actions
  btnTranslate.addEventListener('click', handleTranslate);
  inputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  });

  // Manual Copy
  btnManualCopy.addEventListener('click', () => {
    const text = outputText.textContent.trim();
    if (text) {
      navigator.clipboard.writeText(text);
      showCopyBadge('✓ Copied to clipboard');
    }
  });

  // Clear
  btnClear.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    clarifyCard.classList.add('hidden');
    copyBadge.classList.add('hidden');
    inputText.focus();
  });

  // Clarify reply
  btnSendClarify.addEventListener('click', () => {
    const orig = inputText.value.trim();
    const explanation = clarifyInput.value.trim();
    if (explanation) {
      inputText.value = `${orig} (means: ${explanation})`;
      clarifyCard.classList.add('hidden');
      handleTranslate();
    }
  });

  // Wingman Ideas
  btnGenerateIdeas.addEventListener('click', handleGenerateIdeas);

  // Interview Calibrate
  btnRunInterview.addEventListener('click', handleInterview);

  // Settings Modal
  btnSettings.addEventListener('click', () => {
    apiKeyInput.value = getActiveKey();
    settingsModal.classList.remove('hidden');
  });
  btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
  btnSaveSettings.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('ghost_api_key', key);
    }
    settingsModal.classList.add('hidden');
  });
}

async function handleTranslate() {
  const text = inputText.value.trim();
  if (!text) return;

  btnTranslate.disabled = true;
  btnTranslate.textContent = 'Translating...';
  outputText.textContent = 'Translating instantly...';
  clarifyCard.classList.add('hidden');
  copyBadge.classList.add('hidden');

  // Inject active tone into persona context
  const activePersona = { ...currentPersona };
  if (currentTone === 'flirty') {
    activePersona.context += ' Tone must be seductive, playful, teasing, charming babe vibe.';
  } else if (currentTone === 'short') {
    activePersona.context += ' Keep responses ultra-brief, 2 to 5 words max.';
  } else if (currentTone === 'street') {
    activePersona.context += ' Use heavy US street chat slang (ngl, no cap, bruh, fr, rn).';
  }

  const result = await translateChat({
    text,
    apiKey: apiKeyInput.value.trim() || getActiveKey(),
    persona: activePersona,
    platform: 'Web App'
  });

  btnTranslate.disabled = false;
  btnTranslate.textContent = 'Translate ➔';

  if (!result.success) {
    outputText.textContent = `Error: ${result.error}`;
    return;
  }

  if (result.isClarification) {
    clarifyCard.classList.remove('hidden');
    clarifyText.textContent = result.text;
    outputText.textContent = '(Waiting for clarification to translate accurately...)';
    clarifyInput.focus();
    return;
  }

  outputText.textContent = result.text;
  modelBadge.textContent = result.modelUsed.split('/')[1] || 'AI Ready';
  showCopyBadge('✓ Auto-copied to clipboard');
}

async function handleGenerateIdeas() {
  const msg = fanMessageInput.value.trim();
  if (!msg) return;

  btnGenerateIdeas.disabled = true;
  btnGenerateIdeas.textContent = 'Generating...';
  ideasContainer.innerHTML = '<div class="placeholder-msg">Generating 3 human options...</div>';

  const res = await generateChatIdeas({
    subscriberMessage: msg,
    apiKey: apiKeyInput.value.trim() || getActiveKey(),
    persona: currentPersona,
    platform: 'Web App'
  });

  btnGenerateIdeas.disabled = false;
  btnGenerateIdeas.textContent = '💡 Generate Ideas';

  if (!res.success || !res.ideas) {
    ideasContainer.innerHTML = `<div class="placeholder-msg" style="color:#ef4444">${res.error || 'Failed to generate ideas'}</div>`;
    return;
  }

  ideasContainer.innerHTML = '';
  res.ideas.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.innerHTML = `
      <div class="idea-card-header">
        <span class="idea-tag">${escapeHtml(idea.tag || 'Option')}</span>
        <button class="action-btn small primary">📋 Copy & Send</button>
      </div>
      <div class="idea-text">${escapeHtml(idea.text)}</div>
    `;

    const copyBtn = card.querySelector('button');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(idea.text);
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => copyBtn.textContent = '📋 Copy & Send', 1500);
    });

    ideasContainer.appendChild(card);
  });
}

async function handleInterview() {
  const text = interviewPrompt.value.trim();
  if (!text) {
    alert('Please describe your context or job.');
    return;
  }

  btnRunInterview.disabled = true;
  btnRunInterview.textContent = 'Processing interview...';

  const res = await processInterview({
    interviewText: text,
    apiKey: apiKeyInput.value.trim() || getActiveKey()
  });

  btnRunInterview.disabled = false;
  btnRunInterview.textContent = '⚡ Calibrate & Save Personality';

  if (res.success && res.persona) {
    currentPersona = res.persona;
    localStorage.setItem('ghost_persona', JSON.stringify(currentPersona));
    updatePersonaDisplay();
    alert('Personality calibrated and saved successfully! The translator will now adapt strictly to your style.');
  }
}

function showCopyBadge(text) {
  copyBadge.textContent = text;
  copyBadge.classList.remove('hidden');
  setTimeout(() => {
    copyBadge.classList.add('hidden');
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initApp);
