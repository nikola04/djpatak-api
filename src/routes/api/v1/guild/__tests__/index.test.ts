import app from "@/app"
import request from "supertest"
import { NextFunction, Request, Response } from "express";

jest.mock('@/server', () => ({
    botClient: {
        guilds: {
            cache: new Map()
        }
    },
    redisClient: null
}));
jest.mock('@/middlewares/ratelimit', () => ({
    ratelimit: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),  // Mock the ratelimit middleware as a simple passthrough
}));
jest.mock('@/middlewares/authenticate', () => ({
    authenticate: jest.fn(() => (req: Request, _res: Response, next: NextFunction) => {
        req.userId = "valid_user_id"
        next()
    })
}));


describe('GET /guild/:guildId/roles', () => {
    // const validRole = {
    //     id: "valid_role_id",
    //     name: "foo",
    //     unicodeEmoji: null,
    //     color: 0,
    //     permissions: "0",
    //     rawPosition: 0
    // }
    afterEach(() => {
        jest.clearAllMocks()
    })
    it("should return 404 if guild is not found", async () => {
        const response = await request(app).get('/api/v1/guild/invalid_guild/roles')
        expect(response.status).toBe(404)
        expect(response.body.error).toBe("Guild not found or bot not in guild")
    })
    // it('should return 500 if fetch rejects', async () => {
    //     const guildMock = {
    //         roles: {
    //             cache: {
    //                 size: 0,
    //             },
    //             fetch: jest.fn().mockRejectedValue(null) // Simulate fetching roles
    //         }
    //     };
    //     (botClient.guilds.cache.get as jest.Mock).mockReturnValue(guildMock);   
    //     const response = await request(app).get('/api/v1/guild/invalid_guild/roles')
        
    //     expect(guildMock.roles.fetch).toHaveBeenCalled();
    //     expect(response.status).toBe(500)
    //     expect(response.body.error).toBe(500)
    // });
    // it("should return 200 and valid role if success", async () => {
    //     const response = await request(app).get('/api/v1/guild/valid_guild_id/roles')
    //     expect(response.status).toBe(200)
    //     expect(response.body.roles).toMatchObject([{
    //         id: validRole.id,
    //         name: validRole.name,
    //         unicodeEmoji: validRole.unicodeEmoji,
    //         color: validRole.color,
    //         permissions: validRole.permissions,
    //         rawPosition: validRole.rawPosition
    //     }])
    // })
})