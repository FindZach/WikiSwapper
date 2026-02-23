// =============================================
// Wiki Swapper — Background Service Worker
// OOP architecture
// =============================================

class SettingsManager {
    static async get() {
        const data = await chrome.storage.sync.get(['preferred', 'autoSwap']);
        return {
            preferred: data.preferred || 'grokipedia',   // default = Grokipedia
            autoSwap: data.autoSwap !== false            // default = true
        };
    }

    static async save(preferred, autoSwap) {
        await chrome.storage.sync.set({ preferred, autoSwap });
    }
}

class UrlMapper {
    static isWikipedia(url) {
        return url.hostname.endsWith('wikipedia.org');
    }

    static isGrokipedia(url) {
        return url.hostname === 'grokipedia.com' || url.hostname === 'www.grokipedia.com';
    }

    static extractTitle(url) {
        let title = null;
        if (this.isWikipedia(url) && url.pathname.startsWith('/wiki/')) {
            title = url.pathname.slice(6);
        } else if (this.isGrokipedia(url) && url.pathname.startsWith('/page/')) {
            title = url.pathname.slice(6);
        }
        return title;
    }

    static toWikipedia(title, originalUrl) {
        const newUrl = new URL('https://en.wikipedia.org/wiki/' + title);
        newUrl.search = originalUrl.search;
        newUrl.hash = originalUrl.hash;
        return newUrl.toString();
    }

    static toGrokipedia(title, originalUrl) {
        const newUrl = new URL('https://grokipedia.com/page/' + title);
        newUrl.search = originalUrl.search;
        newUrl.hash = originalUrl.hash;
        return newUrl.toString();
    }
}

class WikiRedirector {
    async handleNavigation(details) {
        const settings = await SettingsManager.get();
        if (!settings.autoSwap) return;

        const url = new URL(details.url);
        const title = UrlMapper.extractTitle(url);

        if (!title) return; // not a wiki article page

        let targetUrl = null;

        if (UrlMapper.isWikipedia(url) && settings.preferred === 'grokipedia') {
            targetUrl = UrlMapper.toGrokipedia(title, url);
        } else if (UrlMapper.isGrokipedia(url) && settings.preferred === 'wikipedia') {
            targetUrl = UrlMapper.toWikipedia(title, url);
        }

        if (targetUrl && targetUrl !== details.url) {
            chrome.tabs.update(details.tabId, { url: targetUrl });
        }
    }
}

// ====================== LISTENER ======================
const redirector = new WikiRedirector();

chrome.webNavigation.onBeforeNavigate.addListener(
    (details) => redirector.handleNavigation(details),
    { url: [{ hostContains: 'wikipedia.org' }, { hostContains: 'grokipedia.com' }] }
);