import { GHOST_CONFIG, translateChat, generateChatIdeas, processAdaptiveInterview, getActiveKey } from './core.js';

// DOM Elements
const tabBtns = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');
const inputCard = document.getElementById('inputCard');
const outputCard = document.getElementById('outputCard');
const inputText = document.getElementById('inputText');
const btnTranslate = document.getElementById('btnTranslate');
const btnTranslateSpinner = document.getElementById('btnTranslateSpinner');
const btnTranslateText = document.getElementById('btnTranslateText');
const outputText = document.getElementById('outputText');
const copyBadge = document.getElementById('copyBadge');
const btnManualCopy = document.getElementById('btnManualCopy');
const btnClear = document.getElementById('btnClear');
const clarifyCard = document.getElementById('clarifyCard');
const clarifyText = document.getElementById('clarifyText');
const clarifyInput = document.getElementById('clarifyInput');
const btnSendClarify = document.getElementById('btnSendClarify');
const toneChips = document.querySelectorAll('.tone-chip:not(.wizard-chip):not(.append-chip)');
const modelBadge = document.getElementById('modelBadge');

// Status Notice Banner Elements
const statusNotice = document.getElementById('statusNotice');
const statusNoticeText = document.getElementById('statusNoticeText');
const btnNoticeAction = document.getElementById('btnNoticeAction');

// Ideas Tab Elements
const fanInputCard = document.getElementById('fanInputCard');
const fanMessageInput = document.getElementById('fanMessageInput');
const btnGenerateIdeas = document.getElementById('btnGenerateIdeas');
const btnIdeasSpinner = document.getElementById('btnIdeasSpinner');
const btnIdeasText = document.getElementById('btnIdeasText');
const ideasContainer = document.getElementById('ideasContainer');

// Adaptive Interview Elements
const qRole = document.getElementById('qRole');
const qAudience = document.getElementById('qAudience');
const qSlangs = document.getElementById('qSlangs');
const qBanned = document.getElementById('qBanned');
const qHooks = document.getElementById('qHooks');
const btnRunAdaptiveInterview = document.getElementById('btnRunAdaptiveInterview');
const btnResetDefaultDna = document.getElementById('btnResetDefaultDna');
const btnToggleEditInterview = document.getElementById('btnToggleEditInterview');
const dnaSummary = document.getElementById('dnaSummary');
const dnaRole = document.getElementById('dnaRole');
const dnaSlangs = document.getElementById('dnaSlangs');
const interviewFormCard = document.getElementById('interviewFormCard');

// Interview Onboarding Modal Elements
const interviewPromptModal = document.getElementById('interviewPromptModal');
const btnCloseInterviewPrompt = document.getElementById('btnCloseInterviewPrompt');
const btnStartInterviewModal = document.getElementById('btnStartInterviewModal');
const btnSkipInterviewModal = document.getElementById('btnSkipInterviewModal');

// Settings Elements
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const offlineBanner = document.getElementById('offlineBanner');
const toastContainer = document.getElementById('toastContainer');

// State
let currentPersona = null;
let currentTone = 'flirty';
let lastFailedText = '';

// Toast Notification Helper
function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Visual Status Effect Helper
function setStatus(state, message, showRetry = false) {
  if (!statusNotice) return;
  statusNotice.className = `status-${state}`;
  statusNoticeText.textContent = message;
  statusNotice.classList.remove('hidden');

  if (showRetry && btnNoticeAction) {
    btnNoticeAction.classList.remove('hidden');
    btnNoticeAction.onclick = () => {
      if (lastFailedText) {
        inputText.value = lastFailedText;
        handleTranslate();
      }
    };
  } else if (btnNoticeAction) {
    btnNoticeAction.classList.add('hidden');
  }

  if (state === 'success') {
    outputCard?.classList.add('success-glow');
    setTimeout(() => {
      outputCard?.classList.remove('success-glow');
      statusNotice?.classList.add('hidden');
    }, 4500);
  } else if (state === 'error') {
    outputCard?.classList.add('error-glow');
    setTimeout(() => outputCard?.classList.remove('error-glow'), 5000);
  }
}

function initApp() {
  // Sync the active valid API key into localStorage
  const validKey = getActiveKey();
  apiKeyInput.value = validKey;

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
  populateInterviewForm();

  // Setup Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=5').catch(() => {});
  }

  // Check first-time interview prompt
  checkInterviewPrompt();

  // Network listeners
  window.addEventListener('online', () => {
    offlineBanner.classList.add('hidden');
    showToast('Internet connection restored', 'success', 2500);
  });
  window.addEventListener('offline', () => {
    offlineBanner.classList.remove('hidden');
    showToast('No internet connection. Waiting for network...', 'warning', 4000);
  });
  if (!navigator.onLine) offlineBanner.classList.remove('hidden');

  bindEvents();
}

function checkInterviewPrompt() {
  const completed = localStorage.getItem('ghost_interview_completed');
  const skipped = localStorage.getItem('ghost_interview_skipped');
  if (!completed && !skipped) {
    setTimeout(() => {
      interviewPromptModal?.classList.remove('hidden');
    }, 1200);
  }
}

