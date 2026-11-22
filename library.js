// Library Page Logic
import { API_KEY, BASE_URL, IMG_URL } from './config.js';
import { State } from './state.js';
import { openDetails } from './modal.js';

let currentPage = 1;
let currentType = 'movie';
let currentGenre = '';
let currentRegion = '';
let currentYear = '';
let currentSort = 'popularity.desc';
let currentCategory = '';
let isLoading = false;
let hasMoreContent = true;

// =============================================
// INITIALIZE LIBRARY
// =============================================
export async function initLibrary() {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    
    // Call fetchLibrary with params
    await fetchLibrary(params);

    // Setup event listeners
    setupLibraryEvents();

    // Setup infinite scroll
    setupInfiniteScroll();
}

// =============================================
// FETCH LIBRARY CONTENT (NEW FUNCTION)
// =============================================
export async function fetchLibrary(params) {
    if (isLoading) return;

    // Extract from params or reset to defaults
    const type = params.get('type') || 'movie';
    const genre = params.get('genre') || '';
    const region = params.get('region') || '';
    const year = params.get('year') || '';
    const sort = params.get('sort') || 'popularity.desc';
    const category = params.get('category') || '';

    currentType = type;
    currentGenre = genre;
    currentRegion = region;
    currentYear = year;
    currentSort = sort;
    currentCategory = category;

    // Update UI to reflect current filters
    updateFilterUI(type, genre, region, year, sort, category);

    // Reload content
    await loadLibraryContent(true);
}

// =============================================
// LOAD LIBRARY CONTENT
// =============================================
export async function loadLibraryContent(reset = true) {
    if (isLoading) return;
    if (!reset && !hasMoreContent) return;

    isLoading = true;
    const grid = document.querySelector('.lib-movie-grid');
    
    if (reset) {
        currentPage = 1;
        hasMoreContent = true;
        if (grid) grid.innerHTML = '<div class="loader">Loading...</div>';
    }

    try {
        let url = buildApiUrl();
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch content');
        
        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
            hasMoreContent = false;
            if (reset && grid) {
                grid.innerHTML = `<div class="no-results">No content found matching your filters.</div>`;
            }
            isLoading = false;
            return;
        }

        if (reset) {
            renderLibraryGrid(results);
        } else {
            appendToLibraryGrid(results);
        }

        // Update load more state
        hasMoreContent = results.length >= 20;
        currentPage++;

    } catch (error) {
        console.error('Error loading library:', error);
        if (reset && grid) {
            grid.innerHTML = `
                <div class="no-results">
                    <span class="material-symbols-rounded" style="font-size: 48px;">error</span>
                    <p>Failed to load content. Please try again.</p>
                    <button onclick="window.location.reload()" class="btn-primary" style="margin-top: 16px;">
                        <span class="material-symbols-rounded">refresh</span> Retry
                    </button>
                </div>
            `;
        }
    }

    isLoading = false;
}

// =============================================
// BUILD API URL
// =============================================
function buildApiUrl() {
    let type = currentType;
    let endpoint = '';
    let params = `api_key=${API_KEY}&page=${currentPage}`;

    // Handle category-based endpoints
    if (currentCategory) {
        switch(currentCategory.toLowerCase()) {
            case 'trending':
                endpoint = 'trending/all/day';
                break;
            case 'popular':
                endpoint = `${type}/popular`;
                break;
            case 'top rated':
                endpoint = `${type}/top_rated`;
                break;
            case 'upcoming':
                endpoint = `${type}/upcoming`;
                break;
            case 'now playing':
                endpoint = `${type}/now_playing`;
                break;
            default:
                endpoint = `discover/${type}`;
                if (currentGenre) params += `&with_genres=${currentGenre}`;
                if (currentRegion) params += `&with_original_language=${getLanguageCode(currentRegion)}`;
                if (currentYear) params += `&primary_release_year=${currentYear}`;
                params += `&sort_by=${currentSort}`;
        }
    } else {
        endpoint = `discover/${type}`;
        if (currentGenre) params += `&with_genres=${currentGenre}`;
        if (currentRegion) params += `&with_original_language=${getLanguageCode(currentRegion)}`;
        if (currentYear) params += `&primary_release_year=${currentYear}`;
        if (currentSort) params += `&sort_by=${currentSort}`;
    }

    // If no specific endpoint, use discover
    if (!endpoint || endpoint === 'discover/movie' || endpoint === 'discover/tv') {
        endpoint = `discover/${type}`;
    }

    return `${BASE_URL}/${endpoint}?${params}`;
}

