import jwt, { JsonWebTokenError, JwtPayload } from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import fs from 'fs'
import path from 'path'
import Token from '../../models/token'
import { Response } from 'express'
const privateKey = fs.readFileSync(path.join('keys', 'jwt.key'), 'utf8')
const publicKey = fs.readFileSync(path.join('keys', 'jwt.key.pub'), 'utf8')

export enum TokenVerifyResponse{
    VALID,
    INVALID,
    EXPIRED,
}

function generateAccessTokenJWT(userId: string){
    try{
        return jwt.sign({ userId }, privateKey, {
            expiresIn: 10 * 60, // 10 minutes
            algorithm: 'RS256'
        })
    }catch(err){
        throw err
    }
}
function verifyAccessToken(jwtToken: string): [TokenVerifyResponse, JwtPayload|string|null] {
    try{
        const data = jwt.verify(jwtToken, publicKey, { algorithms: ['RS256'] });
        return [TokenVerifyResponse.VALID, data]
    }catch(err){
        if(err instanceof JsonWebTokenError && err.name == "TokenExpiredError") return [TokenVerifyResponse.EXPIRED, null]
        return [TokenVerifyResponse.INVALID, null]
    }
}

async function generateRefreshToken(){
    const refreshToken = crypto.randomBytes(64).toString('hex')
    return ({ hashedRefreshToken: await bcrypt.hash(refreshToken, 10), refreshToken })
}
function generateRefreshTokenJWT(token: string, userId: string){
    try{
        return jwt.sign({ userId, refreshToken: token }, privateKey, {
            expiresIn: 15811200000, // 10 minutes
            algorithm: 'RS256'
        })
    }catch(err){
        throw err
    }
}

function verifyRefreshTokenJWT(jwtToken: string): [TokenVerifyResponse, JwtPayload|string|null]{
    try{
        const data = jwt.verify(jwtToken, publicKey, { algorithms: ['RS256'] });
        return [TokenVerifyResponse.VALID, data]
    }catch(err){
        if(err instanceof JsonWebTokenError && err.name == "TokenExpiredError") return [TokenVerifyResponse.EXPIRED, null]
        return [TokenVerifyResponse.INVALID, null]
    }
}

async function verifyRefreshToken(token: string, hashedToken: string) {
    console.log(token, hashedToken)
    return await bcrypt.compare(token, hashedToken);
}

function generateCSRF(){
    return crypto.randomBytes(64).toString('hex')
}

export default async function generateAndSetTokens(res: Response, userId: string) {
    const accessToken = generateAccessTokenJWT(userId)
    const { refreshToken, hashedRefreshToken } = await generateRefreshToken()
    const refreshTokenJWT = generateRefreshTokenJWT(refreshToken, userId)
    const csrfToken = generateCSRF()
    await Token.updateOne({ userId }, {
        userId: userId,
        refreshToken: hashedRefreshToken
    }, { upsert: true })
    const cookieExpiry = 15811200_000 // 6 months
    res.cookie('access_token', accessToken, { 
        httpOnly: true,
        secure: true,
        domain: process.env.APP_DOMAIN!,
        sameSite: 'strict',
        maxAge: cookieExpiry
    }).cookie('refresh_token', refreshTokenJWT, {
        httpOnly: true,
        secure: true,
        domain: process.env.APP_DOMAIN!,
        sameSite: 'strict',
        maxAge: cookieExpiry
    }).cookie('csrf_token', csrfToken, { 
        httpOnly: false,
        secure: true,
        domain: process.env.APP_DOMAIN!,
        sameSite: 'strict',
        maxAge: cookieExpiry
    })
    return ({ accessToken, refreshToken: refreshTokenJWT, csrfToken })
}

export {
    verifyAccessToken,
    verifyRefreshToken,
    verifyRefreshTokenJWT,
    generateCSRF
}