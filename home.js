// Home Page Logic
import { API_KEY, BASE_URL, IMG_URL, CATEGORY_MAP } from './config.js';
import { showSkeleton } from './utils.js';
import { fetchTrending, fetchMovies } from './api.js';
import { State } from './state.js';
import { openDetails } from './modal.js';

let autoPlayInterval = null;
let currentNavFilter = 'trending';
let currentCategoryFilter = null;

// =============================================
// NAVBAR FILTER MAPPING
// =============================================
const NAVBAR_FILTERS = {
    'trending': {
        endpoint: 'trending/all/day',
        title: 'Trending',
        type: 'all',
        grids: {
            trending: { endpoint: 'trending/all/day', title: 'Trending Now' },
            popular: { endpoint: 'movie/popular', title: 'Popular Movies' },
            toptv: { endpoint: 'tv/top_rated', title: 'Top Rated TV Shows' },
            upcoming: { endpoint: 'movie/upcoming', title: 'Coming Soon' },
            nowplaying: { endpoint: 'movie/now_playing', title: 'Now Playing' }
        }
    },
    'movie': {
        endpoint: 'movie/popular',
        title: 'Movies',
        type: 'movie',
        grids: {
            trending: { endpoint: 'movie/popular', title: 'Popular Movies' },
            popular: { endpoint: 'movie/top_rated', title: 'Top Rated Movies' },
            toptv: { endpoint: 'movie/upcoming', title: 'Upcoming Movies' },
            upcoming: { endpoint: 'movie/now_playing', title: 'Now Playing' },
            nowplaying: { endpoint: 'movie/popular', title: 'Trending Movies' }
        }
    },
    'tv': {
        endpoint: 'tv/popular',
        title: 'TV Series',
        type: 'tv',
        grids: {
            trending: { endpoint: 'tv/popular', title: 'Popular TV Series' },
            popular: { endpoint: 'tv/top_rated', title: 'Top Rated TV Shows' },
            toptv: { endpoint: 'tv/on_the_air', title: 'Currently Airing' },
            upcoming: { endpoint: 'tv/popular', title: 'Trending TV Shows' },
            nowplaying: { endpoint: 'tv/top_rated', title: 'Best TV Shows' }
        }
    },
    'kdrama': {
        endpoint: 'discover/tv',
        title: 'K-Drama',
        type: 'tv',
        params: '&with_original_language=ko&with_genres=18',
        grids: {
            trending: { endpoint: 'discover/tv', title: 'Popular K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/tv', title: 'Top Rated K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=vote_average.desc&vote_count.gte=100' },
            toptv: { endpoint: 'discover/tv', title: 'Romance K-Drama', params: '&with_original_language=ko&with_genres=18,10749&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/tv', title: 'New K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=first_air_date.desc' },
            nowplaying: { endpoint: 'discover/tv', title: 'Trending K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=popularity.desc' }
        }
    },
    'anime': {
        endpoint: 'discover/tv',
        title: 'Anime',
        type: 'tv',
        params: '&with_genres=16',
        grids: {
            trending: { endpoint: 'discover/tv', title: 'Popular Anime', params: '&with_genres=16&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/tv', title: 'Top Rated Anime', params: '&with_genres=16&sort_by=vote_average.desc&vote_count.gte=100' },
            toptv: { endpoint: 'discover/tv', title: 'Action Anime', params: '&with_genres=16,28&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/tv', title: 'New Anime', params: '&with_genres=16&sort_by=first_air_date.desc' },
            nowplaying: { endpoint: 'discover/tv', title: 'Trending Anime', params: '&with_genres=16&sort_by=popularity.desc' }
        }
    }
};

