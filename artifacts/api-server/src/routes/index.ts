import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resetLinkRouter from "./reset-link";
import resetPassRouter from "./reset-pass";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resetLinkRouter);
router.use(resetPassRouter);

export default router;