// =============================================
// GET LANGUAGE CODE
// =============================================
function getLanguageCode(region) {
    const codes = {
        'USA': 'en',
        'UK': 'en',
        'China': 'zh',
        'Japan': 'ja',
        'France': 'fr',
        'Korea': 'ko',
        'India': 'hi',
        'Nigeria': 'yo'
    };
    return codes[region] || 'en';
}

// =============================================
// RENDER LIBRARY GRID
// =============================================
export function renderLibraryGrid(items) {
    const grid = document.querySelector('.lib-movie-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `<div class="no-results">No content found</div>`;
        return;
    }

    grid.innerHTML = items.map(item => {
        const title = item.title || item.name || 'Unknown';
        const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/500x750?text=No+Poster';
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        const id = item.id;
        const year = item.release_date ? item.release_date.split('-')[0] : item.first_air_date ? item.first_air_date.split('-')[0] : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        return `
        <div class="movie-card" data-id="${id}" data-type="${type}">
            <div class="poster-container">
                <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
                <div class="status-badge">
                    <span class="status-dot"></span>
                    ${rating}
                </div>
                <div class="play-overlay">
                    <div class="play-circle">
                        <span class="material-symbols-rounded">play_arrow</span>
                    </div>
                </div>
            </div>
            <div class="movie-info">
                <p class="movie-title">${title}</p>
                <span>${year}</span>
            </div>
        </div>`;
    }).join('');

    // Add click events
    grid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const type = this.dataset.type;
            if (id && type) {
                openDetails(id, type);
            }
        });
    });
}

// =============================================
// APPEND TO LIBRARY GRID
// =============================================
function appendToLibraryGrid(items) {
    const grid = document.querySelector('.lib-movie-grid');
    if (!grid) return;

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const title = item.title || item.name || 'Unknown';
        const poster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/500x750?text=No+Poster';
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        const id = item.id;
        const year = item.release_date ? item.release_date.split('-')[0] : item.first_air_date ? item.first_air_date.split('-')[0] : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = id;
        card.dataset.type = type;
        card.innerHTML = `
            <div class="poster-container">
                <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
                <div class="status-badge">
                    <span class="status-dot"></span>
                    ${rating}
                </div>
                <div class="play-overlay">
                    <div class="play-circle">
                        <span class="material-symbols-rounded">play_arrow</span>
                    </div>
                </div>
            </div>
            <div class="movie-info">
                <p class="movie-title">${title}</p>
                <span>${year}</span>
            </div>
        `;
        card.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const type = this.dataset.type;
            if (id && type) {
                openDetails(id, type);
            }
        });
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
}

// =============================================
// UPDATE FILTER UI
// =============================================
function updateFilterUI(type, genre, region, year, sort, category) {
    // Update type filter
    document.querySelectorAll('.cate-links li, .top-links li').forEach(link => {
        link.classList.remove('active');
        const linkType = link.dataset.type;
        if (linkType === type) {
            link.classList.add('active');
        }
    });

    // Update genre filter
    document.querySelectorAll('.cate-links li').forEach(link => {
        link.classList.remove('active');
        const linkGenre = link.dataset.genre;
        if (linkGenre === genre) {
            link.classList.add('active');
        }
    });

    // Update region filter
    document.querySelectorAll('.region-links li').forEach(link => {
        link.classList.remove('active');
        const linkRegion = link.innerText.trim();
        if (linkRegion === region) {
            link.classList.add('active');
        }
    });

    // Update year filter
    document.querySelectorAll('.time-links li').forEach(link => {
        link.classList.remove('active');
        const linkYear = link.innerText.trim();
        if (linkYear === year || (year === 'Before' && linkYear === 'Before')) {
            link.classList.add('active');
        }
    });

    // Update sort filter
    document.querySelectorAll('.sort-links li').forEach(link => {
        link.classList.remove('active');
        const linkSort = link.dataset.sort;
        if (linkSort === sort) {
            link.classList.add('active');
        }
    });

    // Update category filter
    document.querySelectorAll('.top-links li').forEach(link => {
        link.classList.remove('active');
        const linkCategory = link.dataset.category;
        if (linkCategory === category) {
            link.classList.add('active');
        }
    });
}

