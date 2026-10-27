/**
 * Personal Inbox AI — Interactive Live Demo Application Logic
 * 100% Client-Side In-Memory Engine. Zero Backend Dependency.
 * Works flawlessly offline, locally via file://, and on GitHub Pages.
 * 
 * Version: 1.3.0
 */

(function () {
  'use strict';

  const CACHE_VERSION = '1.3.0';
  const STORAGE_KEY_THREADS = `personal_inbox_threads_v${CACHE_VERSION.replace(/\./g, '_')}`;
  const STORAGE_KEY_THEME = 'personal_inbox_theme';
  const STORAGE_KEY_VERSION = 'personal_inbox_cache_version';

  // --- APPLICATION STATE ---
  const state = {
    threads: [],
    selectedIds: new Set(),
    activeView: 'all', // all | unread | in-progress | urgent | completed | starred | archived | suspicious | trash
    searchQuery: '',
    filters: {
      category: 'all',
      priority: 'all',
      action: 'all',
      lang: 'all',
      status: 'all', // all | shielded | suspicious
    },
    sortField: 'date',
    sortDirection: 'desc',
    activeThread: null,
    activeDrawerTab: 'preview', // preview | timeline | gates | meta
    currentTheme: 'editorial', // editorial | neobrutal | dark
    focusedIndex: 0,

    // Terminal Simulator State
    terminalStreaming: true,
    terminalSpeed: 1, // 1 | 2 | 5
    terminalTagFilter: 'all',
    terminalLogs: [],
    terminalTimer: null,

    // Pipeline Simulator State
    pipelineRunning: false,
    pipelineTimer: null,

    // Undo Banner State
    undoTimer: null,
    undoSecondsRemaining: 10,
    undoActionPending: null,
  };

  // --- THEME DEFINITIONS ---
  const THEMES = ['editorial', 'neobrutal', 'dark'];
  const THEME_LABELS = {
    editorial: 'Editorial',
    neobrutal: 'Neo-Brutalist',
    dark: 'Cyber Dark',
  };

  // --- CACHE MIGRATION & LOCAL STORAGE INITIALIZATION ---
  function initData() {
    // 1. Purge obsolete cache keys from older demo versions
    try {
      const storedVersion = localStorage.getItem(STORAGE_KEY_VERSION);
      if (storedVersion !== CACHE_VERSION) {
        console.log(`[Cache Migration] Upgrading cache from ${storedVersion || 'legacy'} to ${CACHE_VERSION}`);
        // Purge old keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('personal_inbox_threads') && key !== STORAGE_KEY_THREADS) {
            localStorage.removeItem(key);
          }
        }
        localStorage.setItem(STORAGE_KEY_VERSION, CACHE_VERSION);
        localStorage.removeItem(STORAGE_KEY_THREADS); // Load pristine sanitized dataset
      }
    } catch (e) {
      console.warn('LocalStorage access restricted or unavailable in private browsing mode.');
    }

    // 2. Check for locally modified dataset
    try {
      const savedThreads = localStorage.getItem(STORAGE_KEY_THREADS);
      if (savedThreads) {
        const parsed = JSON.parse(savedThreads);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.threads = parsed;
          finishInit();
          return;
        }
      }
    } catch (e) {}

    // 3. Fallback to global window.INITIAL_DATA (guaranteed no CORS on file://)
    if (window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA) && window.INITIAL_DATA.length > 0) {
      state.threads = JSON.parse(JSON.stringify(window.INITIAL_DATA));
      finishInit();
    } else {
      // 4. Fallback to fetch demo-data.json
      fetch('demo-data.json?v=' + CACHE_VERSION)
        .then((res) => res.json())
        .then((data) => {
          state.threads = JSON.parse(JSON.stringify(data));
          finishInit();
        })
        .catch((err) => {
          console.error('Failed to load demo-data.json:', err);
          showToast('Failed to load sanitized demo dataset.', 'error');
        });
    }
  }

  function persistThreads() {
    try {
      localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(state.threads));
    } catch (e) {}
  }

  function finishInit() {
    initTheme();
    bindEvents();
    renderAll();
    startTerminalSimulation();
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- THEME MANAGEMENT ---
  function initTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved && THEMES.includes(saved)) {
        applyTheme(saved);
        return;
      }
    } catch (e) {}
    applyTheme('editorial');
  }

  function applyTheme(theme) {
    state.currentTheme = theme;
    document.documentElement.className = '';
    document.documentElement.classList.add(`theme-${theme}`);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    const label = document.getElementById('theme-label');
    if (label) {
      label.textContent = THEME_LABELS[theme] || 'Theme';
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (e) {}
  }

  function cycleTheme() {
    const idx = THEMES.indexOf(state.currentTheme);
    const next = THEMES[(idx + 1) % THEMES.length];
    applyTheme(next);
    showToast(`Switched theme to ${THEME_LABELS[next]}`, 'info');
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    // Top banner controls
    document.getElementById('btn-theme-toggle')?.addEventListener('click', cycleTheme);
    document.getElementById('btn-simulate-pipeline')?.addEventListener('click', openPipelineModal);
    document.getElementById('btn-open-arch')?.addEventListener('click', openArchModal);
    document.getElementById('btn-open-terminal')?.addEventListener('click', openTerminalModal);

    // Sidebar view switches
    document.querySelectorAll('.nav-view-btn[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        setActiveView(view);
      });
    });

    // Hermes sync trigger simulation
    document.getElementById('btn-sync-emails')?.addEventListener('click', simulateHermesSync);

    // Search input
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('btn-search-clear');
    searchInput?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      if (searchClear) {
        if (state.searchQuery) {
          searchClear.classList.remove('hidden');
        } else {
          searchClear.classList.add('hidden');
        }
      }
      renderActiveFilterPills();
      renderTable();
    });

    searchClear?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      searchClear.classList.add('hidden');
      renderActiveFilterPills();
      renderTable();
      searchInput?.focus();
    });

    // Multi-attribute dropdown filters
    ['filter-category', 'filter-priority', 'filter-action', 'filter-lang', 'filter-status'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        const key = id.replace('filter-', '');
        state.filters[key] = e.target.value;
        renderActiveFilterPills();
        renderTable();
      });
    });

    // Filter bar toggle for mobile / compact screens
    document.getElementById('btn-toggle-filters')?.addEventListener('click', () => {
      const container = document.getElementById('filter-dropdowns-container');
      if (container) {
        container.classList.toggle('hidden');
      }
    });

    // Clear filters button
    document.getElementById('btn-clear-filters')?.addEventListener('click', resetAllFilters);
    document.getElementById('btn-empty-reset')?.addEventListener('click', resetAllFilters);

    // Sort column headers
    document.querySelectorAll('th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        handleSort(field);
      });
    });

    // Master check all rows
    document.getElementById('check-all-rows')?.addEventListener('change', (e) => {
      const visible = getFilteredThreads();
      if (e.target.checked) {
        visible.forEach((t) => state.selectedIds.add(t.id));
      } else {
        visible.forEach((t) => state.selectedIds.delete(t.id));
      }
      renderTable();
      renderBatchDock();
    });

    // Batch dock selection helpers & actions
    document.getElementById('btn-select-all-visible')?.addEventListener('click', () => {
      const visible = getFilteredThreads();
      visible.forEach((t) => state.selectedIds.add(t.id));
      renderTable();
      renderBatchDock();
      showToast(`Selected all ${visible.length} visible threads`, 'info');
    });

    document.getElementById('btn-select-unread')?.addEventListener('click', () => {
      const visible = getFilteredThreads().filter((t) => !t.isRead);
      visible.forEach((t) => state.selectedIds.add(t.id));
      renderTable();
      renderBatchDock();
      showToast(`Selected ${visible.length} unread threads`, 'info');
    });

    document.getElementById('batch-deselect')?.addEventListener('click', () => {
      state.selectedIds.clear();
      renderTable();
      renderBatchDock();
    });

    document.getElementById('batch-mark-read')?.addEventListener('click', () => batchUpdate({ isRead: true }));
    document.getElementById('batch-star')?.addEventListener('click', batchToggleStar);
    document.getElementById('batch-simulate')?.addEventListener('click', batchSimulateMl);
    document.getElementById('batch-archive')?.addEventListener('click', () => batchUpdate({ inInbox: false }));
    document.getElementById('batch-delete')?.addEventListener('click', batchDelete);
    document.getElementById('batch-export-csv')?.addEventListener('click', exportSelectedToCSV);
    document.getElementById('batch-copy-summary')?.addEventListener('click', copySelectedSummary);

    // Detail drawer events
    document.getElementById('detail-drawer-backdrop')?.addEventListener('click', closeDrawer);
    document.getElementById('drawer-close-btn')?.addEventListener('click', closeDrawer);
    document.getElementById('drawer-done-btn')?.addEventListener('click', closeDrawer);

    document.getElementById('drawer-star-btn')?.addEventListener('click', () => {
      if (!state.activeThread) return;
      state.activeThread.isStarred = !state.activeThread.isStarred;
      syncThreadUpdate(state.activeThread);
      updateDrawerStarButton();
      renderTable();
      renderSidebarStats();
      persistThreads();
    });

    document.getElementById('drawer-toggle-read')?.addEventListener('click', () => {
      if (!state.activeThread) return;
      state.activeThread.isRead = !state.activeThread.isRead;
      syncThreadUpdate(state.activeThread);
      updateDrawerReadButton();
      renderTable();
      renderSidebarStats();
      persistThreads();
    });

    document.getElementById('drawer-toggle-archive')?.addEventListener('click', () => {
      if (!state.activeThread) return;
      state.activeThread.inInbox = !state.activeThread.inInbox;
      syncThreadUpdate(state.activeThread);
      renderTable();
      renderSidebarStats();
      persistThreads();
      closeDrawer();
      showToast(state.activeThread.inInbox ? 'Thread restored to inbox' : 'Thread archived', 'info');
    });

    document.getElementById('drawer-delete-btn')?.addEventListener('click', () => {
      if (!state.activeThread) return;
      state.activeThread.isTrash = true;
      syncThreadUpdate(state.activeThread);
      renderTable();
      renderSidebarStats();
      persistThreads();
      closeDrawer();
      showToast('Thread moved to trash', 'warning');
    });

    // Drawer tab switching (4 Tabbed Sections Mandate)
    document.querySelectorAll('.drawer-tab-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        setDrawerTab(tab);
      });
    });

    // Copy actions in drawer
    document.getElementById('btn-copy-body')?.addEventListener('click', () => {
      if (!state.activeThread) return;
      navigator.clipboard.writeText(state.activeThread.body).then(() => {
        showToast('Message body copied to clipboard', 'success');
      });
    });

    document.getElementById('btn-copy-facts')?.addEventListener('click', () => {
      if (!state.activeThread || !state.activeThread.extractedFields) return;
      const text = Object.entries(state.activeThread.extractedFields)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      navigator.clipboard.writeText(text).then(() => {
        showToast('Extracted facts copied to clipboard', 'success');
      });
    });

    document.getElementById('btn-copy-raw-json')?.addEventListener('click', () => {
      if (!state.activeThread) return;
      navigator.clipboard.writeText(JSON.stringify(state.activeThread, null, 2)).then(() => {
        showToast('Raw telemetry JSON copied to clipboard', 'success');
      });
    });

    // Contextual AI Reply Assistant in Drawer
    document.querySelectorAll('.reply-chip[data-intent]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const intent = chip.getAttribute('data-intent');
        handleReplyIntent(intent);
      });
    });

    document.getElementById('btn-generate-ai-reply')?.addEventListener('click', generateAiDraft);
    document.getElementById('btn-send-reply')?.addEventListener('click', triggerSendReplyWithUndo);
    document.getElementById('undo-btn')?.addEventListener('click', cancelUndoSend);

    // Pipeline Simulator Modal
    document.getElementById('pipeline-modal-backdrop')?.addEventListener('click', closePipelineModal);
    document.getElementById('pipeline-modal-close')?.addEventListener('click', closePipelineModal);
    document.getElementById('btn-pipeline-done')?.addEventListener('click', closePipelineModal);
    document.getElementById('btn-pipeline-rerun')?.addEventListener('click', runSteppedPipelineSimulation);

    // Live Terminal Modal
    document.getElementById('terminal-modal-backdrop')?.addEventListener('click', closeTerminalModal);
    document.getElementById('terminal-modal-close')?.addEventListener('click', closeTerminalModal);
    document.getElementById('btn-toggle-terminal-stream')?.addEventListener('click', toggleTerminalStreaming);
    document.getElementById('btn-clear-terminal')?.addEventListener('click', clearTerminal);
    document.getElementById('btn-copy-terminal')?.addEventListener('click', copyTerminalLogs);

    // Terminal Tag Filter & Speed Buttons
    document.getElementById('terminal-tag-filter')?.addEventListener('change', (e) => {
      state.terminalTagFilter = e.target.value;
      renderTerminalOutput();
    });

    document.querySelectorAll('.term-speed-btn[data-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseInt(btn.getAttribute('data-speed'), 10);
        state.terminalSpeed = speed;
        document.querySelectorAll('.term-speed-btn').forEach((b) => {
          b.className = 'term-speed-btn px-1.5 py-0.5 rounded text-gray-400 hover:text-white';
        });
        btn.className = 'term-speed-btn px-1.5 py-0.5 rounded text-white font-bold bg-orange-600';
        restartTerminalTimer();
      });
    });

    // System Architecture Modal
    document.getElementById('arch-modal-backdrop')?.addEventListener('click', closeArchModal);
    document.getElementById('arch-modal-close')?.addEventListener('click', closeArchModal);
    document.getElementById('arch-modal-done')?.addEventListener('click', closeArchModal);

    // Global Keyboard Shortcuts (Superhuman-Style)
    window.addEventListener('keydown', handleGlobalKeydown);
  }

  // --- VIEW SELECTION & FILTERING ---
  function setActiveView(view) {
    state.activeView = view;
    // Update sidebar navigation active styling
    document.querySelectorAll('.nav-view-btn[data-view]').forEach((btn) => {
      const v = btn.getAttribute('data-view');
      if (v === view) {
        btn.classList.add('bg-orange-500/10', 'text-orange-600', 'dark:text-orange-400', 'border', 'border-orange-500/20');
        btn.classList.remove('text-[var(--text-main)]');
      } else {
        btn.classList.remove('bg-orange-500/10', 'text-orange-600', 'dark:text-orange-400', 'border', 'border-orange-500/20');
        btn.classList.add('text-[var(--text-main)]');
      }
    });

    const activeViewLabel = document.getElementById('active-view-label');
    if (activeViewLabel) {
      const labels = {
        all: 'ALL ITEMS',
        unread: 'UNREAD / NEW',
        'in-progress': 'IN-PROGRESS (ACTION)',
        urgent: 'FLAGGED / URGENT',
        completed: 'COMPLETED / READY',
        starred: 'BOOKMARKED',
        archived: 'ARCHIVED',
        suspicious: 'QUARANTINE (PHISH)',
        trash: 'TRASH',
      };
      activeViewLabel.textContent = labels[view] || view.toUpperCase();
    }

    renderActiveFilterPills();
    renderTable();
  }

  function getFilteredThreads() {
    let list = state.threads.slice();

    // 1. Sidebar tab view filtering
    switch (state.activeView) {
      case 'unread':
        list = list.filter((t) => !t.isRead && t.inInbox && !t.isTrash);
        break;
      case 'in-progress':
        list = list.filter((t) => (t.actionRequired === 'reply' || t.actionRequired === 'action') && t.inInbox && !t.isTrash);
        break;
      case 'urgent':
        list = list.filter((t) => t.priority === 3 && t.inInbox && !t.isTrash);
        break;
      case 'completed':
        list = list.filter((t) => t.isRead && t.inInbox && !t.isTrash);
        break;
      case 'starred':
        list = list.filter((t) => t.isStarred && !t.isTrash);
        break;
      case 'archived':
        list = list.filter((t) => !t.inInbox && !t.isTrash);
        break;
      case 'suspicious':
        list = list.filter((t) => t.suspicious && !t.isTrash);
        break;
      case 'trash':
        list = list.filter((t) => t.isTrash);
        break;
      case 'all':
      default:
        list = list.filter((t) => t.inInbox && !t.isTrash);
        break;
    }

    // 2. Search query filtering (full-text across all fields)
    if (state.searchQuery) {
      const q = state.searchQuery;
      list = list.filter((t) => {
        const text = [
          t.id,
          t.subject,
          t.fromName,
          t.fromEmail,
          t.fromDomain,
          t.snippet,
          t.body,
          t.category,
          t.actionRequired,
          t.extractedFields?.amount,
          t.extractedFields?.iban,
          t.extractedFields?.otpCode,
          t.extractedFields?.trackingNumber,
          t.extractedFields?.dueDate,
          t.extractedFields?.bookingCode,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return text.includes(q);
      });
    }

    // 3. Dropdown attribute filters
    if (state.filters.category !== 'all') {
      list = list.filter((t) => t.category === state.filters.category);
    }
    if (state.filters.priority !== 'all') {
      const p = parseInt(state.filters.priority, 10);
      list = list.filter((t) => t.priority === p);
    }
    if (state.filters.action !== 'all') {
      list = list.filter((t) => t.actionRequired === state.filters.action);
    }
    if (state.filters.lang !== 'all') {
      list = list.filter((t) => (t.lang || 'en') === state.filters.lang);
    }
    if (state.filters.status === 'shielded') {
      list = list.filter((t) => t.sensitive || t.autoArchiveBlocked);
    } else if (state.filters.status === 'suspicious') {
      list = list.filter((t) => t.suspicious);
    }

    // 4. Sorting
    list.sort((a, b) => {
      let valA = a[state.sortField];
      let valB = b[state.sortField];

      if (state.sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (state.sortField === 'priority' || state.sortField === 'jevConfidence') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  function handleSort(field) {
    if (state.sortField === field) {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortField = field;
      state.sortDirection = field === 'date' || field === 'priority' || field === 'jevConfidence' ? 'desc' : 'asc';
    }

    // Update table header directional arrows
    document.querySelectorAll('th[data-sort]').forEach((th) => {
      const f = th.getAttribute('data-sort');
      const icon = th.querySelector('.sort-icon');
      if (f === state.sortField) {
        if (icon) icon.textContent = state.sortDirection === 'asc' ? '▲' : '▼';
        th.classList.add('text-orange-600', 'dark:text-orange-400');
      } else {
        if (icon) icon.textContent = '↕';
        th.classList.remove('text-orange-600', 'dark:text-orange-400');
      }
    });

    const sortLabel = document.getElementById('active-sort-label');
    if (sortLabel) {
      const names = {
        date: 'Date',
        priority: 'Priority',
        fromName: 'Sender',
        subject: 'Subject',
        category: 'Category',
        actionRequired: 'Action Intent',
        jevConfidence: 'AI Confidence',
      };
      sortLabel.textContent = `Sorted by ${names[field] || field} (${state.sortDirection === 'asc' ? 'Ascending' : 'Descending'})`;
    }

    renderTable();
  }

  function resetAllFilters() {
    state.searchQuery = '';
    state.filters = { category: 'all', priority: 'all', action: 'all', lang: 'all', status: 'all' };

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const searchClear = document.getElementById('btn-search-clear');
    if (searchClear) searchClear.classList.add('hidden');

    ['category', 'priority', 'action', 'lang', 'status'].forEach((k) => {
      const select = document.getElementById(`filter-${k}`);
      if (select) select.value = 'all';
    });

    renderActiveFilterPills();
    renderTable();
    showToast('Filters reset to default', 'info');
  }

  function renderActiveFilterPills() {
    const pillsContainer = document.getElementById('active-filter-pills');
    const clearBtn = document.getElementById('btn-clear-filters');
    if (!pillsContainer) return;

    let pillsHtml = '';
    let hasFilter = false;

    if (state.searchQuery) {
      hasFilter = true;
      pillsHtml += `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900">
          Search: "${escapeHtml(state.searchQuery)}"
          <button onclick="window.__clearFilter('search')" class="hover:text-red-600">✕</button>
        </span>
      `;
    }

    if (state.filters.category !== 'all') {
      hasFilter = true;
      pillsHtml += `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[var(--border-app)]">
          Category: ${state.filters.category}
          <button onclick="window.__clearFilter('category')" class="hover:text-red-600">✕</button>
        </span>
      `;
    }

    if (state.filters.priority !== 'all') {
      hasFilter = true;
      pillsHtml += `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[var(--border-app)]">
          Priority: P${state.filters.priority}
          <button onclick="window.__clearFilter('priority')" class="hover:text-red-600">✕</button>
        </span>
      `;
    }

    if (state.filters.action !== 'all') {
      hasFilter = true;
      pillsHtml += `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[var(--border-app)]">
          Action: ${state.filters.action}
          <button onclick="window.__clearFilter('action')" class="hover:text-red-600">✕</button>
        </span>
      `;
    }

    if (state.filters.lang !== 'all') {
      hasFilter = true;
      pillsHtml += `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[var(--border-app)]">
          Lang: ${state.filters.lang === 'fa' ? 'فارسی' : 'English'}
          <button onclick="window.__clearFilter('lang')" class="hover:text-red-600">✕</button>
        </span>
      `;
    }

    if (state.filters.status !== 'all') {
      hasFilter = true;
      pillsHtml += `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-900">
          Status: ${state.filters.status}
          <button onclick="window.__clearFilter('status')" class="hover:text-red-600">✕</button>
        </span>
      `;
    }

    pillsContainer.innerHTML = pillsHtml;

    if (clearBtn) {
      if (hasFilter) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
  }

  // Exposed helper for filter pills
  window.__clearFilter = function (type) {
    if (type === 'search') {
      state.searchQuery = '';
      const input = document.getElementById('search-input');
      if (input) input.value = '';
      const clearBtn = document.getElementById('btn-search-clear');
      if (clearBtn) clearBtn.classList.add('hidden');
    } else if (state.filters[type] !== undefined) {
      state.filters[type] = 'all';
      const select = document.getElementById(`filter-${type}`);
      if (select) select.value = 'all';
    }
    renderActiveFilterPills();
    renderTable();
  };

  // --- RENDERING CORE ---
  function renderAll() {
    renderSidebarStats();
    renderActiveFilterPills();
    renderTable();
    renderBatchDock();
  }

  function renderSidebarStats() {
    const activeInbox = state.threads.filter((t) => t.inInbox && !t.isTrash);
    const unread = activeInbox.filter((t) => !t.isRead).length;
    const progress = activeInbox.filter((t) => t.actionRequired === 'reply' || t.actionRequired === 'action').length;
    const urgent = activeInbox.filter((t) => t.priority === 3).length;
    const completed = activeInbox.filter((t) => t.isRead).length;
    const starred = state.threads.filter((t) => t.isStarred && !t.isTrash).length;
    const archived = state.threads.filter((t) => !t.inInbox && !t.isTrash).length;
    const suspicious = state.threads.filter((t) => t.suspicious && !t.isTrash).length;
    const trash = state.threads.filter((t) => t.isTrash).length;

    setText('count-all', activeInbox.length);
    setText('count-unread', unread);
    setText('count-progress', progress);
    setText('count-urgent', urgent);
    setText('count-completed', completed);
    setText('count-starred', starred);
    setText('count-archived', archived);
    setText('count-suspicious', suspicious);
    setText('count-trash', trash);

    // Compute Triage Velocity Progress
    const total = activeInbox.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    const bar = document.getElementById('progress-bar');
    const percentEl = document.getElementById('progress-percent');
    const statsEl = document.getElementById('progress-stats');

    if (bar) bar.style.width = `${percentage}%`;
    if (percentEl) percentEl.textContent = `${percentage}%`;
    if (statsEl) statsEl.textContent = `${completed} processed of ${total}`;
  }

  function renderTable() {
    const tbody = document.getElementById('thread-table-body');
    const emptyState = document.getElementById('table-empty-state');
    const shownCountEl = document.getElementById('shown-count');
    const checkAll = document.getElementById('check-all-rows');

    if (!tbody) return;

    const filtered = getFilteredThreads();
    if (shownCountEl) shownCountEl.textContent = filtered.length;

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      emptyState?.classList.add('flex');
      if (checkAll) {
        checkAll.checked = false;
        checkAll.indeterminate = false;
      }
      return;
    }

    emptyState?.classList.add('hidden');
    emptyState?.classList.remove('flex');

    // Update master select checkbox (checked, unchecked, or indeterminate)
    if (checkAll) {
      const visibleIds = filtered.map((t) => t.id);
      const selectedCount = visibleIds.filter((id) => state.selectedIds.has(id)).length;
      if (selectedCount === 0) {
        checkAll.checked = false;
        checkAll.indeterminate = false;
      } else if (selectedCount === visibleIds.length) {
        checkAll.checked = true;
        checkAll.indeterminate = false;
      } else {
        checkAll.checked = false;
        checkAll.indeterminate = true;
      }
    }

    let html = '';
    filtered.forEach((thread) => {
      const isSelected = state.selectedIds.has(thread.id);
      const isUnread = !thread.isRead;

      // Priority Badge
      const priorityBadges = {
        3: '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold font-mono bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900 w-fit"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>P3 Urgent</span>',
        2: '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900 w-fit">P2 High</span>',
        1: '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 w-fit">P1 Normal</span>',
        0: '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border border-stone-200 dark:border-stone-700 w-fit">P0 Low</span>',
      };

      // Category Colors
      const categoryColors = {
        work: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        money: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        security: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        orders: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        travel: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        personal: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        newsletters: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        notifications: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };

      // Action Badge
      const actionLabels = {
        reply: '<span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">Needs Reply</span>',
        action: '<span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200">Needs Action</span>',
        review: '<span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">Review</span>',
        none: '<span class="px-2 py-0.5 rounded text-[10px] font-mono text-stone-400">None</span>',
      };

      // Security Badges
      let tagsHtml = '';
      if (thread.sensitive || thread.autoArchiveBlocked) {
        tagsHtml += `<span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">SHIELD</span> `;
      }
      if (thread.suspicious) {
        tagsHtml += `<span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">PHISH</span> `;
      }
      if (thread.lang === 'fa') {
        tagsHtml += `<span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-persian">فارسی</span> `;
      }

      const confPct = Math.round((thread.jevConfidence || 0.95) * 100);
      const confBadge = confPct >= 95
        ? `<span class="text-emerald-600 dark:text-emerald-400 font-bold font-mono">${confPct}%</span>`
        : `<span class="text-amber-600 dark:text-amber-400 font-bold font-mono">${confPct}%</span>`;

      const rowClass = isSelected
        ? 'bg-orange-500/10 dark:bg-orange-950/30'
        : isUnread
        ? 'bg-[var(--bg-surface)] font-medium'
        : 'bg-[var(--bg-surface)] opacity-85';

      html += `
        <tr data-thread-id="${thread.id}" class="group ${rowClass} hover:bg-orange-500/5 transition cursor-pointer border-b border-[var(--border-app)]">
          <!-- Checkbox -->
          <td class="py-2.5 px-3 text-center" onclick="event.stopPropagation()">
            <input type="checkbox" data-select-id="${thread.id}" ${isSelected ? 'checked' : ''} class="row-checkbox w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300 cursor-pointer">
          </td>

          <!-- Star Icon -->
          <td class="py-2.5 px-2 text-center" onclick="event.stopPropagation()">
            <button class="btn-row-star p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition" data-star-id="${thread.id}" title="${thread.isStarred ? 'Unstar' : 'Star'}">
              <i data-lucide="star" class="w-3.5 h-3.5 ${thread.isStarred ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}"></i>
            </button>
          </td>

          <!-- Priority -->
          <td class="py-2.5 px-3 whitespace-nowrap">
            ${priorityBadges[thread.priority] || priorityBadges[0]}
          </td>

          <!-- Sender -->
          <td class="py-2.5 px-3 whitespace-nowrap">
            <div class="flex items-center gap-1.5">
              ${isUnread ? '<span class="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>' : ''}
              <span class="font-bold text-[var(--text-main)] truncate max-w-[130px] sm:max-w-[160px]" title="${escapeHtml(thread.fromName)} (${escapeHtml(thread.fromEmail)})">
                ${escapeHtml(thread.fromName)}
              </span>
            </div>
            <div class="text-[10px] text-stone-500 font-mono truncate max-w-[130px]">
              ${escapeHtml(thread.fromDomain || thread.fromEmail)}
            </div>
          </td>

          <!-- Subject & Snippet -->
          <td class="py-2.5 px-4 min-w-0 max-w-[280px] sm:max-w-[380px] lg:max-w-[480px]">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${tagsHtml}
              <span class="font-bold text-[var(--text-main)] truncate ${isUnread ? 'font-extrabold' : ''}">
                ${escapeHtml(thread.subject)}
              </span>
            </div>
            <div class="text-[11px] text-stone-500 truncate mt-0.5">
              ${escapeHtml(thread.snippet)}
            </div>
          </td>

          <!-- Category -->
          <td class="py-2.5 px-3 whitespace-nowrap">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${categoryColors[thread.category] || categoryColors.personal}">
              ${thread.category}
            </span>
          </td>

          <!-- Action Required -->
          <td class="py-2.5 px-3 whitespace-nowrap hidden xl:table-cell">
            ${actionLabels[thread.actionRequired] || actionLabels.none}
          </td>

          <!-- Confidence -->
          <td class="py-2.5 px-3 whitespace-nowrap hidden lg:table-cell text-[11px]">
            ${confBadge}
          </td>

          <!-- Date -->
          <td class="py-2.5 px-3 whitespace-nowrap text-right text-[11px] font-mono text-stone-500">
            ${formatDate(thread.date)}
          </td>

          <!-- Quick Row Actions -->
          <td class="py-2.5 px-3 text-right whitespace-nowrap" onclick="event.stopPropagation()">
            <div class="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition">
              <button class="btn-row-read p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-blue-600" data-read-id="${thread.id}" title="${thread.isRead ? 'Mark as Unread' : 'Mark as Read'}">
                <i data-lucide="${thread.isRead ? 'mail-open' : 'mail'}" class="w-3.5 h-3.5"></i>
              </button>
              <button class="btn-row-archive p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-orange-600" data-archive-id="${thread.id}" title="${thread.inInbox ? 'Archive' : 'Restore to Inbox'}">
                <i data-lucide="${thread.inInbox ? 'archive' : 'rotate-ccw'}" class="w-3.5 h-3.5"></i>
              </button>
              <button class="btn-row-inspect p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-indigo-600 font-bold" data-inspect-id="${thread.id}" title="Inspect Thread Details">
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach row events
    tbody.querySelectorAll('tr[data-thread-id]').forEach((row) => {
      const id = row.getAttribute('data-thread-id');
      row.addEventListener('click', () => openDrawer(id));
    });

    tbody.querySelectorAll('.row-checkbox').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-select-id');
        if (e.target.checked) {
          state.selectedIds.add(id);
        } else {
          state.selectedIds.delete(id);
        }
        renderBatchDock();
      });
    });

    tbody.querySelectorAll('.btn-row-star').forEach((btn) => {
      btn.addEventListener('click', () => toggleStar(btn.getAttribute('data-star-id')));
    });

    tbody.querySelectorAll('.btn-row-read').forEach((btn) => {
      btn.addEventListener('click', () => toggleRead(btn.getAttribute('data-read-id')));
    });

    tbody.querySelectorAll('.btn-row-archive').forEach((btn) => {
      btn.addEventListener('click', () => toggleArchive(btn.getAttribute('data-archive-id')));
    });

    tbody.querySelectorAll('.btn-row-inspect').forEach((btn) => {
      btn.addEventListener('click', () => openDrawer(btn.getAttribute('data-inspect-id')));
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function renderBatchDock() {
    const dock = document.getElementById('batch-dock');
    const countEl = document.getElementById('batch-count');
    const count = state.selectedIds.size;

    if (!dock) return;

    if (count > 0) {
      if (countEl) countEl.textContent = count;
      dock.classList.remove('translate-y-28', 'opacity-0', 'pointer-events-none');
      dock.classList.add('translate-y-0', 'opacity-100');
    } else {
      dock.classList.add('translate-y-28', 'opacity-0', 'pointer-events-none');
      dock.classList.remove('translate-y-0', 'opacity-100');
    }
  }

  // --- THREAD MUTATIONS ---
  function toggleStar(id) {
    const t = state.threads.find((x) => x.id === id);
    if (!t) return;
    t.isStarred = !t.isStarred;
    renderTable();
    renderSidebarStats();
    persistThreads();
    showToast(t.isStarred ? 'Thread bookmarked' : 'Thread unstarred', 'info');
  }

  function toggleRead(id) {
    const t = state.threads.find((x) => x.id === id);
    if (!t) return;
    t.isRead = !t.isRead;
    renderTable();
    renderSidebarStats();
    persistThreads();
  }

  function toggleArchive(id) {
    const t = state.threads.find((x) => x.id === id);
    if (!t) return;
    t.inInbox = !t.inInbox;
    renderTable();
    renderSidebarStats();
    persistThreads();
    showToast(t.inInbox ? 'Thread restored to inbox' : 'Thread archived', 'info');
  }

  function syncThreadUpdate(updated) {
    const idx = state.threads.findIndex((x) => x.id === updated.id);
    if (idx !== -1) {
      state.threads[idx] = updated;
    }
  }

  function batchUpdate(patch) {
    state.threads.forEach((t) => {
      if (state.selectedIds.has(t.id)) {
        Object.assign(t, patch);
      }
    });
    const count = state.selectedIds.size;
    state.selectedIds.clear();
    renderAll();
    persistThreads();
    showToast(`Updated ${count} threads`, 'success');
  }

  function batchToggleStar() {
    state.threads.forEach((t) => {
      if (state.selectedIds.has(t.id)) {
        t.isStarred = !t.isStarred;
      }
    });
    const count = state.selectedIds.size;
    state.selectedIds.clear();
    renderAll();
    persistThreads();
    showToast(`Toggled star on ${count} threads`, 'info');
  }

  function batchDelete() {
    const count = state.selectedIds.size;
    state.threads.forEach((t) => {
      if (state.selectedIds.has(t.id)) {
        t.isTrash = true;
      }
    });
    state.selectedIds.clear();
    renderAll();
    persistThreads();
    showToast(`Moved ${count} threads to trash`, 'warning');
  }

  function batchSimulateMl() {
    const count = state.selectedIds.size;
    showToast(`Running Jev 1.13 batch inference across ${count} selected threads…`, 'info');
    setTimeout(() => {
      state.threads.forEach((t) => {
        if (state.selectedIds.has(t.id)) {
          t.jevConfidence = Math.min(0.99, Number(((t.jevConfidence || 0.94) + (Math.random() * 0.04 - 0.02)).toFixed(2)));
        }
      });
      state.selectedIds.clear();
      renderAll();
      persistThreads();
      showToast(`Batch ML inference completed on ${count} threads with 100% Invariant pass`, 'success');
    }, 850);
  }

  function exportSelectedToCSV() {
    const selected = state.threads.filter((t) => state.selectedIds.has(t.id));
    if (selected.length === 0) return;

    const headers = ['ID', 'Date', 'Priority', 'Category', 'Action Required', 'Sender Name', 'Sender Email', 'Subject', 'Snippet', 'Confidence', 'Sensitive', 'Language'];
    const rows = selected.map((t) => [
      t.id,
      t.date,
      t.priority,
      t.category,
      t.actionRequired,
      `"${(t.fromName || '').replace(/"/g, '""')}"`,
      `"${(t.fromEmail || '').replace(/"/g, '""')}"`,
      `"${(t.subject || '').replace(/"/g, '""')}"`,
      `"${(t.snippet || '').replace(/"/g, '""')}"`,
      t.jevConfidence || '',
      t.sensitive ? 'TRUE' : 'FALSE',
      t.lang || 'en',
    ]);

    // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `personal_inbox_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${selected.length} records to CSV with UTF-8 BOM`, 'success');
  }

  function copySelectedSummary() {
    const selected = state.threads.filter((t) => state.selectedIds.has(t.id));
    if (selected.length === 0) return;

    let summary = `### Personal Inbox AI Triage Summary (${selected.length} threads)\n\n`;
    summary += `| Priority | Category | Action | Sender | Subject | Confidence |\n`;
    summary += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    selected.forEach((t) => {
      summary += `| P${t.priority} | ${t.category} | ${t.actionRequired} | ${t.fromName} | ${t.subject} | ${Math.round((t.jevConfidence || 0.95) * 100)}% |\n`;
    });

    navigator.clipboard.writeText(summary).then(() => {
      showToast('Copied Markdown table summary of selected threads', 'success');
    });
  }

  // --- SLIDE-OVER DETAIL DRAWER & 4 TAB SECTIONS ---
  function openDrawer(id) {
    const thread = state.threads.find((t) => t.id === id);
    if (!thread) return;

    state.activeThread = thread;
    if (!thread.isRead) {
      thread.isRead = true;
      renderTable();
      renderSidebarStats();
      persistThreads();
    }

    // Populate Drawer Header
    setText('drawer-subject', thread.subject);
    setText('drawer-sender', `${thread.fromName} <${thread.fromEmail}>`);
    setText('drawer-date', formatDate(thread.date, true));
    setText('drawer-category-badge', (thread.category || 'work').toUpperCase());
    setText('drawer-priority-badge', `P${thread.priority} ${getPriorityLabel(thread.priority)}`);
    setText('drawer-action-badge', (thread.actionRequired || 'NONE').toUpperCase());
    setText('drawer-lang-badge', (thread.lang || 'en').toUpperCase());
    setText('drawer-confidence', `${Math.round((thread.jevConfidence || 0.95) * 100)}% Confidence`);
    setText('drawer-why', thread.jevWhy || 'Evaluated via System One Jev model triage rules.');

    const avatar = document.getElementById('drawer-avatar');
    if (avatar) avatar.textContent = (thread.fromName || 'U').charAt(0).toUpperCase();

    // Security Badges
    const shieldBadge = document.getElementById('drawer-sensitive-badge');
    if (shieldBadge) {
      if (thread.sensitive || thread.autoArchiveBlocked) {
        shieldBadge.classList.remove('hidden');
        shieldBadge.classList.add('inline-flex');
      } else {
        shieldBadge.classList.add('hidden');
        shieldBadge.classList.remove('inline-flex');
      }
    }

    const phishBadge = document.getElementById('drawer-phish-badge');
    if (phishBadge) {
      if (thread.suspicious) {
        phishBadge.classList.remove('hidden');
        phishBadge.classList.add('inline-flex');
      } else {
        phishBadge.classList.add('hidden');
        phishBadge.classList.remove('inline-flex');
      }
    }

    // Populate Tab 1: Primary Output & Body
    const bodyEl = document.getElementById('drawer-body-container');
    if (bodyEl) {
      bodyEl.textContent = thread.body;
      if (thread.lang === 'fa') {
        bodyEl.setAttribute('dir', 'rtl');
        bodyEl.classList.add('font-persian');
      } else {
        bodyEl.removeAttribute('dir');
        bodyEl.classList.remove('font-persian');
      }
    }

    // Extracted Fields Card
    const extractedCard = document.getElementById('drawer-extracted-card');
    const extractedFields = document.getElementById('drawer-extracted-fields');
    if (thread.extractedFields && Object.keys(thread.extractedFields).length > 0) {
      extractedCard?.classList.remove('hidden');
      let fieldsHtml = '';
      for (const [key, val] of Object.entries(thread.extractedFields)) {
        fieldsHtml += `
          <div class="p-2.5 rounded-xl border bg-[var(--bg-app)] border-[var(--border-app)]">
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">${key}</span>
            <span class="font-bold font-mono text-xs text-[var(--text-main)] truncate block mt-0.5">${escapeHtml(val)}</span>
          </div>
        `;
      }
      if (extractedFields) extractedFields.innerHTML = fieldsHtml;
    } else {
      extractedCard?.classList.add('hidden');
    }

    // Populate Tab 2: Execution / Audit Timeline
    const timelineContainer = document.getElementById('drawer-timeline');
    if (timelineContainer) {
      const items = thread.timeline || [
        { time: '10:00 AM', event: 'Inbound RFC 2822 stream parsed', actor: 'Hermes IMAP' },
        { time: '10:00 AM', event: `Evaluated via Jev 1.13 AI (Confidence: ${Math.round((thread.jevConfidence || 0.95) * 100)}%)`, actor: 'Jev System One' },
        { time: '10:01 AM', event: 'Invariant 6 security shields validated: PASSED', actor: 'Deterministic Envelope' },
        { time: '10:01 AM', event: 'Local SQLite WAL commit verified', actor: 'Storage Engine' },
      ];

      let tlHtml = '';
      items.forEach((item) => {
        tlHtml += `
          <div class="relative pl-2 space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] text-stone-400 font-bold">${item.time}</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">[${escapeHtml(item.actor)}]</span>
            </div>
            <div class="text-[12px] font-medium text-[var(--text-main)]">${escapeHtml(item.event)}</div>
          </div>
        `;
      });
      timelineContainer.innerHTML = tlHtml;
    }

    // Populate Tab 3: Verification & Compliance Quality Gates (Invariant 1 through 6)
    const gatesContainer = document.getElementById('drawer-gates-list');
    if (gatesContainer) {
      const gates = [
        {
          name: 'Invariant 1: Deterministic Safety Bypass',
          status: thread.category === 'security' || thread.extractedFields?.otpCode ? 'ENFORCED (P3 LOCKED)' : 'PASSED',
          desc: '2FA OTP verification codes, wire transfer requests, and password resets bypass AI and are locked to Inbox P3 with auto-archive permanently blocked.',
          statusClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
        },
        {
          name: 'Invariant 2: Zero-Send Guarantee',
          status: 'ENFORCED',
          desc: 'Personal Inbox AI never sends an email autonomously. Outbound dispatch strictly requires affirmative human review and click.',
          statusClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
        },
        {
          name: 'Invariant 3: Prompt Injection Neutralization',
          status: thread.suspicious ? 'TRAPPED (QUARANTINED)' : 'PASSED (0 ADVERSARIAL PATTERNS)',
          desc: 'Adversarial jailbreaks and prompt injection patterns in email bodies are trapped in Suspicious review quarantine.',
          statusClass: thread.suspicious ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
        },
        {
          name: 'Invariant 4: Local Storage Sovereignty',
          status: 'COMPLIANT (LOCAL WAL)',
          desc: 'SQLite database (data/inbox.db) never sends raw email contents or credentials to any cloud database. Zero third-party storage leakage.',
          statusClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
        },
        {
          name: 'Invariant 5: 10-Second Undo Shield',
          status: 'STANDBY (10S BUFFER)',
          desc: 'Any archiving, classification, or outgoing reply action can be reverted immediately with a 10-second recall window.',
          statusClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
        },
        {
          name: 'Invariant 6: Unsubscribe Header & RFC Compliance',
          status: thread.category === 'newsletters' ? 'DETECTED (RFC 2369)' : 'N/A (TRANSACTIONAL/PERSONAL)',
          desc: 'Newsletters with List-Unsubscribe headers are batched for 1-click sweeping without credential leakage.',
          statusClass: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200',
        },
      ];

      let gatesHtml = '';
      gates.forEach((gate) => {
        gatesHtml += `
          <div class="p-3 rounded-xl border bg-[var(--bg-app)] border-[var(--border-app)] space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-[var(--text-main)]">${gate.name}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${gate.statusClass}">${gate.status}</span>
            </div>
            <p class="text-[11px] text-stone-500 leading-relaxed">${gate.desc}</p>
          </div>
        `;
      });
      gatesContainer.innerHTML = gatesHtml;
    }

    // Populate Tab 4: Technical Metadata & Headers
    const metaContainer = document.getElementById('drawer-meta-content');
    if (metaContainer) {
      metaContainer.innerHTML = `
        <div class="p-2.5 rounded-xl border bg-[var(--bg-app)] border-[var(--border-app)] space-y-1">
          <div><span class="text-stone-400">Message-ID:</span> &lt;${thread.id.toLowerCase()}.${Date.now()}@inbox.local&gt;</div>
          <div><span class="text-stone-400">RFC 2822 MIME:</span> multipart/alternative; boundary="----_boundary_${thread.id}"</div>
          <div><span class="text-stone-400">Inbound Socket:</span> imaps://imap.gmail.com:993 (SSL/TLS v1.3)</div>
          <div><span class="text-stone-400">SPF / DKIM Check:</span> <span class="text-emerald-500 font-bold">PASS</span> (d=${thread.fromDomain || 'verified'})</div>
          <div><span class="text-stone-400">Inference Gateway:</span> 9Router Local (:20128) / oc/jev-1.13-free</div>
          <div><span class="text-stone-400">Inference Latency:</span> 168 ms | Tokens: 382 prompt, 48 completion</div>
          <div><span class="text-stone-400">SQLite Transaction:</span> 0.82 ms (PRAGMA journal_mode=WAL)</div>
        </div>
      `;
    }

    // Clear reply textarea
    const replyText = document.getElementById('drawer-reply-text');
    if (replyText) {
      replyText.value = '';
      if (thread.lang === 'fa') {
        replyText.setAttribute('dir', 'rtl');
        replyText.classList.add('font-persian');
      } else {
        replyText.removeAttribute('dir');
        replyText.classList.remove('font-persian');
      }
    }

    updateDrawerStarButton();
    updateDrawerReadButton();

    // Default to Tab 1
    setDrawerTab('preview');

    // Show Drawer
    const backdrop = document.getElementById('detail-drawer-backdrop');
    const drawer = document.getElementById('detail-drawer');
    backdrop?.classList.remove('opacity-0', 'pointer-events-none');
    backdrop?.classList.add('opacity-100');
    drawer?.classList.remove('translate-x-full');
    drawer?.classList.add('translate-x-0');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function setDrawerTab(tab) {
    state.activeDrawerTab = tab;
    document.querySelectorAll('.drawer-tab-btn[data-tab]').forEach((btn) => {
      const t = btn.getAttribute('data-tab');
      if (t === tab) {
        btn.className = 'drawer-tab-btn px-3 py-2 text-xs font-bold border-b-2 border-orange-500 text-orange-600 dark:text-orange-400';
      } else {
        btn.className = 'drawer-tab-btn px-3 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 border-b-2 border-transparent';
      }
    });

    ['preview', 'timeline', 'gates', 'meta'].forEach((t) => {
      const el = document.getElementById(`tab-content-${t}`);
      if (el) {
        if (t === tab) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });
  }

  function closeDrawer() {
    const backdrop = document.getElementById('detail-drawer-backdrop');
    const drawer = document.getElementById('detail-drawer');
    backdrop?.classList.add('opacity-0', 'pointer-events-none');
    backdrop?.classList.remove('opacity-100');
    drawer?.classList.add('translate-x-full');
    drawer?.classList.remove('translate-x-0');
    state.activeThread = null;
  }

  function updateDrawerStarButton() {
    const btn = document.getElementById('drawer-star-btn');
    if (!btn || !state.activeThread) return;
    btn.innerHTML = `<i data-lucide="star" class="w-4 h-4 ${state.activeThread.isStarred ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}"></i>`;
    if (window.lucide) window.lucide.createIcons();
  }

  function updateDrawerReadButton() {
    const btn = document.getElementById('drawer-toggle-read');
    if (!btn || !state.activeThread) return;
    btn.textContent = state.activeThread.isRead ? 'Mark Unread' : 'Mark Read';
  }

  // --- CONTEXTUAL AI REPLY ASSISTANT ---
  function handleReplyIntent(intent) {
    if (!state.activeThread) return;
    const isPersian = state.activeThread.lang === 'fa';
    const replyText = document.getElementById('drawer-reply-text');
    if (!replyText) return;

    let draft = '';
    const firstName = state.activeThread.fromName.split(' ')[0];

    switch (intent) {
      case 'agree':
        draft = isPersian
          ? `سلام و احترام جناب ${state.activeThread.fromName}،\n\nموارد و مشخصات مطرح‌شده در ایمیل به دقت بررسی گردید و مورد تایید است. لطفاً اقدامات بعدی را بر اساس همین توافق پیگیری فرمایید.\n\nبا تشکر و احترام،\nتیم مهندسی`
          : `Hi ${firstName},\n\nThanks for following up on this. I've reviewed the proposal and everything looks great. You have my full approval to proceed!\n\nBest regards,\nAlex`;
        break;
      case 'decline':
        draft = isPersian
          ? `سلام و احترام،\n\nضمن سپاس از ارسال جزئیات، متاسفانه در حال حاضر به دلیل اولویت‌بندی کارهای جاری امکان پذیرش یا پیشبرد این مورد مقدور نمی‌باشد.\n\nبا احترام و تشکر`
          : `Hi ${firstName},\n\nThank you for reaching out. Unfortunately, we won't be able to accommodate this request at this time due to competing project priorities.\n\nBest regards,\nAlex`;
        break;
      case 'info':
        draft = isPersian
          ? `سلام و احترام،\n\nپیش‌نویس اولیه بررسی شد. لطفاً در خصوص زمان‌بندی تحویل، پیش‌نیازهای فنی و هزینه‌های احتمالی توضیحات تکمیلی را ارسال فرمایید.\n\nبا تشکر`
          : `Hi ${firstName},\n\nThanks for the update. Could you please provide additional details regarding the deployment timeline and any technical dependencies before we finalize?\n\nBest,\nAlex`;
        break;
      case 'polish':
        draft = isPersian
          ? `با سلام و تحیات،\n\nعطف به مکاتبات پیشین، به استحضار می‌رساند کلیه بندهای اعلامی مورد ارزیابی تخصصی قرار گرفت و هماهنگی‌های لازم جهت اجرا در جریان است.\n\nبا احترام`
          : `Dear ${firstName},\n\nThank you for the comprehensive brief. The technical architecture specifications have been vetted, and our team is aligned on the execution roadmap.\n\nWarm regards,\nAlex`;
        break;
    }

    replyText.value = draft;
    showToast(`Generated smart response for '${intent}'`, 'info');
  }

  function generateAiDraft() {
    if (!state.activeThread) return;
    const replyText = document.getElementById('drawer-reply-text');
    const statusText = document.getElementById('reply-status-text');

    if (statusText) statusText.textContent = 'Generating via Jev 1.13 System One AI…';

    setTimeout(() => {
      const isPersian = state.activeThread.lang === 'fa';
      const firstName = state.activeThread.fromName.split(' ')[0];
      const aiResponse = isPersian
        ? `سلام و احترام جناب ${state.activeThread.fromName}،\n\nموضوع "${state.activeThread.subject}" به دقت بررسی شد. شرایط فنی و جزئیات تایید می‌گردد و فرآیند بدون وقفه پیگیری خواهد شد.\n\nبا احترام،\nتیم پشتیبانی و توسعه`
        : `Hi ${firstName},\n\nThank you for sharing the specifications regarding "${state.activeThread.subject}". I've reviewed the details and agree with the proposed approach. Let's sync on the next steps during our architecture review.\n\nBest,\nAlex`;

      if (replyText) replyText.value = aiResponse;
      if (statusText) statusText.textContent = 'Calibrated AI Draft (96.8% precision match)';
      showToast('Generated calibrated AI reply draft', 'success');
    }, 450);
  }

  function triggerSendReplyWithUndo() {
    if (!state.activeThread) return;
    const replyText = document.getElementById('drawer-reply-text');
    if (!replyText || !replyText.value.trim()) {
      showToast('Please draft a reply before sending', 'warning');
      return;
    }

    const recipient = state.activeThread.fromEmail;
    closeDrawer();

    // Invariant 5: 10-Second Undo Shield
    state.undoSecondsRemaining = 10;
    state.undoActionPending = { recipient };

    const banner = document.getElementById('undo-banner');
    const secondsEl = document.getElementById('undo-seconds');
    if (banner) {
      banner.classList.remove('hidden');
      banner.classList.add('flex');
    }
    if (secondsEl) secondsEl.textContent = state.undoSecondsRemaining;

    if (state.undoTimer) clearInterval(state.undoTimer);
    state.undoTimer = setInterval(() => {
      state.undoSecondsRemaining -= 1;
      if (secondsEl) secondsEl.textContent = state.undoSecondsRemaining;

      if (state.undoSecondsRemaining <= 0) {
        clearInterval(state.undoTimer);
        state.undoTimer = null;
        state.undoActionPending = null;
        if (banner) {
          banner.classList.add('hidden');
          banner.classList.remove('flex');
        }
        showToast(`Reply sent successfully to ${recipient} via Hermes SMTP`, 'success');
        addTerminalLog(`[hermes-smtp] Message dispatched to ${recipient}: status=250 OK (RFC 2821 stream completed)`);
      }
    }, 1000);
  }

  function cancelUndoSend() {
    if (state.undoTimer) {
      clearInterval(state.undoTimer);
      state.undoTimer = null;
    }
    state.undoActionPending = null;
    const banner = document.getElementById('undo-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }
    showToast('Reply delivery cancelled and reverted to draft (Invariant 5)', 'warning');
    addTerminalLog(`[invariant-5] Undo shield invoked by user: outbound message suppressed`);
  }

  // --- STEPPED BACKEND / ML PIPELINE SIMULATOR ---
  function openPipelineModal() {
    const backdrop = document.getElementById('pipeline-modal-backdrop');
    const modal = document.getElementById('pipeline-modal');
    backdrop?.classList.remove('opacity-0', 'pointer-events-none');
    backdrop?.classList.add('opacity-100');
    modal?.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
    modal?.classList.add('scale-100', 'opacity-100');
    if (modal) modal.style.display = 'flex';

    runSteppedPipelineSimulation();
  }

  function closePipelineModal() {
    const backdrop = document.getElementById('pipeline-modal-backdrop');
    const modal = document.getElementById('pipeline-modal');
    backdrop?.classList.add('opacity-0', 'pointer-events-none');
    backdrop?.classList.remove('opacity-100');
    modal?.classList.add('scale-95', 'opacity-0', 'pointer-events-none');
    modal?.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      if (modal) modal.style.display = 'none';
    }, 300);
  }

  function runSteppedPipelineSimulation() {
    const bar = document.getElementById('pipeline-bar');
    const percentEl = document.getElementById('pipeline-progress-percent');
    const stageTitle = document.getElementById('pipeline-stage-title');
    const logStream = document.getElementById('pipeline-log-stream');
    const rerunBtn = document.getElementById('btn-pipeline-rerun');

    if (rerunBtn) rerunBtn.disabled = true;
    if (logStream) logStream.innerHTML = '';

    const stages = [
      {
        pct: 20,
        card: 'stage-card-1',
        title: 'Stage 1: Hermes IMAP Ingestion (RFC 2822 Stream Parsing)',
        log: '[hermes-imap] Connecting to SSL :993 socket… RFC 2822 stream parsed (36 threads hydrated)',
      },
      {
        pct: 45,
        card: 'stage-card-2',
        title: 'Stage 2: Invariant 6 Deterministic Safety Envelope',
        log: '[invariant-6] Evaluating OTP regex, wire threshold ($84.5k), prompt injection heuristics: 100% PASS',
      },
      {
        pct: 70,
        card: 'stage-card-3',
        title: 'Stage 3: Jev 1.13 AI Inference (System One Classification)',
        log: '[jev-1.13] 9Router local gateway dispatch: 36 inferences executed in 168ms median (96.8% accuracy)',
      },
      {
        pct: 90,
        card: 'stage-card-4',
        title: 'Stage 4: Fact Extraction (Entities, IBAN & Tracking Codes)',
        log: '[extractor] Extracted 14 Iranian IBANs, 8 OTP tokens, 12 tracking numbers without cloud exfiltration',
      },
      {
        pct: 100,
        card: 'stage-card-5',
        title: 'Stage 5: SQLite WAL Commit & Memory Latch',
        log: '[sqlite-wal] BEGIN TRANSACTION; 36 records committed in 0.82ms. PRAGMA wal_checkpoint(PASSIVE)',
      },
    ];

    let currentStep = 0;

    function step() {
      if (currentStep >= stages.length) {
        if (stageTitle) stageTitle.textContent = 'Pipeline Execution Complete (100% Policy Compliant)';
        if (rerunBtn) rerunBtn.disabled = false;
        showToast('Autonomous pipeline simulation completed successfully', 'success');
        addTerminalLog('[pipeline-simulator] Full 5-stage pipeline executed with 0 policy violations');
        return;
      }

      const s = stages[currentStep];
      if (bar) bar.style.width = `${s.pct}%`;
      if (percentEl) percentEl.textContent = `${s.pct}%`;
      if (stageTitle) stageTitle.textContent = s.title;

      // Highlight stage card
      for (let i = 1; i <= 5; i++) {
        const card = document.getElementById(`stage-card-${i}`);
        if (card) {
          if (i === currentStep + 1) {
            card.className = 'p-3 rounded-xl border bg-orange-500/10 dark:bg-orange-950/40 border-orange-500/40 space-y-1 opacity-100 transition shadow-xs';
          } else if (i < currentStep + 1) {
            card.className = 'p-3 rounded-xl border bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/40 space-y-1 opacity-100 transition';
          } else {
            card.className = 'p-3 rounded-xl border bg-[var(--bg-surface)] border-[var(--border-app)] space-y-1 opacity-40 transition';
          }
        }
      }

      if (logStream) {
        const time = new Date().toISOString().split('T')[1].slice(0, 8);
        logStream.insertAdjacentHTML('beforeend', `<div><span class="text-gray-500">[${time}]</span> ${escapeHtml(s.log)}</div>`);
        logStream.scrollTop = logStream.scrollHeight;
      }

      currentStep++;
      setTimeout(step, 240);
    }

    step();
  }

  // --- LIVE TERMINAL LOG STREAMING SIMULATOR ---
  const MOCK_TERMINAL_EVENTS = [
    { tag: 'sync-daemon', msg: 'IMAP socket SSL check: mailbox STATUS INBOX (MESSAGES 142 UNSEEN 18 UIDNEXT 4920)' },
    { tag: 'hydrator', msg: 'RFC 2822 parsing threadId=TH-2026-001 headers=14 mime=multipart/alternative lang=en' },
    { tag: 'hydrator', msg: 'RFC 2822 parsing threadId=TH-2026-002 headers=16 mime=multipart/mixed lang=fa (RTL detected)' },
    { tag: 'invariant-6', msg: 'Evaluating deterministic shields: OTP_CHECK=PASS, WIRE_CHECK=PASS, PHISH_CHECK=PASS' },
    { tag: 'invariant-6', msg: 'Invariant 1 triggered: Banking wire threshold ($84.5k) detected -> Auto-archive permanently blocked' },
    { tag: 'jev-triage', msg: 'Model: oc/jev-1.13-free | Prompt: 382 tokens | Latency: 168ms | Category: work (conf: 0.96)' },
    { tag: 'jev-triage', msg: 'Model: oc/jev-1.13-free | Prompt: 412 tokens | Latency: 174ms | Category: money (conf: 0.98)' },
    { tag: 'sqlite-wal', msg: 'BEGIN TRANSACTION; UPDATE threads SET jev_confidence=0.96 WHERE id="TH-2026-001"; COMMIT;' },
    { tag: 'sqlite-wal', msg: 'PRAGMA wal_checkpoint(PASSIVE); Checkpointed 16 frames to disk. (WAL size: 1.2MB)' },
    { tag: 'hermes-smtp', msg: 'Connection pool healthy: 2 idle SMTP sockets ready for sub-second outbound dispatch' },
    { tag: 'invariant-6', msg: 'Invariant 2 enforced: Zero autonomous email sends verified (human review required)' },
  ];

  function startTerminalSimulation() {
    // Initial batch of logs
    for (let i = 0; i < 8; i++) {
      const item = MOCK_TERMINAL_EVENTS[i % MOCK_TERMINAL_EVENTS.length];
      addTerminalLog(`[${item.tag}] ${item.msg}`);
    }
    restartTerminalTimer();
  }

  function restartTerminalTimer() {
    if (state.terminalTimer) clearInterval(state.terminalTimer);
    const interval = Math.max(400, Math.round(2600 / state.terminalSpeed));
    state.terminalTimer = setInterval(() => {
      if (!state.terminalStreaming) return;
      const item = MOCK_TERMINAL_EVENTS[Math.floor(Math.random() * MOCK_TERMINAL_EVENTS.length)];
      addTerminalLog(`[${item.tag}] ${item.msg}`);
    }, interval);
  }

  function addTerminalLog(rawText) {
    const time = new Date().toISOString().split('T')[1].slice(0, 8);
    const logObj = { time, text: rawText };
    state.terminalLogs.push(logObj);
    if (state.terminalLogs.length > 200) {
      state.terminalLogs.shift();
    }
    renderTerminalOutput();
  }

  function renderTerminalOutput() {
    const output = document.getElementById('terminal-output');
    if (!output) return;

    let filtered = state.terminalLogs;
    if (state.terminalTagFilter !== 'all') {
      filtered = filtered.filter((l) => l.text.toLowerCase().includes(`[${state.terminalTagFilter.toLowerCase()}]`));
    }

    let html = '';
    filtered.forEach((l) => {
      html += `<div class="leading-relaxed hover:bg-gray-900/60 px-1 rounded"><span class="text-gray-500 font-mono">[${l.time}]</span> <span class="text-gray-200">${escapeHtml(l.text)}</span></div>`;
    });

    output.innerHTML = html;
    output.scrollTop = output.scrollHeight;
  }

  function toggleTerminalStreaming() {
    state.terminalStreaming = !state.terminalStreaming;
    const btn = document.getElementById('btn-toggle-terminal-stream');
    if (btn) {
      btn.textContent = state.terminalStreaming ? 'Pause Stream' : 'Resume Stream';
    }
    showToast(state.terminalStreaming ? 'Terminal log streaming resumed' : 'Terminal stream paused', 'info');
  }

  function clearTerminal() {
    state.terminalLogs = [];
    renderTerminalOutput();
    showToast('Terminal logs cleared', 'info');
  }

  function copyTerminalLogs() {
    const raw = state.terminalLogs.map((l) => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(raw).then(() => {
      showToast('Terminal logs copied to clipboard', 'success');
    });
  }

  function openTerminalModal() {
    const backdrop = document.getElementById('terminal-modal-backdrop');
    const modal = document.getElementById('terminal-modal');
    backdrop?.classList.remove('opacity-0', 'pointer-events-none');
    backdrop?.classList.add('opacity-100');
    modal?.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
    modal?.classList.add('scale-100', 'opacity-100');
    if (modal) modal.style.display = 'flex';
    renderTerminalOutput();
  }

  function closeTerminalModal() {
    const backdrop = document.getElementById('terminal-modal-backdrop');
    const modal = document.getElementById('terminal-modal');
    backdrop?.classList.add('opacity-0', 'pointer-events-none');
    backdrop?.classList.remove('opacity-100');
    modal?.classList.add('scale-95', 'opacity-0', 'pointer-events-none');
    modal?.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      if (modal) modal.style.display = 'none';
    }, 300);
  }

  // --- SYSTEM ARCHITECTURE MODAL ---
  function openArchModal() {
    const backdrop = document.getElementById('arch-modal-backdrop');
    const modal = document.getElementById('arch-modal');
    backdrop?.classList.remove('opacity-0', 'pointer-events-none');
    backdrop?.classList.add('opacity-100');
    modal?.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
    modal?.classList.add('scale-100', 'opacity-100');
    if (modal) modal.style.display = 'flex';
  }

  function closeArchModal() {
    const backdrop = document.getElementById('arch-modal-backdrop');
    const modal = document.getElementById('arch-modal');
    backdrop?.classList.add('opacity-0', 'pointer-events-none');
    backdrop?.classList.remove('opacity-100');
    modal?.classList.add('scale-95', 'opacity-0', 'pointer-events-none');
    modal?.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      if (modal) modal.style.display = 'none';
    }, 300);
  }

  // --- HERMES SYNC TRIGGER SIMULATION ---
  function simulateHermesSync() {
    const icon = document.getElementById('sync-icon');
    if (icon) icon.classList.add('animate-spin');

    showToast('Connecting to Hermes IMAP SSL socket…', 'info');
    addTerminalLog('[sync-daemon] Manual sync initiated: querying RFC 2822 UIDNEXT on imaps://imap.gmail.com:993');

    setTimeout(() => {
      if (icon) icon.classList.remove('animate-spin');
      showToast('Mailbox sync complete: all 36 threads up to date', 'success');
      addTerminalLog('[sync-daemon] Mailbox in sync. 0 new RFC 2822 messages. SQLite WAL checkpoint verified.');
    }, 900);
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const typeStyles = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-600 text-white',
      info: 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900',
    };

    toast.className = `px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl border border-white/10 flex items-center gap-2 pointer-events-auto transform transition-all duration-300 translate-x-12 opacity-0 ${typeStyles[type] || typeStyles.info}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-x-12', 'opacity-0');
      toast.classList.add('translate-x-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
      toast.classList.add('translate-x-12', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- SUPERHUMAN-STYLE KEYBOARD WORKFLOWS ---
  function handleGlobalKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'escape':
        closeDrawer();
        closePipelineModal();
        closeArchModal();
        closeTerminalModal();
        if (state.selectedIds.size > 0) {
          state.selectedIds.clear();
          renderTable();
          renderBatchDock();
        }
        break;

      case 't':
        cycleTheme();
        break;

      case 'j': {
        const rows = document.querySelectorAll('#thread-table-body tr[data-thread-id]');
        if (rows.length === 0) return;
        state.focusedIndex = Math.min(rows.length - 1, state.focusedIndex + 1);
        rows[state.focusedIndex]?.scrollIntoView({ block: 'nearest' });
        rows[state.focusedIndex]?.classList.add('ring-2', 'ring-orange-500');
        setTimeout(() => rows[state.focusedIndex]?.classList.remove('ring-2', 'ring-orange-500'), 400);
        break;
      }

      case 'k': {
        const rows = document.querySelectorAll('#thread-table-body tr[data-thread-id]');
        if (rows.length === 0) return;
        state.focusedIndex = Math.max(0, state.focusedIndex - 1);
        rows[state.focusedIndex]?.scrollIntoView({ block: 'nearest' });
        rows[state.focusedIndex]?.classList.add('ring-2', 'ring-orange-500');
        setTimeout(() => rows[state.focusedIndex]?.classList.remove('ring-2', 'ring-orange-500'), 400);
        break;
      }

      case 'enter':
      case 'o': {
        const rows = document.querySelectorAll('#thread-table-body tr[data-thread-id]');
        const focused = rows[state.focusedIndex];
        if (focused) {
          const id = focused.getAttribute('data-thread-id');
          openDrawer(id);
        }
        break;
      }

      case 'e': {
        if (state.activeThread) {
          toggleArchive(state.activeThread.id);
          closeDrawer();
        } else if (state.selectedIds.size > 0) {
          batchUpdate({ inInbox: false });
        }
        break;
      }

      case 's': {
        if (state.activeThread) {
          toggleStar(state.activeThread.id);
        } else if (state.selectedIds.size > 0) {
          batchToggleStar();
        }
        break;
      }

      case 'r': {
        if (state.activeThread) {
          setDrawerTab('preview');
          document.getElementById('drawer-reply-text')?.focus();
        }
        break;
      }

      case '/': {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
        break;
      }
    }
  }

  // --- HELPERS ---
  function formatDate(isoString, includeTime = false) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const day = d.getDate();

      if (!includeTime) {
        return `${month} ${day}`;
      }

      const hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;
      return `${month} ${day}, ${d.getFullYear()} at ${formattedHour}:${minutes} ${ampm}`;
    } catch (e) {
      return isoString;
    }
  }

  function getPriorityLabel(priority) {
    switch (priority) {
      case 3:
        return 'URGENT';
      case 2:
        return 'HIGH';
      case 1:
        return 'NORMAL';
      default:
        return 'LOW';
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initData);
  } else {
    initData();
  }
})();