// =============================================
// CATEGORY FILTER MAPPING (Affects ALL Grids)
// =============================================
const CATEGORY_FILTERS = {
    'All': {
        grids: {
            trending: { endpoint: 'trending/all/day', title: 'Trending Now' },
            popular: { endpoint: 'movie/popular', title: 'Popular Movies' },
            toptv: { endpoint: 'tv/top_rated', title: 'Top Rated TV Shows' },
            upcoming: { endpoint: 'movie/upcoming', title: 'Coming Soon' },
            nowplaying: { endpoint: 'movie/now_playing', title: 'Now Playing' }
        }
    },
    'Western TV': {
        grids: {
            trending: { endpoint: 'discover/tv', title: 'Popular Western TV', params: '&with_original_language=en&with_genres=37&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/tv', title: 'Top Rated Western TV', params: '&with_original_language=en&with_genres=37&sort_by=vote_average.desc&vote_count.gte=50' },
            toptv: { endpoint: 'discover/tv', title: 'Action Western TV', params: '&with_original_language=en&with_genres=37,28&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/tv', title: 'New Western TV', params: '&with_original_language=en&with_genres=37&sort_by=first_air_date.desc' },
            nowplaying: { endpoint: 'discover/tv', title: 'Trending Western TV', params: '&with_original_language=en&with_genres=37&sort_by=popularity.desc' }
        }
    },
    'TV series': {
        grids: {
            trending: { endpoint: 'discover/tv', title: 'Popular TV Series', params: '&with_original_language=en&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/tv', title: 'Top Rated TV Series', params: '&with_original_language=en&sort_by=vote_average.desc&vote_count.gte=100' },
            toptv: { endpoint: 'discover/tv', title: 'Drama TV Series', params: '&with_original_language=en&with_genres=18&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/tv', title: 'New TV Series', params: '&with_original_language=en&sort_by=first_air_date.desc' },
            nowplaying: { endpoint: 'discover/tv', title: 'Trending TV Series', params: '&with_original_language=en&sort_by=popularity.desc' }
        }
    },
    'Hollywood': {
        grids: {
            trending: { endpoint: 'discover/movie', title: 'Popular Hollywood Movies', params: '&with_original_language=en&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/movie', title: 'Top Rated Hollywood', params: '&with_original_language=en&sort_by=vote_average.desc&vote_count.gte=100' },
            toptv: { endpoint: 'discover/movie', title: 'Action Hollywood', params: '&with_original_language=en&with_genres=28&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/movie', title: 'Upcoming Hollywood', params: '&with_original_language=en&sort_by=primary_release_date.desc' },
            nowplaying: { endpoint: 'discover/movie', title: 'Trending Hollywood', params: '&with_original_language=en&sort_by=popularity.desc' }
        }
    },
    'Nollywood': {
        grids: {
            trending: { endpoint: 'discover/movie', title: 'Popular Nollywood', params: '&with_original_language=yo&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/movie', title: 'Top Rated Nollywood', params: '&with_original_language=yo&sort_by=vote_average.desc&vote_count.gte=20' },
            toptv: { endpoint: 'discover/movie', title: 'Nollywood Drama', params: '&with_original_language=yo&with_genres=18&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/movie', title: 'New Nollywood', params: '&with_original_language=yo&sort_by=primary_release_date.desc' },
            nowplaying: { endpoint: 'discover/movie', title: 'Trending Nollywood', params: '&with_original_language=yo&sort_by=popularity.desc' }
        }
    },
    'Bollywood': {
        grids: {
            trending: { endpoint: 'discover/movie', title: 'Popular Bollywood', params: '&with_original_language=hi&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/movie', title: 'Top Rated Bollywood', params: '&with_original_language=hi&sort_by=vote_average.desc&vote_count.gte=50' },
            toptv: { endpoint: 'discover/movie', title: 'Bollywood Romance', params: '&with_original_language=hi&with_genres=10749&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/movie', title: 'New Bollywood', params: '&with_original_language=hi&sort_by=primary_release_date.desc' },
            nowplaying: { endpoint: 'discover/movie', title: 'Trending Bollywood', params: '&with_original_language=hi&sort_by=popularity.desc' }
        }
    },
    'K-Drama': {
        grids: {
            trending: { endpoint: 'discover/tv', title: 'Popular K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/tv', title: 'Top Rated K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=vote_average.desc&vote_count.gte=50' },
            toptv: { endpoint: 'discover/tv', title: 'Romance K-Drama', params: '&with_original_language=ko&with_genres=18,10749&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/tv', title: 'New K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=first_air_date.desc' },
            nowplaying: { endpoint: 'discover/tv', title: 'Trending K-Drama', params: '&with_original_language=ko&with_genres=18&sort_by=popularity.desc' }
        }
    },
    'Anime': {
        grids: {
            trending: { endpoint: 'discover/tv', title: 'Popular Anime', params: '&with_genres=16&sort_by=popularity.desc' },
            popular: { endpoint: 'discover/tv', title: 'Top Rated Anime', params: '&with_genres=16&sort_by=vote_average.desc&vote_count.gte=100' },
            toptv: { endpoint: 'discover/tv', title: 'Action Anime', params: '&with_genres=16,28&sort_by=popularity.desc' },
            upcoming: { endpoint: 'discover/tv', title: 'New Anime', params: '&with_genres=16&sort_by=first_air_date.desc' },
            nowplaying: { endpoint: 'discover/tv', title: 'Trending Anime', params: '&with_genres=16&sort_by=popularity.desc' }
        }
    }
};

