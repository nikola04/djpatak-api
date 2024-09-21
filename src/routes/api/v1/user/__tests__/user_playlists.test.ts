import app from "@/app"
import PlaylistModel from "@/models/playlist.model";
import { isValidPlaylistDescription, isValidPlaylistName } from "@/validators/playlist";
import { Request, Response, NextFunction } from "express"
import request from 'supertest'

jest.mock('@/server', () => ({
    botClient: null,
    redisClient: null
}));
jest.mock("@/models/playlist.model")
jest.mock("@/models/playlistTracks.model")
jest.mock("../playlists/tracks")
jest.mock("@/validators/playlist")
jest.mock('@/middlewares/ratelimit', () => ({
    ratelimit: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),  // Mock the ratelimit middleware as a simple passthrough
}));
jest.mock('@/middlewares/authenticate', () => ({
    authenticate: jest.fn(() => (req: Request, _res: Response, next: NextFunction) => {
        req.userId = "valid_user_id"
        next()
    })
}));

const validObjectId = "551137c2f9e1fac808a5f572"
const mockPlaylist = {
    ownerUserId: "valid_user_id",
    name: "foo",
    description: "bar",
}
const mockPlaylistRequest = (method: 'post' | 'patch', id?: string) => {
    return request(app)[method](`/api/v1/users/me/playlists${id ? `/${id}` : ''}`).send({
        name: " " + mockPlaylist.name + "  ",
        description: mockPlaylist.description
    }).set('Content-Type', 'application/json').set('Accept', 'application/json');
};

beforeEach(() => {
    jest.mocked(isValidPlaylistName).mockImplementation(() => true)
    jest.mocked(isValidPlaylistDescription).mockImplementation(() => true)
    jest.mocked(PlaylistModel.findOne).mockResolvedValue(null)
})

const spyOnFindWithLean = (method: 'find'|'findOne'|'findOneAndUpdate', type: 'mockResolvedValue'|'mockRejectedValue',value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(PlaylistModel, method).mockReturnValue({ lean: jest.fn()[type](value)} as any)
}

describe("POST /users/me/playlists", () => {
    it("should return 400 when name is not valid", async () => {
        jest.mocked(isValidPlaylistName).mockImplementation(() => false)
        const response = await mockPlaylistRequest('post')
        expect(response.status).toBe(400)
    })
    it("should return 400 when description is not valid", async () => {
        jest.mocked(isValidPlaylistDescription).mockImplementation(() => false)
        const response = await mockPlaylistRequest('post')
        expect(response.status).toBe(400)
    })
    it("should return 409 when playlist already exists", async () => {
        jest.mocked(PlaylistModel.findOne).mockResolvedValue(true)
        const response = await mockPlaylistRequest('post')
        expect(response.status).toBe(409)
    })
    it("should return 500 when database error", async () => {
        jest.mocked(PlaylistModel.findOne).mockRejectedValue(new Error("Database Error"))
        const response = await mockPlaylistRequest('post')
        expect(response.status).toBe(500)
    })
    it("should return 200 and created playlist when successfully created", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.mocked(PlaylistModel.create).mockImplementation(async (obj: any) => obj)
        const response = await mockPlaylistRequest('post')
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({ playlist: mockPlaylist })
    })
})

describe("GET /users/me/playlists", () => {
    it("should return 500 when database error", async () => {
        spyOnFindWithLean('find', 'mockRejectedValue', new Error("Database Error"))
        const response = await request(app).get("/api/v1/users/me/playlists/")
        expect(response.status).toBe(500)
    })
    it("should return playlists array", async () => {
        spyOnFindWithLean('find', 'mockResolvedValue', [mockPlaylist])
        const response = await request(app).get("/api/v1/users/me/playlists/")
        expect(response.status).toBe(200)
        expect(response.body.playlists).toMatchObject([mockPlaylist])
    })
})

