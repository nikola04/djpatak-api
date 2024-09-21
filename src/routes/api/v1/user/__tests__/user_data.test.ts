import app from "@/app"
import request from "supertest"
import { NextFunction, Request, Response } from "express";
import User from '@/models/user.model'

jest.mock('@/utils/discord');
jest.mock("@/models/user.model")
jest.mock('@/server', () => ({
    botClient: {
        guilds: {
            cache: new Map(),  // Mock the botClient's guild cache
        },
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

describe('GET /users/me', () => {
    const mockedUser = {
        _id: "valid_user_id",
        name: "test_name",
        email: "test_email",
        image: "test_img"
    }
    it("should return 404 if user is not found", async () => {
        jest.mocked(User.findById).mockResolvedValue(null)
        const response = await request(app).get('/api/v1/users/me')
        expect(response.status).toBe(404)
        expect(response.body.error).toBe("User Not Found")
    })
    it("should return 500 on database rejection", async () => {
        jest.mocked(User.findById).mockRejectedValue(null)
        const response = await request(app).get('/api/v1/users/me')
        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Internal Server Error")
    })
    it("should return valid user object", async () => {
        jest.mocked(User.findById).mockResolvedValue(mockedUser)
        const response = await request(app).get('/api/v1/users/me')
        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({ id: mockedUser._id,name: mockedUser.name,email: mockedUser.email,image: mockedUser.image })
    })
})