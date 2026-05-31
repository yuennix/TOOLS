import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resetLinkRouter from "./reset-link";
import resetPassRouter from "./reset-pass";
import keysRouter from "./keys";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keysRouter);
router.use(adminRouter);
router.use(resetLinkRouter);
router.use(resetPassRouter);

export default router;
