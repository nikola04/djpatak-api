import { Router } from "express";
import discordCallback from './callbacks/discord'
import cookieParser from 'cookie-parser'
import Token from "../../models/token";
import generateAndSetTokens, { TokenVerifyResponse, verifyRefreshToken, verifyRefreshTokenJWT } from "../utils/token";
import { JwtPayload } from "jsonwebtoken";

// INIT
const router = Router()
router.use(cookieParser())

router.use('/login/callback/discord', discordCallback)

router.post('/token/refresh', async (req, res) => {
    const { refresh_token } = req.cookies
    if(!refresh_token) return res.cookie('access_token', '', { maxAge: -1 }).status(401).json({ status: 'error', error: 'No Refresh Token Provided' })
    const [tokenState, data] = verifyRefreshTokenJWT(refresh_token)
    if(tokenState != TokenVerifyResponse.VALID || !data) return res.cookie('access_token', '', { maxAge: -1 }).cookie('refresh_token', '', { maxAge: -1}).status(401).json({ status: 'error', error: 'Refresh Token Not Valid' })
    const { refreshToken, userId } = data as JwtPayload
    const token = await Token.findOne({ userId }).lean()
    if(!token) return res.cookie('access_token', '', { maxAge: -1 }).cookie('refresh_token', '', { maxAge: -1}).status(401).json({ status: 'error', error: 'Refresh Token Not Found' })
    if(!await verifyRefreshToken(refreshToken, token.refreshToken)) return res.cookie('access_token', '', { maxAge: -1 }).cookie('refresh_token', '', { maxAge: -1}).status(401).json({ status: 'error', error: 'Refresh Token Not Valid' })
    await generateAndSetTokens(res, userId)
    return res.json({ status: 'ok' })
})

export default router