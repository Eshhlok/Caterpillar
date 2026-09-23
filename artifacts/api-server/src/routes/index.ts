import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulatorRouter from "./simulator";
import dataRouter from "./data";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(simulatorRouter);
router.use(dataRouter);
router.use(tasksRouter);

export default router;