import { Router, type IRouter } from "express";
import { db } from "../lib/db";

const router: IRouter = Router();

router.get("/db/status", (_req, res) => {
  const taskHistory = db
    .prepare("SELECT * FROM task_history")
    .all();

  const usageLogs = db
    .prepare("SELECT * FROM usage_logs")
    .all();

  res.json({
    database: "connected",
    taskHistory,
    usageLogs,
  });
});

export default router;