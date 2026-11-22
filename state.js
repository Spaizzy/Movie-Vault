// Application State
import { API_KEY, BASE_URL, MAPS } from './config.js';

export const State = {
    currentPage: 1,
    totalPages: 1,
    isLoading: false,
    autoPlayInterval: null,
    currentMovieId: null,
    currentType: 'tv',
    currentSeason: 1,
    currentEpisode: 1,
    currentServer: 'debrid',
    currentVersion: 'sub',
    playerInstance: null,
    searchDebounceTimer: null,
    currentSort: 'popularity.desc'
};

export function resetState() {
    State.currentPage = 1;
    State.totalPages = 1;
    State.isLoading = false;
}

export function updateState(newState) {
    Object.assign(State, newState);
}