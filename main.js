// Main Initialization & UI Setup
import { State } from './state.js';
import { setupHomeSliders, syncHeroSlider, syncHomeGrids, setupCategoryFilters } from './home.js';
import { setupFilterListeners, fetchLibrary, setupInfiniteScroll, setupStickyTextTrigger } from './library.js';
import { setupGlobalSearch, fetchSearch } from './search.js';
import { renderHistory, clearHistory, showHistory } from './history.js';
import { renderMyList, toggleMyList } from './mylist.js';
import { Downloads, renderDownloadList, syncStorage, openDownload, closeDownload, startDownload } from './downloads.js';
import { openDetails, loadEpisodes, closeModal } from './modal.js';
import { Player } from './player.js';

// Expose to window for inline onclick handlers
window.State = State;
window.Player = Player;
window.openDetails = openDetails;
window.loadEpisodes = loadEpisodes;
window.toggleMyList = toggleMyList;
window.Downloads = Downloads;
window.clearHistory = clearHistory;
window.showHistory = showHistory;
window.renderDownloadList = renderDownloadList;
window.syncStorage = syncStorage;
window.openDownload = openDownload;
window.closeDownload = closeDownload;
window.startDownload = startDownload;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const movieGrid = document.querySelector('.lib-movie-grid');
    const menuBtn = document.getElementById('menu-btn');
    const sideBar = document.querySelector('.side-bar');

    if (movieGrid) {
        if (!params.has('category')) {
            params.set('category', 'TV Series');
            params.set('genre', 'tv');
            window.history.replaceState({}, '', `?${params.toString()}`);
        }
        setupFilterListeners(params);
        setupInfiniteScroll();
        setupStickyTextTrigger();
        fetchLibrary(params);
    }

    setupGlobalSearch();

    if (params.has('search') && window.location.pathname.includes('library.html')) {
        fetchSearch(params.get('search'));
    }

    if (menuBtn && sideBar) {
        menuBtn.addEventListener('click', () => {
            window.innerWidth > 768 ? sideBar.classList.toggle('collapsed') : sideBar.classList.toggle('open');
        });
    }

    setupUIListeners();
    setupHomeSliders();
    syncHeroSlider();
    syncHomeGrids();
    setupCategoryFilters();
    renderHistory();
    renderMyList();
    
    // Use the imported functions
    renderDownloadList();
    syncStorage();

    // Modal close handlers
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Close modal on overlay click
    const modal = document.getElementById('movie-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
});

function setupUIListeners() {
    const navbar = document.getElementById('navbar');
    const navBar = document.querySelector('.lib-top-bar');

    window.addEventListener('scroll', () => {
        if (navbar && navBar) {
            window.scrollY > 100 
                ? (navbar.classList.add('scrolled'), navBar.classList.add('scrolled')) 
                : (navbar.classList.remove('scrolled'), navBar.classList.remove('scrolled'));
        }
    });
}

window.addEventListener('load', () => {
    const url = new URL(window.location);
    if (url.searchParams.has('category')) {
        url.searchParams.delete('category');
        window.history.replaceState({}, '', url);
    }

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const defaultBtn = document.querySelector('[data-type="tv"]');
    if (defaultBtn) defaultBtn.classList.add('active');
});