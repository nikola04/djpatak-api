import { generateAccessTokenJWT, generateRefreshToken, generateRefreshTokenJWT, TokenVerifyResponse, verifyAccessToken, verifyRefreshToken, verifyRefreshTokenJWT } from "../token"

describe('JWT Auth Tokens', () => {
    it('should generate & verify access token', () => {
        const generated = generateAccessTokenJWT('test')
        const [status, data] = verifyAccessToken(generated)
        expect(status).toBe(TokenVerifyResponse.VALID)
        expect(data).not.toBeNull()
    })
    it('should give invalid access token status', () => {
        const [status, data] = verifyAccessToken('invalid_string')
        expect(status).toBe(TokenVerifyResponse.INVALID)
        expect(data).toBeNull()
    })
    it('should give expired access token status', () => {
        const generated = generateAccessTokenJWT('test', -1)
        const [status, data] = verifyAccessToken(generated)
        expect(status).toBe(TokenVerifyResponse.EXPIRED)
        expect(data).toBeNull()
    })
    it('should generate & verify refresh token', async () => {
        const { refreshToken, hashedRefreshToken } = await generateRefreshToken()
        const tokenJWT = generateRefreshTokenJWT(refreshToken, '12345')
        expect(await verifyRefreshToken(refreshToken, hashedRefreshToken)).toBe(true)
        const [status, data] = verifyRefreshTokenJWT(tokenJWT)
        expect(status).toBe(TokenVerifyResponse.VALID)
        expect(data).not.toBeNull()
    })
    it('should give invalid refresh token status', async () => {
        const { hashedRefreshToken } = await generateRefreshToken()
        const { refreshToken } = await generateRefreshToken()
        expect(await verifyRefreshToken(refreshToken, hashedRefreshToken)).toBe(false)
        const [status, data] = verifyRefreshTokenJWT('invalid')
        expect(status).toBe(TokenVerifyResponse.INVALID)
        expect(data).toBeNull()
    })
    it('should give expired refresh token status', async () => {
        const { refreshToken } = await generateRefreshToken()
        const tokenJWT = generateRefreshTokenJWT(refreshToken, '12345', -1)
        const [status, data] = verifyRefreshTokenJWT(tokenJWT)
        expect(status).toBe(TokenVerifyResponse.EXPIRED)
        expect(data).toBeNull()
    })
})