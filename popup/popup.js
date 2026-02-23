// =============================================
// Wiki Swapper — Popup UI
// =============================================

class Popup {
    constructor() {
        this.toggleContainer = document.getElementById('toggleContainer');
        this.autoToggle = document.getElementById('autoToggle');
        this.swapBtn = document.getElementById('swapNowBtn');
        this.init();
    }

    async init() {
        const settings = await chrome.storage.sync.get(['preferred', 'autoSwap']);
        this.currentPreferred = settings.preferred || 'grokipedia';
        this.autoToggle.checked = settings.autoSwap !== false;

        this.renderToggle();
        this.bindEvents();
    }

    renderToggle() {
        const wikis = [
            { id: 'wikipedia', name: 'Wikipedia', emoji: '🌐' },
            { id: 'grokipedia', name: 'Grokipedia', emoji: '🚀' }
        ];

        this.toggleContainer.innerHTML = wikis.map(wiki => `
            <div class="toggle-option ${this.currentPreferred === wiki.id ? 'selected' : ''}" data-id="${wiki.id}">
              ${wiki.emoji} ${wiki.name}
            </div>
        `).join('');

        // Add event listeners to prevent CSP issues
        this.toggleContainer.querySelectorAll('.toggle-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.select(option.dataset.id);
            });
        });
    }

    async select(preferred) {
        this.currentPreferred = preferred;
        await chrome.storage.sync.set({ preferred });
        this.renderToggle();
    }

    bindEvents() {
        this.autoToggle.addEventListener('change', async () => {
            await chrome.storage.sync.set({ autoSwap: this.autoToggle.checked });
        });

        this.swapBtn.addEventListener('click', async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.url) return;

            const url = new URL(tab.url);
            let newUrl = null;

            if (url.hostname.endsWith('wikipedia.org')) {
                const title = url.pathname.slice(6);
                newUrl = `https://grokipedia.com/page/${title}${url.search}${url.hash}`;
            } else if (url.hostname.includes('grokipedia.com')) {
                const title = url.pathname.slice(6);
                newUrl = `https://en.wikipedia.org/wiki/${title}${url.search}${url.hash}`;
            }

            if (newUrl) chrome.tabs.update(tab.id, { url: newUrl });
        });
    }
}

// Make it globally accessible for the inline onclick
window.popup = new Popup();