import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulatorRouter from "./simulator";
import dataRouter from "./data";

const router: IRouter = Router();

router.use(healthRouter);
router.use(simulatorRouter);
router.use(dataRouter);

export default router;