// =============================================
// SETUP LIBRARY EVENTS
// =============================================
function setupLibraryEvents() {
    // Type filters (Movie, TV, etc.)
    document.querySelectorAll('.lib-option .cate-links li, .top-links li').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active state
            document.querySelectorAll('.lib-option .cate-links li, .top-links li').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Get filter values
            const type = this.dataset.type || 'movie';
            const genre = this.dataset.genre || '';
            const category = this.dataset.category || '';

            // Update current filters
            currentType = type;
            currentGenre = genre;
            currentCategory = category;

            // Reload content
            loadLibraryContent(true);
        });
    });

    // Genre filters
    document.querySelectorAll('.region-links li, .time-links li, .sort-links li').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active state
            const parent = this.closest('ul');
            if (parent) {
                parent.querySelectorAll('li').forEach(l => l.classList.remove('active'));
            }
            this.classList.add('active');

            // Get filter values
            const region = this.closest('.region-links') ? this.innerText.trim() : '';
            const year = this.closest('.time-links') ? this.innerText.trim() : '';
            const sort = this.closest('.sort-links') ? this.dataset.sort : '';

            // Update current filters
            if (region) currentRegion = region;
            if (year) currentYear = year;
            if (sort) currentSort = sort;

            // Reload content
            loadLibraryContent(true);
        });
    });

    // "All" links
    document.querySelectorAll('.region-links li:first-child, .time-links li:first-child').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const parent = this.closest('ul');
            if (parent) {
                parent.querySelectorAll('li').forEach(l => l.classList.remove('active'));
            }
            this.classList.add('active');
            
            // Reset filters
            if (this.closest('.region-links')) currentRegion = '';
            if (this.closest('.time-links')) currentYear = '';
            
            loadLibraryContent(true);
        });
    });
}

// =============================================
// SETUP INFINITE SCROLL
// =============================================
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && hasMoreContent) {
                loadLibraryContent(false);
            }
        });
    }, { rootMargin: '200px' });

    // Observe a sentinel element at the bottom
    const grid = document.querySelector('.lib-movie-grid');
    if (grid) {
        const sentinel = document.createElement('div');
        sentinel.className = 'load-more-sentinel';
        sentinel.style.height = '20px';
        sentinel.style.visibility = 'hidden';
        grid.parentNode.appendChild(sentinel);
        observer.observe(sentinel);
    }
}

// =============================================
// CHANGE SORT (Global function)
// =============================================
window.changeSort = function(element, sortValue) {
    document.querySelectorAll('.sort-links li').forEach(l => l.classList.remove('active'));
    if (element) element.classList.add('active');
    
    currentSort = sortValue;
    loadLibraryContent(true);
};

// =============================================
// CHANGE FILTER (Global function)
// =============================================
window.changeFilter = function(type, value) {
    switch(type) {
        case 'type':
            currentType = value;
            break;
        case 'genre':
            currentGenre = value;
            break;
        case 'region':
            currentRegion = value;
            break;
        case 'year':
            currentYear = value;
            break;
        case 'sort':
            currentSort = value;
            break;
        case 'category':
            currentCategory = value;
            break;
    }
    loadLibraryContent(true);
};

// =============================================
// INITIALIZE ON LOAD
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initLibrary();
});

// Make functions globally available
window.initLibrary = initLibrary;
window.loadLibraryContent = loadLibraryContent;
window.renderLibraryGrid = renderLibraryGrid;
window.fetchLibrary = fetchLibrary;

// Expose functions to window for inline onclick
window.viewAll = function(type) {
    console.log("View All clicked for:", type);
};