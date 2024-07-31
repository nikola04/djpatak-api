const PLAYLIST_NAME_REGEX = /^[a-zA-Z\s]+$/
export const isValidPlaylistName = (name: string|null) => {
    if(!name) return false
    name = name.trim()
    if(name.length < 2 || name.length > 24) return false
    if(!name.match(PLAYLIST_NAME_REGEX)) return false
    return true
}