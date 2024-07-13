import { Request, Response, Router } from "express";
import User from "../../../../models/user";

// INIT
const router = Router()

// ROUTES
router.get('/me', async (req: Request, res: Response) => {
    if(!req.userId) return res.sendStatus(401)
    const user = await User.findById(req.userId)
    if(!user) return res.status(404).json({ status: 'error', error: 'User Not Found' })
    return res.json({ status: 'ok', data: {
        id: user._id,
        email: user.email,
        image: user.image
    } })
})

export default router