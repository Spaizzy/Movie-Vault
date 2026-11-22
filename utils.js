// Utility Functions
import { IMG_URL } from './config.js';

export function showSkeleton(containerSelector, count = 12) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = Array(count).fill(`
        <div class="skeleton-card">
            <div class="skeleton-poster shimmer"></div>
            <div class="skeleton-text shimmer"></div>
        </div>`).join('');
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

export function getPosterUrl(path) {
    return path ? IMG_URL + path : 'https://via.placeholder.com/500x750?text=No+Poster';
}

export function getBackdropUrl(path) {
    return path ? `https://image.tmdb.org/t/p/w1280${path}` : '';
}