import { Router, type IRouter } from "express";
import healthRouter from "./health";
import osintRouter from "./osint";
import adminRouter from "./admin";
import usersRouter from "./users";
import authRouter from "./auth";
import forgotPasswordRouter from "./forgot-password";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(forgotPasswordRouter);
router.use(osintRouter);
router.use(adminRouter);
router.use(usersRouter);

export default router;
