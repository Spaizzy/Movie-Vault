// History Management
import { IMG_URL } from './config.js';
import { openDetails } from './modal.js';

// =============================================
// INITIALIZE HISTORY
// =============================================
export function initHistory() {
    renderHistory();
    setupEventListeners();
    updateHistoryCount();
}

// =============================================
// RENDER HISTORY
// =============================================
export function renderHistory() {
    const grid = document.getElementById('history-grid');
    if (!grid) return;

    const history = JSON.parse(localStorage.getItem('viewing_history')) || [];

    if (history.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <span class="material-symbols-rounded" style="font-size: 64px; color: var(--text-3); display: block; margin-bottom: 16px;">schedule</span>
                <h3 style="color: var(--text-1); margin-bottom: 8px;">No viewing history</h3>
                <p style="color: var(--text-3);">Start watching movies and TV shows to build your history.</p>
                <button onclick="window.location.href='/html/library.html'" class="btn-primary" style="margin-top: 20px;">
                    <span class="material-symbols-rounded">explore</span> Explore Library
                </button>
            </div>
        `;
        return;
    }

    // Sort by most recent first
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

    grid.innerHTML = sortedHistory.map((item, index) => {
        const title = item.title || 'Unknown Title';
        const poster = item.poster ? (item.poster.startsWith('http') ? item.poster : IMG_URL + item.poster) : 'https://via.placeholder.com/500x750?text=No+Poster';
        const type = item.type || 'movie';
        const id = item.id;
        const season = item.season || 1;
        const episode = item.episode || 1;
        const timestamp = item.timestamp || Date.now();
        const date = new Date(timestamp);
        const timeAgo = getTimeAgo(timestamp);
        
        // Get episode info for TV shows
        let episodeInfo = 'Feature Film';
        if (type === 'tv') {
            episodeInfo = `Season ${season}, Episode ${episode}`;
            if (item.episodeName) {
                episodeInfo += ` - ${item.episodeName}`;
            }
        }

        return `
        <div class="history-item" data-id="${id}" data-type="${type}" data-season="${season}" data-episode="${episode}">
            <div class="history-poster">
                <img src="${poster}" alt="${title}" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
                <div class="history-play-overlay">
                    <span class="material-symbols-rounded">play_arrow</span>
                </div>
            </div>
            <div class="history-details">
                <h3>${title}</h3>
                <p>${episodeInfo}</p>
                <div class="history-tags">
                    <span class="history-tag">${type === 'tv' ? 'TV Series' : 'Movie'}</span>
                    <span class="history-tag">${date.toLocaleDateString()}</span>
                </div>
            </div>
            <div class="history-meta">
                <span class="history-time">${timeAgo}</span>
                <button class="history-remove-btn" onclick="event.stopPropagation(); window.removeFromHistory(${id})" title="Remove from history">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
        </div>`;
    }).join('');

    // Add click events to open details
    grid.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const type = this.dataset.type;
            const season = parseInt(this.dataset.season) || 1;
            const episode = parseInt(this.dataset.episode) || 1;
            if (id && type) {
                openDetails(id, type, season, episode);
            }
        });
    });

    updateHistoryCount();
}

// =============================================
// GET TIME AGO
// =============================================
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(diff / 604800000);
    const months = Math.floor(diff / 2592000000);
    const years = Math.floor(diff / 31536000000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
}

// =============================================
// REMOVE FROM HISTORY
// =============================================
window.removeFromHistory = function(id) {
    let history = JSON.parse(localStorage.getItem('viewing_history')) || [];
    const item = history.find(item => item.id === id);
    history = history.filter(item => item.id !== id);
    localStorage.setItem('viewing_history', JSON.stringify(history));
    
    renderHistory();
    
    showNotification(`Removed "${item?.title || 'item'}" from history`, 'info');
    window.dispatchEvent(new CustomEvent('historyUpdated'));
};

// =============================================
// CLEAR ALL HISTORY
// =============================================
window.clearHistory = function() {
    if (confirm('Are you sure you want to clear your entire viewing history?')) {
        localStorage.removeItem('viewing_history');
        renderHistory();
        showNotification('History cleared successfully', 'info');
        window.dispatchEvent(new CustomEvent('historyUpdated'));
    }
};

// =============================================
// UPDATE HISTORY COUNT
// =============================================
function updateHistoryCount() {
    const history = JSON.parse(localStorage.getItem('viewing_history')) || [];
    const countElements = document.querySelectorAll('#history-count');
    countElements.forEach(el => {
        el.textContent = history.length;
    });
}

// =============================================
// SETUP EVENT LISTENERS
// =============================================
function setupEventListeners() {
    // Listen for history updates from other pages
    window.addEventListener('historyUpdated', () => {
        renderHistory();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'h' && e.ctrlKey) {
            e.preventDefault();
            window.clearHistory();
        }
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            renderHistory();
        }
    });
}

// =============================================
// NOTIFICATION HELPER
// =============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="material-symbols-rounded">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#202029'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        font-family: 'DM Sans', sans-serif;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// history.js
export function clearHistory() {
    localStorage.removeItem('viewing_history');
    window.dispatchEvent(new CustomEvent('historyUpdated'));
}

// =============================================
// EXPORT FUNCTIONS
// =============================================
export const showHistory = renderHistory;

// =============================================
// INITIALIZE ON LOAD
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initHistory();
});

// Make functions globally available
window.initHistory = initHistory;
window.renderHistory = renderHistory;
window.clearHistory = clearHistory;
window.removeFromHistory = removeFromHistory;
window.showHistory = showHistory;