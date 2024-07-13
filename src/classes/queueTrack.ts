class SoundCloudUser {
    public id: number
    public username: string
    public permalink: string
    public thumbnail: string
    constructor(data: any){
        this.id = data.id
        this.username = data.username
        this.permalink = data.permalink
        this.thumbnail = data.thumbnail
    }
}

class Track{
    public id: number
    public title: string
    public permalink: string
    public thumbnail: string
    public duration: number
    public user: SoundCloudUser
    public formats: any[]
    constructor(data: any){
        this.id = data.id
        this.title = data.title
        this.permalink = data.permalink
        this.thumbnail = data.thumbnail
        this.duration = data.duration
        this.user = new SoundCloudUser(data.user)
        this.formats = data.formats
    }
}

class QueueTrack {
    public queueId: string
    public track: Track
    constructor(data: any){
        this.queueId = data.queueId
        this.track = new Track(data.track)
    }
    toString(){
        return JSON.stringify({ queueId: this.queueId, track: this.track })
    }
}

export {
    QueueTrack,
    Track,
    SoundCloudUser
}