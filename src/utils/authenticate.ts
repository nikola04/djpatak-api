import { NextFunction, Request, Response } from "express";
import { TokenVerifyResponse, verifyAccessToken } from "./token";
import { JwtPayload } from "jsonwebtoken";

export const authenticate = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try{
            const { access_token, csrf_token } = req.cookies
            const { csrf } = req.query
            if(!csrf_token) return res.status(400).json({ status: 'error', error: 'CSRF Cookie is not provided.'})
            if(!csrf) return res.status(401).json({ status: 'error', error: 'CSRF Token is not provided.'})
            if(csrf_token != csrf) return res.status(401).json({ status: 'error', error: 'CSRF Token is not valid.'})
            if(!access_token) return res.status(401).json({ status: 'error', error: 'Authorization Token is not provided.'})
            const [verifyResponse, data] = verifyAccessToken(access_token)
            if(verifyResponse == TokenVerifyResponse.INVALID || !data) return res.status(401).json({ status: 'error', error: 'Not logged In' })
            if(verifyResponse == TokenVerifyResponse.EXPIRED) return res.status(401).json({ status: 'error', error: 'Token not refreshed' })
            const { userId } = data as JwtPayload
            req.userId = userId
            return next()
        }catch(err){
            console.error(err)
            return res.status(401).json({ status: 'error', error: 'Authorization Token is not valid.'})
        }
    }
}