describe("GET /users/me/playlists/:id", () => {
    it("should return 400 when invalid playlistId", async () => {
        const response = await request(app).get("/api/v1/users/me/playlists/invalid_id")
        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Playlist ID is Not Valid')
    })
    it("should return 404 when playlist not found", async () => {
        spyOnFindWithLean('findOne', 'mockResolvedValue', null)
        const response = await request(app).get(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(404)
        expect(response.body.error).toBe('Playlist is not found')
        expect(response.body.playlist).toBe(null)
    })
    it("should return 403 when not playlist owner", async () => {
        spyOnFindWithLean('findOne', 'mockResolvedValue', {...mockPlaylist, ownerUserId: "other_user_id" })
        const response = await request(app).get(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(403)
        expect(response.body.error).toBe('You are not a playlist owner')
        expect(response.body.playlist).toBe(null)
    })
    it("should return 500 when database error", async () => {
        spyOnFindWithLean('findOne', 'mockRejectedValue', new Error("Database Error"))
        const response = await request(app).get(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(500)
    })
    it("should return 200 and playlist when successfull", async () => {
        spyOnFindWithLean('findOne', 'mockResolvedValue', ({ ...mockPlaylist }))
        const response = await request(app).get(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(200)
        expect(response.body.playlist).toMatchObject(mockPlaylist)
    })
})

describe("PATCH /users/me/playlists/:id", () => {
    it("should return 400 when invalid playlistId", async () => {
        const response = await mockPlaylistRequest('patch', 'invalid_object_id')
        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Playlist ID is Not Valid')
    })
    it("should return 400 when name is not valid", async () => {
        jest.mocked(isValidPlaylistName).mockImplementation(() => false)
        const response = await mockPlaylistRequest('patch', validObjectId)
        expect(response.status).toBe(400)
    })
    it("should return 400 when description is not valid", async () => {
        jest.mocked(isValidPlaylistDescription).mockImplementation(() => false)
        const response = await mockPlaylistRequest('patch', validObjectId)
        expect(response.status).toBe(400)
    })
    it("should return 404 when playlist is not found", async () => {
        spyOnFindWithLean('findOneAndUpdate', 'mockResolvedValue', null)
        const response = await mockPlaylistRequest('patch', validObjectId)
        expect(response.status).toBe(404)
        expect(response.body.error).toBe("Playlist is Not Found")
    })
    it("should return 500 when database error", async () => {
        spyOnFindWithLean('findOneAndUpdate', 'mockRejectedValue', new Error("Database Error"))
        const response = await mockPlaylistRequest('patch', validObjectId)
        expect(response.status).toBe(500)
    })
    it("should return 200 and valid playlist when successfull", async () => {
        jest.spyOn(PlaylistModel, 'findOneAndUpdate').mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockPlaylist)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        const response = await mockPlaylistRequest('patch', validObjectId)
        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({ playlist: mockPlaylist })
    })
})

describe("DELETE /users/me/playlists/:id", () => {
    it("should return 400 when invalid playlistId", async () => {
        const response = await request(app).delete("/api/v1/users/me/playlists/invalid_id")
        expect(response.status).toBe(400)
        expect(response.body.error).toBe('Playlist ID is Not Valid')
    })
    it("should return 404 when playlist not found", async () => {
        spyOnFindWithLean('findOne', 'mockResolvedValue', null)
        const response = await request(app).delete(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(404)
        expect(response.body.error).toBe('Playlist is not found')
        expect(response.body.playlist).toBe(null)
    })
    it("should return 403 when not playlist owner", async () => {
        spyOnFindWithLean('findOne', 'mockResolvedValue', ({ ...mockPlaylist, ownerUserId: "other_user_id" }))
        const response = await request(app).delete(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(403)
        expect(response.body.error).toBe('You are not a playlist owner')
        expect(response.body.playlist).toBe(null)
    })
    it("should return 500 when database error", async () => {
        spyOnFindWithLean('findOne', 'mockRejectedValue', new Error("Database Error"))
        const response = await request(app).delete(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(500)
    })
    it("should return 200 and playlist when successfull", async () => {
        spyOnFindWithLean('findOne', 'mockResolvedValue', ({ ...mockPlaylist }))
        const response = await request(app).delete(`/api/v1/users/me/playlists/${validObjectId}`)
        expect(response.status).toBe(200)
    })
})
