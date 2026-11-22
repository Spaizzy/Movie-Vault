// Modal & Details View
import { State } from './state.js';
import { API_KEY, BASE_URL, IMG_URL } from './config.js';
import { fetchMovieDetails, fetchEpisodes, fetchCast } from './api.js';
import { getBackdropUrl } from './utils.js';
import { Player } from './player.js';

export async function openDetails(id, type, savedS = 1, savedE = 1) {
    const modal = document.getElementById('movie-modal');
    const container = document.getElementById('video-container');
    const tvControls = document.getElementById('tv-controls');
    const genreGrid = document.getElementById('modal-genres');
    
    if (!modal) return;
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
    modal.scrollTop = 0;

    State.currentMovieId = id;
    State.currentType = type;
    State.currentSeason = parseInt(savedS);
    State.currentEpisode = parseInt(savedE);

    try {
        const data = await fetchMovieDetails(id, type);

        State.isAnime = data.genres.some(g => g.name === 'Animation' || g.name === 'Anime');
        
        const realTitle = data.title || data.name;
        const realPoster = data.poster_path ? `https://image.tmdb.org/t/p/w185${data.poster_path}` : '';

        // Add to history with proper object
        Player.addToHistory({
            id: id,
            type: type,
            title: realTitle,
            poster: realPoster,
            season: parseInt(savedS),
            episode: parseInt(savedE)
        });

       // Player.renderServerSwitcher(id, type);

        document.getElementById('modal-title').innerText = realTitle;
        document.getElementById('modal-year').innerText = (data.release_date || data.first_air_date || '').split('-')[0];
        document.getElementById('modal-vote').innerText = data.vote_average.toFixed(1);
        document.getElementById('modal-desc').innerText = data.overview;
        if (genreGrid) genreGrid.innerHTML = data.genres ? data.genres.map(g => `<span class="genre-pill">${g.name}</span>`).join('') : '';

        // My List toggle with improved logic
        const myList = JSON.parse(localStorage.getItem('my_list')) || [];
        const isSaved = myList.some(m => m.id === id);
        const actionArea = document.querySelector('.modal-actions');
        
        if (actionArea) {
            actionArea.innerHTML = `
                <button id="my-list-btn" class="action-btn ${isSaved ? 'active' : ''}" onclick="window.toggleMyList(${id}, '${type}')">
                    <span class="material-symbols-rounded">${isSaved ? 'bookmark_added' : 'bookmark'}</span>
                    <span>${isSaved ? 'Saved' : 'Save'}</span>
                </button>
                <button class="action-btn download-btn" onclick="Player.openDownload()">
                    <span class="material-symbols-rounded">download</span>
                    <span>Download</span>
                </button>
            `;
        }

        const backdropPath = getBackdropUrl(data.backdrop_path);
        if (container) {
            container.innerHTML = `
                <div class="backdrop-wrapper" style="position:relative; width:100%; height:100%;">
                    <img id="modal-backdrop" src="${backdropPath}" alt="" style="width:100%; height:100%; object-fit:cover;">
                    <div class="backdrop-overlay"></div>
                    <button class="play-trigger-btn" onclick="Player.playVideo(${id}, '${type}')">
                        <span class="material-symbols-rounded" style="font-size: 48px;">play_arrow</span>
                    </button>
                </div>
            `;
        }

        if (type === 'tv' && tvControls) {
            tvControls.style.display = 'block';
            const seasonSelect = document.getElementById('season-select');
            
            if (seasonSelect) {
                seasonSelect.innerHTML = data.seasons
                    .filter(s => s.season_number > 0)
                    .map(s => `<option value="${s.season_number}" ${s.season_number == savedS ? 'selected' : ''}>${s.name}</option>`)
                    .join('');

                await loadEpisodes(id, savedS, savedE, false);
                
                seasonSelect.onchange = (e) => {
                    const selectedS = parseInt(e.target.value);
                    State.currentSeason = selectedS;
                    State.currentEpisode = 1;
                    loadEpisodes(id, selectedS, 1, true);
                };
            }
        } else if (tvControls) {
            tvControls.style.display = 'none';
        }

        // Cast loading with better error handling
        const castData = await fetchCast(id, type);
        const castGrid = document.getElementById('cast-grid');
        if (castGrid) {
            castGrid.innerHTML = castData.cast.slice(0, 10).map(actor => `
                <div class="cast-card">
                    <div class="cast-avatar">
                        <img src="${actor.profile_path ? 'https://image.tmdb.org/t/p/w185' + actor.profile_path : 'https://via.placeholder.com/185x278?text=No+Image'}" alt="${actor.name}" onerror="this.src='https://via.placeholder.com/185x278?text=No+Image'">
                    </div>
                    <p class="cast-name">${actor.name}</p>
                    <p class="cast-role">${actor.character}</p>
                </div>
            `).join('');
        }

        // Recommendations with fallback
        const recGrid = document.getElementById('recommendations-grid');
        if (recGrid) {
            const recommendations = data.recommendations?.results || [];
            if (recommendations.length > 0) {
                recGrid.innerHTML = recommendations.slice(0, 16).map(item => `
                    <div class="rec-item" onclick="openDetails(${item.id}, '${item.media_type || type}', 1, 1)">
                        <img src="${item.poster_path ? 'https://image.tmdb.org/t/p/w342' + item.poster_path : 'https://via.placeholder.com/342x513?text=No+Image'}" alt="${item.title || item.name}" onerror="this.src='https://via.placeholder.com/342x513?text=No+Image'">
                        <div class="rec-info"><p>${item.title || item.name}</p></div>
                    </div>
                `).join('');
            } else {
                recGrid.innerHTML = `<p class="no-results">No recommendations available</p>`;
            }
        }

    } catch (error) {
        console.error("Error populating modal:", error);
        // Show error message in modal
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <span class="material-symbols-rounded">error</span>
            <p>Failed to load content. Please try again.</p>
        `;
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.prepend(errorDiv);
        }
    }
}

export async function loadEpisodes(tvId, seasonNumber, selectedEpisode = 1, shouldPlay = false) {
    const episodeSelect = document.getElementById('episode-select');
    if (!episodeSelect) return;
    
    try {
        const data = await fetchEpisodes(tvId, seasonNumber);

        State.currentSeason = parseInt(seasonNumber);
        State.currentEpisode = parseInt(selectedEpisode);

        episodeSelect.innerHTML = data.episodes.map(ep => 
            `<option value="${ep.episode_number}" ${ep.episode_number == selectedEpisode ? 'selected' : ''}>
                Ep ${ep.episode_number}: ${ep.name}
            </option>`
        ).join('');

        // Update history when episode changes
        if (shouldPlay) {
            const realTitle = document.getElementById('modal-title')?.innerText || 'Unknown Title';
            const realPoster = document.getElementById('modal-backdrop')?.src || '';
            
            Player.addToHistory({
                id: tvId,
                type: 'tv',
                title: realTitle,
                poster: realPoster,
                season: parseInt(seasonNumber),
                episode: parseInt(selectedEpisode)
            });
            
            Player.playVideo(tvId, 'tv');
        }

        episodeSelect.onchange = (e) => {
            const newEp = parseInt(e.target.value);
            State.currentEpisode = newEp;
            
            // Update history for episode change
            const realTitle = document.getElementById('modal-title')?.innerText || 'Unknown Title';
            const realPoster = document.getElementById('modal-backdrop')?.src || '';
            
            Player.addToHistory({
                id: tvId,
                type: 'tv',
                title: realTitle,
                poster: realPoster,
                season: parseInt(seasonNumber),
                episode: newEp
            });
            
            Player.playVideo(tvId, 'tv');
        };
        
    } catch (err) {
        console.error("Error loading episodes:", err);
        episodeSelect.innerHTML = `<option value="">Error loading episodes</option>`;
    }
}

export function closeModal() {
    const modal = document.getElementById('movie-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    
    if (State.playerInstance) {
        State.playerInstance.destroy();
        State.playerInstance = null;
    }
    
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) {
        // Don't completely clear the container to avoid flash
        const backdrop = videoContainer.querySelector('#modal-backdrop');
        if (backdrop) {
            // Keep backdrop but remove video player
            const video = videoContainer.querySelector('video');
            if (video) {
                video.remove();
            }
            const playBtn = videoContainer.querySelector('.play-trigger-btn');
            if (playBtn) {
                playBtn.style.display = 'block';
            }
        }
    }
    
    // Clear any error messages
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(el => el.remove());
}

// --- Toggle My List Function ---
window.toggleMyList = async function(id, type) {
    try {
        if (!id) {
            showNotification('No content to save', 'error');
            return;
        }
        
        let myList = JSON.parse(localStorage.getItem('my_list')) || [];
        const index = myList.findIndex(item => item.id === id);
        const btn = document.getElementById('my-list-btn');
        
        if (index === -1) {
            // Add to list
            const data = await fetchMovieDetails(id, type);
            myList.push({
                id: id,
                type: type,
                title: data.title || data.name || 'Unknown Title',
                poster: data.poster_path || '',
                backdrop: data.backdrop_path || '',
                addedAt: Date.now()
            });
            localStorage.setItem('my_list', JSON.stringify(myList));
            
            if (btn) {
                btn.classList.add('active');
                btn.innerHTML = `
                    <span class="material-symbols-rounded">bookmark_added</span>
                    <span>Saved</span>
                `;
            }
            showNotification('Added to My List', 'success');
        } else {
            // Remove from list
            myList.splice(index, 1);
            localStorage.setItem('my_list', JSON.stringify(myList));
            
            if (btn) {
                btn.classList.remove('active');
                btn.innerHTML = `
                    <span class="material-symbols-rounded">bookmark</span>
                    <span>Save</span>
                `;
            }
            showNotification('Removed from My List', 'info');
        }
        
        window.dispatchEvent(new CustomEvent('myListUpdated'));
        
    } catch (error) {
        console.error('Error toggling my list:', error);
        showNotification('Failed to update list', 'error');
    }
};

// --- Notification Helper ---
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

// Make functions globally available
window.openDetails = openDetails;
window.closeModal = closeModal;
window.loadEpisodes = loadEpisodes;