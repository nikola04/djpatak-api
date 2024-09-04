/* eslint-disable @typescript-eslint/no-explicit-any */
import { so_validate } from "play-dl";
import { QueueTrack, SoundCloudUser, Track } from "types/queue";
import { DbTrack, TrackAuthor } from "types/track";

export const isSoundCloudUser = (obj: any): obj is SoundCloudUser => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "number" &&
    typeof obj.username === "string" &&
    typeof obj.permalink === "string" &&
    typeof obj.thumbnail === "string"
  );
};

export const isTrack = (obj: any): obj is Track => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.id === "number" &&
    typeof obj.title === "string" &&
    typeof obj.permalink === "string" &&
    typeof obj.thumbnail === "string" &&
    typeof obj.duration === "number" &&
    isSoundCloudUser(obj.user) &&
    Array.isArray(obj.formats)
  );
};

export const isQueueTrack = (obj: any): obj is QueueTrack => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.queueId === "string" &&
    isDbTrack(obj)
  );
};

export const isDbTrack = (obj: any): obj is DbTrack => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.providerId === "string" &&
    typeof obj.providerTrackId === "string" &&
    typeof obj.data === "object" &&
    obj.data !== null &&
    typeof obj.data.title === "string" &&
    typeof obj.data.permalink === "string" &&
    typeof obj.data.durationInSec === "number" &&
    obj.authors !== null &&
    Array.isArray(obj.authors) &&
    obj.authors.every(isTrackAuthor)
  );
};

export const isTrackAuthor = (obj: any): obj is TrackAuthor => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.username === "string" &&
    typeof obj.permalink === "string"
  );
};

export async function validateTrackId(id: string): Promise<boolean> {
  return (await so_validate(id)) == "track";
}
