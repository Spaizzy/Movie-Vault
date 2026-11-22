// player.js
import { State } from './state.js';
import { Downloads } from './downloads.js';

export const Player = {
    currentServer: 'megacloud',
    currentSource: null,
    player: null,

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('movie-modal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        document.getElementById('season-select')?.addEventListener('change', (e) => {
            this.loadEpisode(parseInt(e.target.value));
        });

        document.getElementById('episode-select')?.addEventListener('change', (e) => {
            this.loadEpisode(State.currentSeason, parseInt(e.target.value));
        });
    },


    switchServer(serverId, id, type) {
        this.currentServer = serverId;
        this.renderServerSwitcher(id, type);
        
        if (type === 'tv') {
            this.playVideo(id, 'tv');
        } else {
            this.playVideo(id, 'movie');
        }
    },

    addToHistory(item) {
        try {
            let history = JSON.parse(localStorage.getItem('viewing_history')) || [];
            history = history.filter(h => !(h.id === item.id && h.type === item.type));
            history.unshift({ ...item, timestamp: Date.now() });
            if (history.length > 50) history = history.slice(0, 50);
            localStorage.setItem('viewing_history', JSON.stringify(history));
            window.dispatchEvent(new CustomEvent('historyUpdated'));
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    },

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('viewing_history')) || [];
        } catch (error) {
            console.error('Error getting history:', error);
            return [];
        }
    },

    clearHistory() {
        try {
            localStorage.removeItem('viewing_history');
            window.dispatchEvent(new CustomEvent('historyUpdated'));
            return true;
        } catch (error) {
            console.error('Error clearing history:', error);
            return false;
        }
    },

    removeFromHistory(id) {
        try {
            let history = JSON.parse(localStorage.getItem('viewing_history')) || [];
            history = history.filter(item => item.id !== id);
            localStorage.setItem('viewing_history', JSON.stringify(history));
            window.dispatchEvent(new CustomEvent('historyUpdated'));
            return true;
        } catch (error) {
            console.error('Error removing from history:', error);
            return false;
        }
    },

    openMovie(movieId, type = 'movie', season = null) {
        State.currentMovieId = movieId;
        State.currentType = type;
        State.currentSeason = season || 1;

        const modal = document.getElementById('movie-modal');
        modal.style.display = 'flex';

        this.loadMovieData(movieId, type);
    },

    async loadMovieData(movieId, type) {
    try {
        const response = await fetch(`/api/movie/${movieId}?type=${type}`);
        const data = await response.json();

        document.getElementById('modal-title').textContent = data.title;
        document.getElementById('modal-year').textContent = data.year;
        document.getElementById('modal-vote').textContent = data.vote_average?.toFixed(1) || 'N/A';
        document.getElementById('modal-desc').textContent = data.overview || 'No description available.';
        
        const backdrop = document.getElementById('modal-backdrop');
        if (data.backdrop_path) {
            backdrop.src = `https://image.tmdb.org/t/p/original${data.backdrop_path}`;
        }

        const genresContainer = document.getElementById('modal-genres');
        if (data.genres) {
            genresContainer.innerHTML = data.genres.map(g => 
                `<span class="genre-tag">${g.name}</span>`
            ).join('');
        }

        this.addToHistory({
            id: movieId,
            type: type,
            title: data.title,
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
            season: State.currentSeason || null,
            episode: null
        });

        // NO MORE SERVER SWITCHER - just load the single source
        if (type === 'tv') {
            document.getElementById('tv-controls').style.display = 'block';
            await this.loadSeasons(movieId);
        } else {
            document.getElementById('tv-controls').style.display = 'none';
            await this.loadMovieSource(movieId);
        }

        await this.loadCast(movieId, type);
        await this.loadRecommendations(movieId, type);

    } catch (error) {
        console.error('Error loading movie data:', error);
    }
},

    async loadSeasons(movieId) {
        try {
            const response = await fetch(`/api/tv/${movieId}/seasons`);
            const data = await response.json();
            
            const seasonSelect = document.getElementById('season-select');
            seasonSelect.innerHTML = data.seasons.map(s => 
                `<option value="${s.season_number}">Season ${s.season_number}</option>`
            ).join('');

            if (data.seasons.length > 0) {
                await this.loadEpisodes(movieId, data.seasons[0].season_number);
            }

        } catch (error) {
            console.error('Error loading seasons:', error);
        }
    },

    async loadEpisodes(movieId, season) {
        try {
            const response = await fetch(`/api/tv/${movieId}/season/${season}`);
            const data = await response.json();
            
            const episodeSelect = document.getElementById('episode-select');
            episodeSelect.innerHTML = data.episodes.map(ep => 
                `<option value="${ep.episode_number}">Episode ${ep.episode_number}</option>`
            ).join('');

            if (data.episodes.length > 0) {
                await this.loadEpisodeSource(movieId, season, data.episodes[0].episode_number);
            }

        } catch (error) {
            console.error('Error loading episodes:', error);
        }
    },

    async loadMovieSource(movieId) {
    const loadingDiv = document.getElementById('video-loading');
    if (loadingDiv) loadingDiv.style.display = 'block';

    try {
        const response = await fetch(`http://localhost:3000/api/get-stream?tmdbId=${movieId}&type=movie`);
        const data = await response.json();
        
        if (data.streamUrl) {
            this.loadVideo(data.streamUrl);
        } else {
            console.error('No stream found');
        }
    } catch (error) {
        console.error('Error loading movie source:', error);
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
},

async loadEpisodeSource(movieId, season, episode) {
    const loadingDiv = document.getElementById('video-loading');
    if (loadingDiv) loadingDiv.style.display = 'block';

    try {
        const response = await fetch(`http://localhost:3000/api/get-stream?tmdbId=${movieId}&type=tv&s=${season}&e=${episode}`);
        const data = await response.json();
        
        if (data.streamUrl) {
            this.loadVideo(data.streamUrl);
        } else {
            console.error('No stream found');
        }
    } catch (error) {
        console.error('Error loading episode source:', error);
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
},

    async playVideo(id, type) {
        try {
            const apiUrl = 'http://localhost:3000';
            let url;
            
            if (type === 'tv') {
                const season = State.currentSeason || 1;
                const episode = State.currentEpisode || 1;
                const response = await fetch(`${apiUrl}/api/get-stream?tmdbId=${id}&type=tv&s=${season}&e=${episode}`);
                if (!response.ok) throw new Error('Failed to get stream');
                const data = await response.json();
                url = data.streamUrl;
            } else {
                const response = await fetch(`${apiUrl}/api/get-stream?tmdbId=${id}&type=movie`);
                if (!response.ok) throw new Error('Failed to get stream');
                const data = await response.json();
                url = data.streamUrl;
            }

            if (url) {
                this.loadVideo(url);
            } else {
                console.warn('No stream URL received');
                this.showNotification('No stream available for this content', 'warning');
            }
        } catch (error) {
            console.error('Error playing video:', error);
            this.showNotification('Failed to load video. Please try again.', 'error');
        }
    },

    loadVideo(url) {
        const container = document.getElementById('video-container');
        
        const existingVideo = container.querySelector('video');
        if (existingVideo) {
            existingVideo.remove();
        }

        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.backgroundColor = '#000';

        const backdrop = container.querySelector('#modal-backdrop');
        if (backdrop) {
            backdrop.style.display = 'none';
        }

        container.insertBefore(video, container.querySelector('.backdrop-overlay'));
        
        if (window.Plyr) {
            this.player = new Plyr(video, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
                settings: ['quality', 'speed'],
                quality: { default: 720, options: [1080, 720, 540, 360] }
            });
        }
    },

    async loadCast(movieId, type) {
        try {
            const response = await fetch(`/api/${type}/${movieId}/credits`);
            const data = await response.json();
            
            const castGrid = document.getElementById('cast-grid');
            castGrid.innerHTML = data.cast.slice(0, 10).map(actor => `
                <div class="cast-item">
                    <img src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '/images/default-avatar.png'}" 
                         alt="${actor.name}" 
                         onerror="this.src='/images/default-avatar.png'">
                    <p class="cast-name">${actor.name}</p>
                    <p class="cast-character">${actor.character}</p>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading cast:', error);
        }
    },

    async loadRecommendations(movieId, type) {
        try {
            const response = await fetch(`/api/${type}/${movieId}/recommendations`);
            const data = await response.json();
            
            const recGrid = document.getElementById('recommendations-grid');
            recGrid.innerHTML = data.results.slice(0, 6).map(item => `
                <div class="rec-item" onclick="window.Player.openMovie(${item.id}, '${type}')">
                    <img src="${item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '/images/default-poster.png'}" 
                         alt="${item.title || item.name}"
                         onerror="this.src='/images/default-poster.png'">
                    <p class="rec-title">${item.title || item.name}</p>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    },

    openDownload() {
        if (!State.currentMovieId) {
            alert('No content selected for download.');
            return;
        }
        Downloads.openDownload();
    },

    closeDownload() {
        Downloads.closeDownload();
    },

    startDownload(quality) {
        Downloads.startDownload(quality);
    },

    closeModal() {
        const modal = document.getElementById('movie-modal');
        modal.style.display = 'none';
        
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        
        const container = document.getElementById('video-container');
        const video = container.querySelector('video');
        if (video) {
            video.remove();
        }
        
        const backdrop = container.querySelector('#modal-backdrop');
        if (backdrop) {
            backdrop.style.display = 'block';
        }
    },

    loadEpisode(season, episode) {
        const movieId = State.currentMovieId;
        if (season) State.currentSeason = season;
        
        const ep = episode || parseInt(document.getElementById('episode-select').value);
        this.loadEpisodeSource(movieId, State.currentSeason, ep);
    },

    showNotification(message, type = 'info') {
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
};

// Export for global use
window.Player = Player;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    Player.init();
});