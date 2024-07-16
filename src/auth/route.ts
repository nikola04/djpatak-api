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
    let isFromHeader = false
    let { refresh_token } = req.cookies
    if(!refresh_token) {
        const split = req.headers.authorization ? req.headers.authorization.split('Bearer ') : null
        if(split && split.length == 2){
            refresh_token = split[1]
            isFromHeader = true
        }
    }
    if(!refresh_token) return res.status(401).json({ status: 'error', error: 'No Refresh Token Provided' })
    const [tokenState, data] = verifyRefreshTokenJWT(refresh_token)
    if(tokenState != TokenVerifyResponse.VALID || !data) return res.status(401).json({ status: 'error', error: 'Refresh Token Not Found' })
    const { refreshToken: jwtRfrshToken, userId } = data as JwtPayload  
    const token = await Token.findOne({ userId }).lean()
    if(!token) return res.status(401).json({ status: 'error', error: 'Refresh Token Not Found' })
    if(!await verifyRefreshToken(jwtRfrshToken, token.refreshToken)) return res.status(401).json({ status: 'error', error: 'Refresh Token Not Valid' })
    const { accessToken, refreshToken } = await generateAndSetTokens(res, userId)
    if(isFromHeader) return res.json({ status: 'ok', accessToken, refreshToken })
    return res.json({ status: 'ok' })
})

export default router