// =============================================
// GRID CONFIGURATIONS
// =============================================
const GRID_IDS = {
    trending: 'trending-grid',
    popular: 'popular-movies-grid',
    toptv: 'top-tv-grid',
    upcoming: 'upcoming-grid',
    nowplaying: 'now-playing-grid'
};

// =============================================
// NAVBAR SETUP
// =============================================
export function setupNavbar() {
    const navLinks = document.querySelectorAll('.nav-links li');
    
    navLinks.forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Get filter key from data attribute
            const filterKey = this.querySelector('a')?.dataset.filter || 'trending';
            currentNavFilter = filterKey;
            currentCategoryFilter = null; // Reset category filter
            
            // Reset category active states
            document.querySelectorAll('.category-card, .category-card1').forEach(c => {
                c.classList.remove('active-cat');
            });
            // Set "All" as active
            const allCategory = document.querySelector('.category-card1[data-category="All"]');
            if (allCategory) allCategory.classList.add('active-cat');
            
            // Update everything
            await updateHeroContent(filterKey);
            await updateAllGridsWithFilter(filterKey);
        });
    });
}

// =============================================
// CATEGORY SETUP (Affects ALL Grids)
// =============================================
export function setupCategoryFilters() {
    const categoryCards = document.querySelectorAll('.category-card, .category-card1');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', async function() {
            const categoryName = this.querySelector('p')?.innerText.trim() || 'All';
            
            // Update active state
            categoryCards.forEach(c => c.classList.remove('active-cat'));
            this.classList.add('active-cat');
            
            currentCategoryFilter = categoryName;
            
            // Reset navbar active states
            document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
            // Set Trending as active
            const trendingNav = document.querySelector('.nav-links li:first-child');
            if (trendingNav) trendingNav.classList.add('active');
            
            // Update ALL grids with category filter
            await updateAllGridsWithCategory(categoryName);
            
            // Update hero to match category (optional - can keep trending)
            // If you want hero to change too, uncomment:
            // await updateHeroContent('trending');
        });
    });
}