function updatePersonaDisplay() {
  if (!currentPersona) return;
  if (dnaSummary) dnaSummary.textContent = currentPersona.summary || currentPersona.context;
  if (dnaRole) dnaRole.textContent = currentPersona.role || 'OnlyFans Chatter';
  if (dnaSlangs) dnaSlangs.textContent = currentPersona.favoriteSlangs || 'babe, rn, tbh, wyd, omg';
}

function populateInterviewForm() {
  if (!currentPersona) return;
  if (qRole) qRole.value = currentPersona.role || '';
  if (qAudience) qAudience.value = currentPersona.context || '';
  if (qSlangs) qSlangs.value = currentPersona.favoriteSlangs || '';
  if (qBanned) qBanned.value = currentPersona.forbiddenWords || '';
  if (qHooks) qHooks.value = currentPersona.chatStrategy || '';
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
      showToast(`Tone changed to: ${chip.textContent}`, 'info', 1500);
    });
  });

  // Wizard Chip Selection (Replace Value)
  document.querySelectorAll('.wizard-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetId = chip.dataset.target;
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        targetInput.value = chip.dataset.val;
        showToast(`Set: ${chip.textContent}`, 'info', 1200);
      }
    });
  });

  // Append Chip Selection (Append Tag)
  document.querySelectorAll('.append-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetId = chip.dataset.target;
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        const val = chip.dataset.val;
        if (!targetInput.value.includes(val)) {
          targetInput.value = targetInput.value ? `${targetInput.value.trim()}, ${val}` : val;
          showToast(`Added: ${chip.textContent}`, 'info', 1200);
        }
      }
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

  // On first input focus, if interview not completed or skipped, prompt
  inputText.addEventListener('focus', () => {
    const completed = localStorage.getItem('ghost_interview_completed');
    const skipped = localStorage.getItem('ghost_interview_skipped');
    if (!completed && !skipped) {
      interviewPromptModal?.classList.remove('hidden');
    }
  }, { once: true });

  // Manual Copy
  btnManualCopy.addEventListener('click', () => {
    const text = outputText.textContent.trim();
    if (text) {
      navigator.clipboard.writeText(text);
      showToast('✓ Copied to clipboard!', 'success', 2000);
      showCopyBadge('✓ Copied');
    }
  });

  // Clear
  btnClear.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    clarifyCard.classList.add('hidden');
    copyBadge.classList.add('hidden');
    statusNotice.classList.add('hidden');
    outputCard.classList.remove('success-glow', 'error-glow');
    inputCard.classList.remove('sending');
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

  // Run Adaptive Deep Interview
  btnRunAdaptiveInterview?.addEventListener('click', handleAdaptiveInterview);

  // Reset Persona to Default
  btnResetDefaultDna?.addEventListener('click', () => {
    if (confirm('Reset to standard OnlyFans VIP Chatter voice?')) {
      currentPersona = GHOST_CONFIG.defaultPersona;
      localStorage.setItem('ghost_persona', JSON.stringify(currentPersona));
      updatePersonaDisplay();
      populateInterviewForm();
      showToast('✓ Reset to Default Persona DNA', 'info', 2000);
    }
  });

  // Edit Persona Button
  btnToggleEditInterview?.addEventListener('click', () => {
    populateInterviewForm();
    qRole?.focus();
    showToast('Editing active persona DNA below', 'info', 1500);
  });

  // Interview Modal Actions
  btnStartInterviewModal?.addEventListener('click', () => {
    interviewPromptModal?.classList.add('hidden');
    const interviewTabBtn = document.querySelector('[data-tab="tabInterview"]');
    interviewTabBtn?.click();
    qRole?.focus();
  });

  btnSkipInterviewModal?.addEventListener('click', () => {
    interviewPromptModal?.classList.add('hidden');
    localStorage.setItem('ghost_interview_skipped', 'true');
    showToast('Using default flirty voice. You can calibrate anytime under "Interview" tab.', 'info', 3000);
  });

  btnCloseInterviewPrompt?.addEventListener('click', () => {
    interviewPromptModal?.classList.add('hidden');
    localStorage.setItem('ghost_interview_skipped', 'true');
  });

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
    showToast('Settings saved successfully', 'success', 2000);
  });
}

