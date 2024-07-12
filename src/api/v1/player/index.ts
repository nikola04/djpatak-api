import { Router } from "express";
import trackRoute from './track'
import volumeRoute from './volume'

// INIT
const router = Router()

// ROUTES
router.use('/', trackRoute)
router.use('/', volumeRoute)

export default router