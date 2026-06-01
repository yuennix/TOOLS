import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resetLinkRouter from "./reset-link";
import resetPassRouter from "./reset-pass";
import adminRouter from "./admin";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resetLinkRouter);
router.use(resetPassRouter);
router.use(adminRouter);
router.use(authRouter);

export default router;