// =============================================
// UPDATE HERO CONTENT
// =============================================
export async function updateHeroContent(filterKey) {
    const filter = NAVBAR_FILTERS[filterKey];
    if (!filter) return;

    try {
        let url;
        if (filterKey === 'trending') {
            url = `${BASE_URL}/trending/all/day?api_key=${API_KEY}`;
        } else if (filterKey === 'movie') {
            url = `${BASE_URL}/movie/popular?api_key=${API_KEY}`;
        } else if (filterKey === 'tv') {
            url = `${BASE_URL}/tv/popular?api_key=${API_KEY}`;
        } else if (filterKey === 'kdrama') {
            url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=18&sort_by=popularity.desc`;
        } else if (filterKey === 'anime') {
            url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&sort_by=popularity.desc`;
        }

        const response = await fetch(url);
        const data = await response.json();
        const movies = data.results.slice(0, 6);

        const heroWrapper = document.querySelector('.hero-slider');
        if (!heroWrapper) return;

        heroWrapper.innerHTML = movies.map(movie => {
            const title = movie.title || movie.name || 'Unknown';
            const poster = movie.poster_path ? IMG_URL + movie.poster_path : 'https://via.placeholder.com/500x750?text=No+Poster';
            const backdrop = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : poster;
            const type = movie.media_type || (movie.title ? 'movie' : 'tv');
            const year = movie.release_date ? movie.release_date.split('-')[0] : movie.first_air_date ? movie.first_air_date.split('-')[0] : '';
            
            return `
            <div class="hero-slide" data-id="${movie.id}" data-type="${type}" style="background-image: linear-gradient(to top, #111 10%, rgba(17,17,17,0.3) 50%, rgba(17,17,17,0.5) 100%), url('${backdrop}');">
                <div class="hero-content">
                    <div class="hero-card">
                        <img src="${poster}" alt="${title}">
                    </div>
                    <div class="hero-details">
                        <h1>${title}</h1>
                        <p>${year} • Rating: ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
                        <div class="hero-buttons">
                            <button class="watch-btn" data-id="${movie.id}" data-type="${type}">
                                <span class="material-symbols-rounded">play_arrow</span> Watch Now
                            </button>
                            <button class="download-btn-hero" data-id="${movie.id}" data-type="${type}">
                                <span class="material-symbols-rounded">download</span> Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        attachHeroEvents();
        setupHeroSlider();
        
    } catch (error) {
        console.error('Error updating hero:', error);
    }
}

function attachHeroEvents() {
    document.querySelectorAll('.hero-slide .watch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const type = btn.dataset.type;
            openDetails(id, type);
        });
    });

    document.querySelectorAll('.hero-slide .download-btn-hero').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const type = btn.dataset.type;
            openDetails(id, type);
            setTimeout(() => {
                import('./downloads.js').then(module => {
                    module.Downloads.openDownload();
                });
            }, 500);
        });
    });

    document.querySelectorAll('.hero-slide').forEach(slide => {
        slide.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const type = this.dataset.type;
            if (id && type) {
                openDetails(id, type);
            }
        });
    });
}

// =============================================
// UPDATE ALL GRIDS WITH NAVBAR FILTER
// =============================================
export async function updateAllGridsWithFilter(filterKey) {
    const filter = NAVBAR_FILTERS[filterKey];
    if (!filter) return;

    const gridConfigs = filter.grids;
    
    for (const [key, config] of Object.entries(gridConfigs)) {
        const gridId = GRID_IDS[key];
        const grid = document.getElementById(gridId);
        if (!grid) continue;

        try {
            let url;
            if (config.endpoint.includes('discover')) {
                url = `${BASE_URL}/${config.endpoint}?api_key=${API_KEY}${config.params || ''}`;
            } else {
                url = `${BASE_URL}/${config.endpoint}?api_key=${API_KEY}`;
            }
            
            const res = await fetch(url);
            const data = await res.json();
            const results = data.results || [];
            
            renderHomeGrid(grid, results.slice(0, 20));
            
            // Update section title
            const sectionHeader = grid.closest('.container')?.querySelector('.section-header h2');
            if (sectionHeader) {
                sectionHeader.textContent = config.title;
            }
            
        } catch (err) {
            console.error(`Error loading ${key}:`, err);
            grid.innerHTML = `<div class="no-results">Failed to load content</div>`;
        }
    }
}

// =============================================
// UPDATE ALL GRIDS WITH CATEGORY FILTER
// =============================================
export async function updateAllGridsWithCategory(categoryName) {
    const filter = CATEGORY_FILTERS[categoryName];
    if (!filter) return;

    const gridConfigs = filter.grids;
    
    for (const [key, config] of Object.entries(gridConfigs)) {
        const gridId = GRID_IDS[key];
        const grid = document.getElementById(gridId);
        if (!grid) continue;

        try {
            let url;
            if (config.endpoint.includes('discover')) {
                url = `${BASE_URL}/${config.endpoint}?api_key=${API_KEY}${config.params || ''}`;
            } else {
                url = `${BASE_URL}/${config.endpoint}?api_key=${API_KEY}`;
            }
            
            const res = await fetch(url);
            const data = await res.json();
            const results = data.results || [];
            
            renderHomeGrid(grid, results.slice(0, 20));
            
            // Update section title
            const sectionHeader = grid.closest('.container')?.querySelector('.section-header h2');
            if (sectionHeader) {
                sectionHeader.textContent = config.title;
            }
            
        } catch (err) {
            console.error(`Error loading ${key}:`, err);
            grid.innerHTML = `<div class="no-results">Failed to load content</div>`;
        }
    }
}

// =============================================
// RENDER HOME GRID
// =============================================
export function renderHomeGrid(grid, items) {
    if (!items || items.length === 0) {
        grid.innerHTML = `<div class="no-results">No items found</div>`;
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
// HERO SLIDER SETUP
// =============================================
export function setupHeroSlider() {
    const slider = document.querySelector('.hero-slider');
    const dots = document.querySelectorAll('.hero-dots .dot');
    const slides = document.querySelectorAll('.hero-slide');
    if (!slider || slides.length === 0) return;

    let currentIndex = 0;

    const startAutoPlay = () => {
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % slides.length;
            updateSliderState(currentIndex);
        }, 6000);
    };

    const stopAutoPlay = () => clearInterval(autoPlayInterval);

    function updateSliderState(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        currentIndex = index;
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            updateSliderState(index);
            stopAutoPlay();
            startAutoPlay();
        });
    });

    if (slider) {
        slider.addEventListener('mouseenter', stopAutoPlay);
        slider.addEventListener('mouseleave', startAutoPlay);
    }

    updateSliderState(0);
    startAutoPlay();
}

// =============================================
// SLIDER SCROLL HANDLERS
// =============================================
export function setupHomeSliders() {
    document.querySelectorAll('.row-container').forEach(row => {
        const scrollContainer = row.querySelector('.movie-grid, .category-grid');
        if (!scrollContainer) return;
        
        const leftHandle = row.querySelector('.left-handle');
        const rightHandle = row.querySelector('.right-handle');
        
        if (leftHandle) {
            leftHandle.addEventListener('click', () => {
                scrollContainer.scrollBy({ 
                    left: -scrollContainer.clientWidth * 0.8, 
                    behavior: 'smooth' 
                });
            });
        }
        
        if (rightHandle) {
            rightHandle.addEventListener('click', () => {
                scrollContainer.scrollBy({ 
                    left: scrollContainer.clientWidth * 0.8, 
                    behavior: 'smooth' 
                });
            });
        }
    });
}

// =============================================
// VIEW ALL
// =============================================
export function viewAll(category) {
    const params = new URLSearchParams();
    const title = category.toLowerCase();

    if (title.includes('trending')) {
        params.set('category', 'Trending');
        params.set('sort', 'popularity.desc');
    } else if (title.includes('movies') || title.includes('popular')) {
        params.set('category', 'Movies');
        params.set('type', 'movie');
    } else if (title.includes('tv') || title.includes('series')) {
        params.set('category', 'TV Series');
        params.set('type', 'tv');
    } else if (title.includes('upcoming')) {
        params.set('category', 'Upcoming');
        params.set('sort', 'primary_release_date.asc');
    } else if (title.includes('now playing')) {
        params.set('category', 'Now Playing');
        params.set('sort', 'primary_release_date.desc');
    }

    window.location.href = `/html/library.html?${params.toString()}`;
}

// =============================================
// INITIALIZE
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    setupHomeSliders();
    setupNavbar();
    setupCategoryFilters();
    
    // Initial load
    updateHeroContent('trending');
    updateAllGridsWithFilter('trending');
});

// Make functions globally available
window.viewAll = viewAll;
window.openDetails = openDetails;
window.updateHeroContent = updateHeroContent;
window.updateAllGridsWithFilter = updateAllGridsWithFilter;
window.updateAllGridsWithCategory = updateAllGridsWithCategory;

// Expose functions to window for inline onclick
window.viewAll = function(type) {
    // Your existing viewAll logic here
    console.log("View All clicked for:", type);
};

// Expose the Downloads object
import { Downloads } from './downloads.js'; // Assuming it's in downloads.js
window.Downloads = Downloads;