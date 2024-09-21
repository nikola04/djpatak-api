import { Request, Response, NextFunction } from "express"
import { ratelimit, RateLimitSettings } from "../ratelimit"
import { redisClient } from "@/server"

jest.mock("@/server", () => ({
    redisClient: {
        incr: jest.fn(),
        pExpire: jest.fn(),
        pTTL: jest.fn()
    }
}))

describe("Middleware: ratelimit", () => {
    const ratelimitConfig: RateLimitSettings = { ratelimit: 1000, maxAttempts: 3 }
    const middleware = ratelimit(ratelimitConfig)
    let req: Partial<Request>, res: Partial<Response>, next: Partial<NextFunction>;
    beforeEach(() => {
        req = {
            userId: "valid_user_id"
        }
        res = {
            status: jest.fn().mockReturnThis(),
            sendStatus: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        }
        next = jest.fn()
    })
    afterEach(jest.clearAllMocks)
    it("should return 401 when userId is not provided", async () => {
        req.userId = undefined
        await middleware(req as Request, res as Response, next as NextFunction)
        expect(next).not.toHaveBeenCalled()
        expect(res.sendStatus).toHaveBeenCalledWith(401)
    })
    it("should return too many requests when limit is exceeded", async () => {
        jest.mocked(redisClient.incr).mockResolvedValue(ratelimitConfig.maxAttempts + 1)
        const ttl = 12; // biger than 0 but lower than ratelimitConfig.ratelimit
        jest.mocked(redisClient.pTTL).mockResolvedValue(ttl)
        await middleware(req as Request, res as Response, next as NextFunction)
        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(429)
        expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests', retry_after: ttl })
    })
    it("should return 500 when redis error occures", async () => {
        jest.mocked(redisClient.incr).mockRejectedValue(Error("Redis Error"))
        await middleware(req as Request, res as Response, next as NextFunction)
        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith({ error: 'API Ratelimit Error' })
    })
    it("should call next function when not ratelimitted", async () => {
        jest.mocked(redisClient.incr).mockResolvedValueOnce(ratelimitConfig.maxAttempts)
        await middleware(req as Request, res as Response, next as NextFunction)
        expect(next).toHaveBeenCalled()
    })
})