// Search Logic
import { fetchSearch as apiFetchSearch } from './api.js';
import { renderLibraryGrid, fetchLibrary } from './library.js';
import { showSkeleton } from './utils.js';

let searchDebounceTimer;

export function setupGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    const clearBtn = document.getElementById('clear-search');

    if (!searchInput || !clearBtn) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearBtn.style.display = query.length > 0 ? 'flex' : 'none';

        clearTimeout(searchDebounceTimer);
        if (query.length === 0) {
            restoreDefaultLibrary();
            return;
        }
        if (query.length < 2) return;

        searchDebounceTimer = setTimeout(() => fetchSearch(query), 600);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        restoreDefaultLibrary();
    });
}

export async function fetchSearch(query) {
    const movieGrid = document.querySelector('.lib-movie-grid');
    if (!movieGrid) return;

    movieGrid.innerHTML = '';
    showSkeleton('.lib-movie-grid', 12);
    
    try {
        const data = await apiFetchSearch(query);
        const filteredResults = data.results.filter(item => 
            item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv')
        );
        
        if (filteredResults.length > 0) {
            // Note: renderLibraryGrid only takes one argument now
            await renderLibraryGrid(filteredResults); 
            updateTitle(`Results for: "${query}"`);
        } else {
            movieGrid.innerHTML = `<div class="no-results">No matches found for "${query}"</div>`;
        }
    } catch (err) {
        console.error("Search failed:", err);
    }
}

function restoreDefaultLibrary() {
    updateTitle("Browse Library");
    const params = new URLSearchParams(window.location.search);
    fetchLibrary(params); // Fetches the library based on current URL params
}

function updateTitle(text) {
    const h2 = document.querySelector('main h2');
    if (h2) h2.innerText = text;
}