import { Request, Response, Router } from "express";
import trackRoute from './tracks'
import volumeRoute from './volume'
import Account from "../../../../models/account";

// INIT
const router = Router()

// ROUTES
router.use(async (req: Request, res: Response, next) => {
    if(!req.userId) return res.sendStatus(401)
    // get discord id
    const account = await Account.findOne({ userId: req.userId }).lean()
    if(!account) return res.sendStatus(401)
    req.userDiscordId = account.providerAccountId
    next()
})
router.use('/:playerId', trackRoute)
router.use('/:playerId', volumeRoute)

export default router