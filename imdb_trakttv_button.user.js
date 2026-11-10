// ==UserScript==
// @name         IMDb - Trakt.tv & Letterboxd Buttons
// @namespace    https://github.com/SecretUnicorn/
// @downloadURL  https://github.com/SecretUnicorn/IMDB-Chart-Trakt.tv-Button/raw/master/imdb_trakttv_button.user.js
// @updateURL    https://github.com/SecretUnicorn/IMDB-Chart-Trakt.tv-Button/raw/master/imdb_trakttv_button.user.js
// @version      2.0
// @description  Adds Trakt.tv and Letterboxd chips below the genre chips on IMDb title pages
// @author       LenAnderson, SecretUnicorn
// @match        https://www.imdb.com/title/tt*
// @match        https://www.imdb.com/*/title/tt*
// @match        https://m.imdb.com/title/tt*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const ROW_ID = 'tm-ext-links';

    const ICONS = {
        trakt: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#ED1C24"/>
            <circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" stroke-width="2"/>
            <path d="M9.2 12.2l2 2 3.8-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        letterboxd: `<svg viewBox="0 0 30 16" width="26" height="14" aria-hidden="true">
            <circle cx="6" cy="8" r="6" fill="#FF8000"/>
            <circle cx="15" cy="8" r="6" fill="#00E054" fill-opacity=".9"/>
            <circle cx="24" cy="8" r="6" fill="#40BCF4" fill-opacity=".9"/>
        </svg>`,
        tmdb: `<svg viewBox="0 0 24 16" width="22" height="15" aria-hidden="true">
            <defs><linearGradient id="tm-tmdb-g" x1="0" x2="1"><stop offset="0" stop-color="#90CEA1"/><stop offset="1" stop-color="#01B4E4"/></linearGradient></defs>
            <rect x="0" y="0" width="24" height="16" rx="4" fill="url(#tm-tmdb-g)"/>
            <text x="12" y="11.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="#0D253F">TMDB</text>
        </svg>`,
        justwatch: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <rect width="24" height="24" rx="5" fill="#FBC500"/>
            <path d="M9 7l8 5-8 5z" fill="#1C252F"/>
        </svg>`,
        werstreamt: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M3 3h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H11l-5 4v-4H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#F5C518"/>
            <text x="12" y="14" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#222">?</text>
        </svg>`,
        wikipedia: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#fff"/>
            <text x="12" y="16.5" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="13" fill="#000">W</text>
        </svg>`,
    };

    const CSS = `
        #${ROW_ID} {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 8px 0 12px;
        }
        #${ROW_ID} .tm-ext-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            height: 32px;
            padding: 0 14px 0 10px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.38);
            background: transparent;
            color: rgba(255, 255, 255, 0.92);
            font: 500 14px/1 Roboto, Helvetica, Arial, sans-serif;
            letter-spacing: 0.0179em;
            text-decoration: none;
            white-space: nowrap;
            transition: background-color .15s, border-color .15s;
        }
        #${ROW_ID} .tm-ext-chip:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.6);
        }
        #${ROW_ID} .tm-ext-chip:focus-visible {
            outline: 2px solid #f5c518;
            outline-offset: 2px;
        }
        #${ROW_ID} .tm-ext-chip svg { flex: none; display: block; }
    `;

    const getId = () => (location.pathname.match(/\/title\/(tt\d+)/) || [])[1];

    // Trakt has no IMDb search URL anymore; it resolves IMDb IDs directly
    // under /movies/<id> and /shows/<id>, so we need to know which one it is.
    function isSeries() {
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
                const type = JSON.parse(s.textContent)['@type'];
                if (type) return /TVSeries|TVSeason|TVEpisode/i.test(type);
            } catch (e) { /* ignore */ }
        }
        // Fallback: IMDb shows "TV Series" / "TV Mini Series" in the hero metadata
        const hero = document.querySelector('[data-testid="hero__pageTitle"]')?.parentElement;
        return !!hero && /TV (Mini )?Series/i.test(hero.textContent);
    }

    function getTitle() {
        const el = document.querySelector('[data-testid="hero__primary-text"], [data-testid="hero__pageTitle"]');
        return (el?.textContent || document.title.replace(/\s*\(.*$/, '').replace(/\s*-\s*IMDb.*$/, '')).trim();
    }

    function addStyle() {
        if (document.getElementById(`${ROW_ID}-style`)) return;
        const s = document.createElement('style');
        s.id = `${ROW_ID}-style`;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    // Find the genre/interest chip row (IMDb changes markup often, so try a few ways)
    function findChipRow() {
        const byTestId = document.querySelector('[data-testid="interests"], [data-testid="genres"]');
        if (byTestId) return byTestId;
        const chip = document.querySelector('a.ipc-chip[href*="/interest/"], a.ipc-chip[href*="genres="]');
        if (!chip) return null;
        return chip.closest('.ipc-chip-list--baseAlt, .ipc-chip-list') || chip.parentElement;
    }

    function makeChip(label, href, icon) {
        const a = document.createElement('a');
        a.className = 'tm-ext-chip';
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.innerHTML = `${icon}<span>${label}</span>`;
        return a;
    }

    function ensure() {
        const id = getId();
        if (!id) return;

        const existing = document.getElementById(ROW_ID);
        if (existing && existing.dataset.imdbId === id && existing.isConnected) return;
        if (existing) existing.remove();

        const anchor = findChipRow();
        if (!anchor) return;

        addStyle();
        const row = document.createElement('div');
        row.id = ROW_ID;
        row.dataset.imdbId = id;
        const series = isSeries();
        const title = encodeURIComponent(getTitle());
        const links = [
            // Direct links via IMDb ID
            !series && ['Letterboxd', `https://letterboxd.com/imdb/${id}/`, ICONS.letterboxd],
            ['Trakt', `https://app.trakt.tv/${series ? 'shows' : 'movies'}/${id}`, ICONS.trakt],
            ['TMDB', `https://www.themoviedb.org/redirect?external_source=imdb_id&external_id=${id}`, ICONS.tmdb],
            ['Wikipedia', `https://hub.toolforge.org/P345:${id}?lang=de`, ICONS.wikipedia],
            // No IMDb lookup available -> search by title
            title && ['JustWatch', `https://www.justwatch.com/de/Suche?q=${title}`, ICONS.justwatch],
            title && ['WerStreamt.es', `https://www.werstreamt.es/filme-serien/?q=${title}`, ICONS.werstreamt],
        ].filter(Boolean);
        row.append(...links.map(([label, href, icon]) => makeChip(label, href, icon)));
        anchor.insertAdjacentElement('afterend', row);
    }

    // IMDb is a single-page app: re-check whenever the DOM changes (debounced)
    let timer;
    new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(ensure, 150);
    }).observe(document.body, { childList: true, subtree: true });

    ensure();
})();
