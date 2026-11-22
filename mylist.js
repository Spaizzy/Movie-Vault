// My List Page Logic
import { IMG_URL } from './config.js';
import { openDetails } from './modal.js';

// =============================================
// INITIALIZE MY LIST
// =============================================
export function initMyList() {
    renderMyList();
    setupEventListeners();
    updateCount();
}

// =============================================
// RENDER MY LIST
// =============================================
export function renderMyList() {
    const grid = document.getElementById('my-list-grid');
    if (!grid) return;

    const myList = JSON.parse(localStorage.getItem('my_list')) || [];

    if (myList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <span class="material-symbols-rounded" style="font-size: 64px; color: var(--text-3); display: block; margin-bottom: 16px;">bookmark</span>
                <h3 style="color: var(--text-1); margin-bottom: 8px;">Your list is empty</h3>
                <p style="color: var(--text-3);">Start adding movies and TV shows to your list by clicking the <strong>Save</strong> button on any title.</p>
                <button onclick="window.location.href='/html/library.html'" class="btn-primary" style="margin-top: 20px;">
                    <span class="material-symbols-rounded">explore</span> Explore Library
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = myList.map(item => {
        const title = item.title || 'Unknown';
        const poster = item.poster ? IMG_URL + item.poster : 'https://via.placeholder.com/500x750?text=No+Poster';
        const type = item.type || 'movie';
        const id = item.id;
        const addedAt = item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '';
        
        return `
        <div class="movie-card" data-id="${id}" data-type="${type}">
            <div class="poster-container">
                <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
                <div class="status-badge">
                    <span class="material-symbols-rounded" style="font-size: 12px;">bookmark_added</span>
                    Saved
                </div>
                <div class="play-overlay">
                    <div class="play-circle">
                        <span class="material-symbols-rounded">play_arrow</span>
                    </div>
                </div>
                <button class="remove-btn" onclick="event.stopPropagation(); window.removeFromMyList(${id})" title="Remove from list">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="movie-info">
                <p class="movie-title">${title}</p>
                <span>${addedAt}</span>
            </div>
        </div>`;
    }).join('');

    // Add click events to open details
    grid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const type = this.dataset.type;
            if (id && type) {
                openDetails(id, type);
            }
        });
    });

    updateCount();
}

// =============================================
// REMOVE FROM MY LIST
// =============================================
window.removeFromMyList = function(id) {
    let myList = JSON.parse(localStorage.getItem('my_list')) || [];
    const item = myList.find(item => item.id === id);
    myList = myList.filter(item => item.id !== id);
    localStorage.setItem('my_list', JSON.stringify(myList));
    
    // Re-render
    renderMyList();
    
    // Show notification
    showNotification(`Removed "${item?.title || 'item'}" from your list`, 'info');
    
    // Dispatch event for other pages
    window.dispatchEvent(new CustomEvent('myListUpdated'));
};

// =============================================
// CLEAR ALL MY LIST
// =============================================
window.clearMyList = function() {
    if (confirm('Are you sure you want to clear all items from your list?')) {
        localStorage.removeItem('my_list');
        renderMyList();
        showNotification('All items removed from your list', 'info');
        window.dispatchEvent(new CustomEvent('myListUpdated'));
    }
};

// =============================================
// UPDATE COUNT
// =============================================
function updateCount() {
    const myList = JSON.parse(localStorage.getItem('my_list')) || [];
    const countElements = document.querySelectorAll('#list-count');
    countElements.forEach(el => {
        el.textContent = myList.length;
    });
}

// =============================================
// SETUP EVENT LISTENERS
// =============================================
function setupEventListeners() {
    // Listen for list updates from other pages
    window.addEventListener('myListUpdated', () => {
        renderMyList();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            renderMyList();
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

// =============================================
// INITIALIZE ON LOAD
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initMyList();
});

// Make functions globally available
window.initMyList = initMyList;
window.renderMyList = renderMyList;