async function handleTranslate() {
  const text = inputText.value.trim();
  if (!text) {
    showToast('Please type a message first', 'warning', 2000);
    return;
  }

  // 1. Visual Effect: Sending state
  inputCard.classList.add('sending');
  outputCard.classList.remove('success-glow', 'error-glow');
  btnTranslate.disabled = true;
  btnTranslateSpinner.classList.remove('hidden');
  btnTranslateText.textContent = 'Translating...';
  outputText.textContent = 'Translating in real-time...';
  outputText.classList.add('loading');
  clarifyCard.classList.add('hidden');
  copyBadge.classList.add('hidden');

  setStatus('sending', '⏳ Sending message to AI... processing response');
  showToast('Sending message to AI...', 'info', 1800);

  // Inject active tone into persona context
  const activePersona = { ...currentPersona };
  if (currentTone === 'flirty') {
    activePersona.toneDynamic += ' Seductive, sweet, playful, cute babe vibe.';
  } else if (currentTone === 'short') {
    activePersona.formattingRules += ' Keep responses ultra-brief, 2 to 5 words max.';
  } else if (currentTone === 'street') {
    activePersona.favoriteSlangs += ', ngl, no cap, bruh, fr, rn';
  }

  const result = await translateChat({
    text,
    apiKey: apiKeyInput.value.trim() || getActiveKey(),
    persona: activePersona,
    platform: 'Web App'
  });

  // End sending state
  inputCard.classList.remove('sending');
  outputText.classList.remove('loading');
  btnTranslate.disabled = false;
  btnTranslateSpinner.classList.add('hidden');
  btnTranslateText.textContent = 'Translate ➔';

  // 2. Handle Error State
  if (!result.success) {
    lastFailedText = text;
    outputText.textContent = `Error: ${result.error}`;
    setStatus('error', `❌ Not sent: ${result.error}`, true);
    showToast(`❌ Failed to send: ${result.error}`, 'error', 4500);
    return;
  }

  // 3. Handle Clarification
  if (result.isClarification) {
    clarifyCard.classList.remove('hidden');
    clarifyText.textContent = result.text;
    outputText.textContent = '(Waiting for clarification to translate accurately...)';
    clarifyInput.focus();
    setStatus('error', '⚠️ Word clarification needed before translation can complete');
    showToast('⚠️ Please clarify the highlighted word', 'warning', 3000);
    return;
  }

  // 4. Handle Success State
  outputText.textContent = result.text;
  modelBadge.textContent = result.modelUsed.split('/')[1] || 'AI Ready';
  showCopyBadge('✓ Auto-copied');
  setStatus('success', '✓ Message sent & translated! Automatically copied to your clipboard.');
  showToast('✓ Message sent & copied to clipboard!', 'success', 3000);

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate([40]); } catch (e) {}
  }
}

async function handleGenerateIdeas() {
  const msg = fanMessageInput.value.trim();
  if (!msg) {
    showToast('Please paste a fan message first', 'warning', 2000);
    return;
  }

  fanInputCard?.classList.add('sending');
  btnGenerateIdeas.disabled = true;
  btnIdeasSpinner.classList.remove('hidden');
  btnIdeasText.textContent = 'Generating...';
  ideasContainer.innerHTML = '<div class="placeholder-msg">Generating 3 human options...</div>';
  showToast('Generating 3 replies...', 'info', 2000);

  const res = await generateChatIdeas({
    subscriberMessage: msg,
    apiKey: apiKeyInput.value.trim() || getActiveKey(),
    persona: currentPersona,
    platform: 'Web App'
  });

  fanInputCard?.classList.remove('sending');
  btnGenerateIdeas.disabled = false;
  btnIdeasSpinner.classList.add('hidden');
  btnIdeasText.textContent = '💡 Generate Ideas';

  if (!res.success || !res.ideas) {
    ideasContainer.innerHTML = `<div class="placeholder-msg" style="color:#ef4444">${res.error || 'Failed to generate ideas'}</div>`;
    showToast(`❌ Failed to generate ideas: ${res.error}`, 'error', 3500);
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
      showToast('✓ Idea copied to clipboard!', 'success', 2000);
      setTimeout(() => copyBtn.textContent = '📋 Copy & Send', 1500);
    });

    ideasContainer.appendChild(card);
  });

  showToast('✓ 3 Ideas generated successfully!', 'success', 2500);
}

async function handleAdaptiveInterview() {
  const interviewData = {
    roleAndPlatform: qRole?.value.trim() || 'OnlyFans Chatter',
    audienceDynamic: qAudience?.value.trim() || 'Men aged 25-45 looking for sweet teasing and engagement',
    slangsAndKeywords: qSlangs?.value.trim() || 'babe, honey, rn, tbh, wyd, omg, haha',
    antiAiRules: qBanned?.value.trim() || 'Never sound like an AI, drop trailing periods, all lowercase',
    conversationHooks: qHooks?.value.trim() || 'Always ask a follow-up question to keep them talking'
  };

  btnRunAdaptiveInterview.disabled = true;
  btnRunAdaptiveInterview.textContent = 'Synthesizing Persona DNA...';
  showToast('AI is synthesizing your custom Persona DNA...', 'info', 3000);

  const res = await processAdaptiveInterview({
    interviewData,
    apiKey: apiKeyInput.value.trim() || getActiveKey()
  });

  btnRunAdaptiveInterview.disabled = false;
  btnRunAdaptiveInterview.textContent = '⚡ Calibrate & Save Persona DNA';

  if (res.success && res.persona) {
    currentPersona = res.persona;
    localStorage.setItem('ghost_persona', JSON.stringify(currentPersona));
    localStorage.setItem('ghost_interview_completed', 'true');
    updatePersonaDisplay();
    showToast('✓ Persona DNA calibrated & saved permanently!', 'success', 4000);
  } else {
    showToast('Could not calibrate. Using defaults.', 'warning', 3000);
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
