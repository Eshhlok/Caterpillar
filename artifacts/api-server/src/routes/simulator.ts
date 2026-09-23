import { Router, type IRouter } from "express";
import {
  ApplySimulatorActionBody,
  ApplySimulatorActionResponse,
  GetSimulatorStateResponse,
} from "@workspace/api-zod";
import { simulator } from "../lib/simulator";

const router: IRouter = Router();

router.get("/simulator/state", (_req, res) => {
  const data = GetSimulatorStateResponse.parse(simulator.getState());
  res.json(data);
});

router.post("/simulator/action", (req, res) => {
  const parsed = ApplySimulatorActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Unknown simulator action" });
    return;
  }

  const data = ApplySimulatorActionResponse.parse(
    simulator.applyAction(parsed.data.action),
  );
  res.json(data);
});

export default router;