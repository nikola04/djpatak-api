const PLAYLIST_NAME_REGEX = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\u00a9\u00ae\u2000-\u3300\ud83c\ud000-\udfff\ud83d\ud000-\udfff\ud83e\ud000-\udfff]+$/;
export const isValidPlaylistName = (name: string | null) => {
    if (!name) return false;
    name = name.trim();
    if (name.length < 2 || name.length > 24) return false;
    if (!name.match(PLAYLIST_NAME_REGEX)) return false;
    return true;
};

export const isValidPlaylistDescription = (description: string|null) => {
    if(description != null && description.trim().length > 100) return false // it can be null
    return true
}