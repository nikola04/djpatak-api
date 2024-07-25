export type Repeat = 'track'|'queue'|'off'

interface VolumeTransformer{
    setVolume: (volume: number) => void
}

export interface VolumeI{
    setVolume: (vol: number) => void,
    getVolume: () => number,
    setVolumeResource: (func: VolumeTransformer|null) => void,
}

export interface PlayerPrefrences {
    repeat: Repeat,
    volume: VolumeI
}