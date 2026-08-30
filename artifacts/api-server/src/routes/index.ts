import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reconcilRouter from "./reconcil";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reconcilRouter);

export default router;
