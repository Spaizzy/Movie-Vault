// Download Management - Frontend
import { State } from './state.js';
import { fetchEpisodes } from './api.js';

const API_BASE_URL = 'http://localhost:3000';

export const Downloads = {
    activeDownloads: new Map(),

    // =============================================
    // OPEN DOWNLOAD MODAL
    // =============================================
    openDownload() {
        const overlay = document.getElementById('download-overlay');
        const epGrid = document.getElementById('episode-download-grid');
        const qualGrid = document.getElementById('quality-selection');
        const headerTitle = document.querySelector('.dl-header span') || document.getElementById('dl-modal-title');
        const currentMovieTitle = document.getElementById('modal-title')?.innerText || "Download";

        if (!overlay) return;
        
        overlay.style.display = 'flex';
        if (headerTitle) headerTitle.innerText = currentMovieTitle;
        this.updateDownloadCount();

        // Check if content is available (silent check)
        this.checkAvailability(State.currentMovieId, State.currentType || 'movie').catch(() => {});

        if (State.currentType === 'tv') {
            if (qualGrid) qualGrid.style.display = 'none';
            if (epGrid) {
                epGrid.style.display = 'grid';
                epGrid.innerHTML = `<div class="loader">Loading Episodes...</div>`;
            }
            
            const id = State.currentMovieId;
            const s = State.currentSeason || 1;
            
            fetchEpisodes(id, s)
                .then(data => {
                    if (data.episodes) {
                        epGrid.innerHTML = data.episodes.map(ep => `
                            <button class="ep-btn" onclick="window.Downloads.startDownload('720p', ${ep.episode_number})" title="Download Episode ${ep.episode_number}">
                                ${ep.episode_number}
                            </button>
                        `).join('');
                    }
                })
                .catch(() => {
                    if (epGrid) epGrid.innerHTML = 'Error loading episodes.';
                });
        } else {
            if (epGrid) epGrid.style.display = 'none';
            if (qualGrid) {
                qualGrid.style.display = 'grid';
                qualGrid.innerHTML = `
                    <button class="dl-opt" onclick="window.Downloads.startDownload('1080p')">
                        <span>1080P+ <span class="badge">VIP</span></span>
                    </button>
                    <button class="dl-opt" onclick="window.Downloads.startDownload('720p')">
                        <span>720P</span>
                    </button>
                    <button class="dl-opt" onclick="window.Downloads.startDownload('540p')">
                        <span>540P</span>
                    </button>
                    <button class="dl-opt" onclick="window.Downloads.startDownload('360p')">
                        <span>360P</span>
                    </button>
                `;
            }
        }
    },

    // =============================================
    // CHECK AVAILABILITY (Silent Fail)
    // =============================================
    async checkAvailability(mediaId, type) {
        try {
            if (!mediaId) return;
            
            const response = await fetch(`${API_BASE_URL}/api/check-availability/${mediaId}/${type}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) return;
            const data = await response.json();
            
            const qualGrid = document.getElementById('quality-selection');
            if (qualGrid && data.available) {
                qualGrid.innerHTML = `
                    <button class="dl-opt" onclick="window.Downloads.startDownload('1080p')">
                        <span>1080P+ <span class="badge">${data.cached ? '⚡ Ready' : 'VIP'}</span></span>
                    </button>
                    <button class="dl-opt" onclick="window.Downloads.startDownload('720p')">
                        <span>720P ${data.cached ? '✅' : ''}</span>
                    </button>
                    <button class="dl-opt" onclick="window.Downloads.startDownload('540p')">
                        <span>540P</span>
                    </button>
                    <button class="dl-opt" onclick="window.Downloads.startDownload('360p')">
                        <span>360P</span>
                    </button>
                `;
            }
        } catch (error) {
            // Silent fail - use default options
            console.warn('Availability check skipped:', error.message);
        }
    },

    // =============================================
    // CLOSE DOWNLOAD MODAL
    // =============================================
    closeDownload() {
        const overlay = document.getElementById('download-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    // =============================================
    // START DOWNLOAD
    // =============================================
    async startDownload(quality, epNum = null) {
        const baseTitle = document.getElementById('modal-title')?.innerText || "Unknown Title";
        const poster = document.getElementById('modal-backdrop')?.src || "";
        const taskId = Date.now();
        const displayTitle = epNum ? `${baseTitle} - Episode ${epNum}` : `${baseTitle} (${quality})`;

        const task = {
            id: taskId,
            title: baseTitle,
            displayTitle: displayTitle,
            poster: poster,
            progress: 0,
            status: 'Initializing...',
            quality: quality,
            size: 'Calculating...',
            startTime: Date.now()
        };

        let downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
        downloads.unshift(task);
        localStorage.setItem('my_downloads', JSON.stringify(downloads));

        this.closeDownload();
        await this.performDownload(task, epNum);
    },

    // =============================================
    // PERFORM DOWNLOAD (with progress tracking)
    // =============================================
    async performDownload(task, epNum = null) {
        try {
            const mediaId = State.currentMovieId;
            const mediaType = State.currentType || 'movie';
            const title = encodeURIComponent(task.title);

            this.updateTask(task.id, 5, 'Preparing download...');

            // Build download URL based on type
            let downloadUrl;
            if (mediaType === 'tv' && epNum) {
                const season = State.currentSeason || 1;
                downloadUrl = `${API_BASE_URL}/api/download/tv/${mediaId}/${season}/${epNum}?quality=${task.quality}&title=${title}`;
            } else {
                downloadUrl = `${API_BASE_URL}/api/download/movie/${mediaId}?quality=${task.quality}&title=${title}`;
            }

            this.updateTask(task.id, 10, 'Starting download...');

            // Try to download via fetch first (better progress tracking)
            try {
                const response = await fetch(downloadUrl);
                if (!response.ok) throw new Error('Download failed');
                
                const contentLength = response.headers.get('content-length');
                const total = parseInt(contentLength, 10);
                let loaded = 0;
                
                const reader = response.body.getReader();
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    chunks.push(value);
                    loaded += value.length;
                    
                    // Update progress
                    const progress = total ? Math.round((loaded / total) * 100) : 0;
                    this.updateTask(task.id, Math.min(progress, 99), 'Downloading');
                    
                    // Update size
                    const sizeMB = (loaded / (1024 * 1024)).toFixed(1);
                    this.updateTaskSize(task.id, `${sizeMB}MB`);
                }
                
                // Create blob and download
                const blob = new Blob(chunks);
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${task.title.replace(/[^a-zA-Z0-9]/g, '_')}${epNum ? `_E${epNum}` : ''}.mp4`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                
                this.updateTask(task.id, 100, 'Completed');
                this.showNotification(`Download completed: ${task.displayTitle}`, 'success');
                
            } catch (fetchError) {
                // Fallback: Open in new tab
                console.log('Using fallback download method');
                window.open(downloadUrl, '_blank');
                this.simulateDownload(task);
                this.showNotification(`Started downloading: ${task.displayTitle}`, 'success');
            }

        } catch (error) {
            console.error('Download error:', error);
            this.updateTask(task.id, 0, 'Error');
            this.showNotification(`Download failed: ${error.message}`, 'error');
        }
    },

    // =============================================
    // SIMULATE DOWNLOAD (for fallback)
    // =============================================
    simulateDownload(task) {
        if (this.activeDownloads.has(task.id)) {
            clearInterval(this.activeDownloads.get(task.id));
            this.activeDownloads.delete(task.id);
        }

        let currentProgress = 0;
        const interval = setInterval(() => {
            const increment = Math.random() * 3 + (currentProgress < 30 ? 2 : 1);
            currentProgress = Math.min(currentProgress + increment, 99);
            
            this.updateTask(task.id, currentProgress, 'Downloading');

            const sizeMB = (currentProgress / 100 * (Math.random() * 400 + 200)).toFixed(1);
            this.updateTaskSize(task.id, `${sizeMB}MB`);

        }, 2000);

        this.activeDownloads.set(task.id, interval);
    },

    // =============================================
    // UPDATE TASK
    // =============================================
    updateTask(id, progress, status) {
        let downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
        const index = downloads.findIndex(d => d.id === id);
        
        if (index !== -1) {
            downloads[index].progress = Math.floor(Math.min(progress, 100));
            downloads[index].status = status;
            
            if (progress >= 100) {
                downloads[index].status = 'Completed';
                downloads[index].completedTime = Date.now();
                
                if (this.activeDownloads.has(id)) {
                    clearInterval(this.activeDownloads.get(id));
                    this.activeDownloads.delete(id);
                }
            }
            
            localStorage.setItem('my_downloads', JSON.stringify(downloads));
            this.renderDownloadList();
            this.updateDownloadCount();
            
            if (progress >= 100) {
                this.showNotification(`Download completed: ${downloads[index].displayTitle}`, 'success');
                this.syncStorage();
            }
        }
    },

    // =============================================
    // UPDATE TASK SIZE
    // =============================================
    updateTaskSize(id, size) {
        let downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
        const index = downloads.findIndex(d => d.id === id);
        if (index !== -1) {
            downloads[index].size = size;
            localStorage.setItem('my_downloads', JSON.stringify(downloads));
            this.renderDownloadList();
        }
    },

    // =============================================
    // UPDATE DOWNLOAD COUNT
    // =============================================
    updateDownloadCount() {
        const downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
        const active = downloads.filter(d => d.status === 'Downloading' || d.status === 'Initializing...' || d.status === 'Preparing download...').length;
        
        const countElement = document.getElementById('dl-count');
        if (countElement) {
            countElement.textContent = active;
        }
    },

    // =============================================
    // RENDER DOWNLOAD LIST
    // =============================================
    renderDownloadList() {
        const listContainer = document.getElementById('download-list');
        if (!listContainer) return;
        
        const downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
        
        if (downloads.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded" style="font-size: 48px; color: #666;">download</span>
                    <p>No active or completed downloads.</p>
                    <p style="font-size: 14px; color: #666;">Start downloading from the player modal.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = downloads.map(item => {
            const progressColor = item.status === 'Completed' ? '#4CAF50' : 
                                 item.status === 'Error' ? '#ff4444' : '#977dff';
            
            const statusIcon = item.status === 'Completed' ? '✅' : 
                              item.status === 'Error' ? '❌' : 
                              item.status === 'Downloading' ? '⬇️' : '⏳';
            
            const timeAgo = item.startTime ? this.timeAgo(item.startTime) : '';
            
            return `
            <div class="dl-item">
                <div class="dl-poster-wrapper">
                    <img src="${item.poster || ''}" class="dl-poster" alt="${item.title}" onerror="this.style.display='none'">
                </div>
                <div class="dl-info">
                    <h4>${statusIcon} ${item.displayTitle}</h4>
                    <p style="color: ${progressColor}; font-size: 14px;">
                        ${item.status === 'Completed' ? '✓ Complete' : 
                         item.status === 'Error' ? '✗ Failed' : 
                         `${Math.floor(item.progress)}%`}
                        ${timeAgo ? ` • ${timeAgo}` : ''}
                    </p>
                    <div class="dl-progress-container">
                        <div class="dl-progress-bar" style="width: ${Math.min(item.progress, 100)}%; background: ${progressColor};"></div>
                    </div>
                    <div class="dl-meta">
                        <span>${item.size || 'Unknown size'}</span>
                        <span>${item.quality || 'Standard'}</span>
                        <span>${item.status}</span>
                    </div>
                </div>
                ${item.status === 'Completed' ? `
                    <button class="dl-delete-btn" onclick="window.Downloads.deleteDownload(${item.id})" title="Remove from list">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                ` : ''}
            </div>`;
        }).join('');
    },

    // =============================================
    // DELETE DOWNLOAD
    // =============================================
    deleteDownload(id) {
        let downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
        downloads = downloads.filter(d => d.id !== id);
        localStorage.setItem('my_downloads', JSON.stringify(downloads));
        this.renderDownloadList();
        this.updateDownloadCount();
    },

    // =============================================
    // CLEAR COMPLETED DOWNLOADS
    // =============================================
    clearCompletedDownloads() {
        let downloads = JSON.parse(localStorage.getItem('my_downloads')) || [];
        downloads = downloads.filter(d => d.status !== 'Completed');
        localStorage.setItem('my_downloads', JSON.stringify(downloads));
        this.renderDownloadList();
        this.updateDownloadCount();
    },

    // =============================================
    // TIME AGO HELPER
    // =============================================
    timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    },

    // =============================================
    // SHOW NOTIFICATION
    // =============================================
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        const icon = type === 'success' ? 'check_circle' : 
                    type === 'error' ? 'error' : 'info';
        notification.innerHTML = `
            <span class="material-symbols-rounded">${icon}</span>
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
    },

    // =============================================
    // SYNC STORAGE
    // =============================================
    async syncStorage() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const usedGB = (estimate.usage / (1024 ** 3)).toFixed(2);
            const totalGB = 53.70;
            const remainingGB = (totalGB - usedGB).toFixed(2);

            const storageText = document.querySelector('.storage-bar span:first-child');
            const remainingText = document.querySelector('.green-text');

            if (storageText) storageText.innerHTML = `<span class="dot purple"></span> Internal storage ${totalGB}GB`;
            if (remainingText) remainingText.innerHTML = `<span class="dot green"></span> ${remainingGB}GB remaining`;
        }
    }
};

// =============================================
// EXPORTS
// =============================================
export const renderDownloadList = Downloads.renderDownloadList.bind(Downloads);
export const syncStorage = Downloads.syncStorage.bind(Downloads);
export const openDownload = Downloads.openDownload.bind(Downloads);
export const closeDownload = Downloads.closeDownload.bind(Downloads);
export const startDownload = Downloads.startDownload.bind(Downloads);
export const deleteDownload = Downloads.deleteDownload.bind(Downloads);
export const clearCompletedDownloads = Downloads.clearCompletedDownloads.bind(Downloads);

// =============================================
// GLOBAL FUNCTIONS
// =============================================
window.showDownloadPage = function() {
    window.location.href = '/html/download.html';
};

window.Downloads = Downloads;

// =============================================
// INITIALIZE
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    Downloads.updateDownloadCount();
    Downloads.syncStorage();
});