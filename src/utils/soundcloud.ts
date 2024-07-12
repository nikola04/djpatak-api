import { SoundcloudTrack } from "../types/soundcloud";

interface SearchOptions{
    limit?: number,
    genre?: string
}
/**
 * 
 * @param query Search query: keywords, name, or author of the track
 * @param options Optionally provide additional informations. limit -> Number of results (If limit is set to 1, function will return object instead of array). genre -> Genre of tracks for more precise search. 
 * @returns Array of SoundcloudTrack objects or SoundcloudTrack object if limit is set to 1
 */
async function search(soundcloudId: string, query: string, options?: SearchOptions): Promise<SoundcloudTrack[]|null>{
        if(soundcloudId == null) return null;
        const url = new URL("https://api-v2.soundcloud.com/search/tracks");
        url.searchParams.set('q', query);
        url.searchParams.set('client_id', soundcloudId);
        url.searchParams.set('limit', String(options?.limit || 10));
        if(options?.genre != null) url.searchParams.set('genre', options.genre);
        const result = await fetch(url, { method: 'GET' }).then(res => res.json()).catch(err => err);
        if(result instanceof Error || result?.total_results < 1) return null;
        const tracks: SoundcloudTrack[] = [];
        result?.collection?.forEach((track: any) => {
            const sc_track: SoundcloudTrack = track;
            tracks.push(sc_track);
        })
        return tracks;
    }

/**
 * A bit of hacking to retrieve generated client id from soundcloud
 * @returns Soundcloud client id
 */
async function getSoundcloudId(): Promise<string|null> {
    const res = await fetch('https://soundcloud.com', { method: 'GET', cache: 'no-cache' }).then((res) => res.text()).catch(err => err);
    if (res instanceof Error) throw new Error("Failed to get response from soundcloud.com: " + res.message);
    const splitted : string[] = res.split('<script crossorigin src="');
    const links : string[]= [];
    splitted.forEach((s: string) => {
        s.startsWith("https") && links.push(s.split('"')[0]);
    })
    const js_file = await fetch(links[links.length-1], { method: 'GET', cache: 'no-cache'}).then(res => res.text()).catch(err => err)
    if (js_file instanceof Error) throw new Error("Failed to get response from soundcloud.com while getting id: " + res.message);
    return js_file.split(',client_id:"')[1].split('"')[0] || null;
}

const SoundCloud = {
    search,
    getSoundcloudId
}
export default SoundCloud