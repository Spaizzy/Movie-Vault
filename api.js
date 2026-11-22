// API Calls
import { API_KEY, BASE_URL } from './config.js';

export async function fetchMovies(type = 'tv', page = 1, sort = 'popularity.desc') {
    const url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&sort_by=${sort}&page=${page}`;
    const response = await fetch(url);
    return response.json();
}

export async function fetchMovieDetails(id, type) {
    const url = `${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=credits,recommendations`;
    const response = await fetch(url);
    return response.json();
}

export async function fetchTrending() {
    const url = `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`;
    const response = await fetch(url);
    return response.json();
}

export async function fetchSearch(query) {
    const url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
    const response = await fetch(url);
    return response.json();
}

export async function fetchEpisodes(tvId, seasonNumber) {
    const url = `${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`;
    const response = await fetch(url);
    return response.json();
}

export async function fetchTvDetails(id) {
    const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}`;
    const response = await fetch(url);
    return response.json();
}

export async function fetchCast(id, type) {
    const url = `${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}`;
    const response = await fetch(url);
    return response.json();
}