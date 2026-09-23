import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulatorRouter from "./simulator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(simulatorRouter);

export default router;
