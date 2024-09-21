import { TokenVerifyResponse, verifyAccessToken } from '@/utils/token'; // Mock this for authentication
import { NextFunction, Request, Response } from "express";
import { authenticate } from '../authenticate';

jest.mock('@/utils/token');

describe('Middleware: authenticate', () => {
    let req: Partial<Request>, res: Partial<Response>, next: Partial<NextFunction>;
    beforeAll(() => (verifyAccessToken as jest.Mock).mockImplementation((token: string) => {
        if (token === 'valid_token') {
            return [TokenVerifyResponse.VALID, { userId: 'valid_user_id' }];
        }else if (token === 'expired_token') {
            return [TokenVerifyResponse.EXPIRED, null];
        }else return [TokenVerifyResponse.INVALID, null];
    }))
    beforeEach(() => {
        req = {
            cookies: {},
            query: {},
        }
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        }
        next = jest.fn()
    })
    it('should return 401 if not valid csrf', async () => {
        req.cookies = { csrf_token: "csrf_valid_test" }
        req.query = { csrf: "csrf_invalid_test" }
        await authenticate()(req as Request, res as Response, next as NextFunction)
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ status: "error", error: "CSRF Token is not valid." })
    })
    it('should return 401 if access token is not provided', async () => {
        req.cookies = { csrf_token: "csrf_valid_test" }
        req.query = { csrf: "csrf_valid_test" }
        await authenticate()(req as Request, res as Response, next as NextFunction)
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ status: "error", error: "Authorization Token is not provided." })
    })
    it('should return 401 if unauthenticated', async () => {
        req.cookies = { csrf_token: "csrf_valid_test", access_token: "invalid_token" }
        req.query = { csrf: "csrf_valid_test" }
        await authenticate()(req as Request, res as Response, next as NextFunction)
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ status: "error", error: "Not logged In" })
    })
    it('should return 401 if expired', async () => {
        req.cookies = { csrf_token: "csrf_valid_test", access_token: "expired_token" }
        req.query = { csrf: "csrf_valid_test" }
        await authenticate()(req as Request, res as Response, next as NextFunction)
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ status: "error", error: "Token not refreshed" })
    })
    it('should return valid userId', async () => {
        req.cookies = { csrf_token: "csrf_valid_test", access_token: "valid_token" }
        req.query = { csrf: "csrf_valid_test" }
        await authenticate()(req as Request, res as Response, next as NextFunction)
        expect(res.status).not.toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
        expect(req.userId).toBe("valid_user_id")
    })
})