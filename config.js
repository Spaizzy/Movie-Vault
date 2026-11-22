// Configuration & Constants
export const API_KEY = '37ed5f0c3db3856d304dac2e3ac30749';
export const BASE_URL = 'https://api.themoviedb.org/3';
export const IMG_URL = 'https://image.tmdb.org/t/p/w500';
export const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

export const MAPS = {
    genres: {
        "TV Series": "tv", "Movie": "movie", "Anime": 16, "Documentary": 99,
        "Shorts": 18, "Variety Show": 10764, "Talk Show": 10767, "Short Drama": 18,
        "Action": 28, "Adventure": 12, "Comedy": 35, "Drama": 18,
        "Fantasy": 14, "Horror": 27, "Mystery": 9648, "Romance": 10749,
        "Sci-Fi": 878, "Thriller": 53
    },
    regions: { "USA": "US", "UK": "GB", "China": "CN", "Japan": "JP", "France": "FR", "Korea": "KR" },
    sort: { "Popularity": "popularity.desc", "Recent": "primary_release_date.desc", "High Rating": "vote_average.desc" }
};

export const CATEGORY_MAP = {
    "All": "",
    "Hollywood": "with_origin_country=US",
    "Nollywood": "with_origin_country=NG",
    "Bollywood": "with_origin_country=IN",
    "K-Drama": "with_origin_country=KR",
    "Anime": "with_genres=16",
    "TV series": "type=tv",
    "Western TV": "type=tv&with_origin_country=US"
};