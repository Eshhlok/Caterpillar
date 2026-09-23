import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { estimateTaskTime } from "../services/taskEstimator";

const router: IRouter = Router();

/*
 * ---------------------------------------------------------
 * 1. TASK TIME ESTIMATION
 * ---------------------------------------------------------
 */

router.post("/tasks/estimate", (req, res) => {
  try {
    const {
      taskType,
      weather,
      operatorSkill,
      machineAge,
    } = req.body;

    if (
      !taskType ||
      !weather ||
      !operatorSkill ||
      machineAge === undefined
    ) {
      return res.status(400).json({
        error:
          "taskType, weather, operatorSkill and machineAge are required",
      });
    }

    const result = estimateTaskTime({
      taskType,
      weather,
      operatorSkill,
      machineAge: Number(machineAge),
    });

    return res.json({
      input: {
        taskType,
        weather,
        operatorSkill,
        machineAge: Number(machineAge),
      },
      ...result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to estimate task time",
    });
  }
});

/*
 * ---------------------------------------------------------
 * 2. GET TASKS
 * ---------------------------------------------------------
 */

router.get("/tasks", (_req, res) => {
  try {
    const tasks = db
      .prepare(`
        SELECT *
        FROM tasks
        ORDER BY
          priority DESC,
          scheduled_start ASC
      `)
      .all();

    return res.json({
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to fetch tasks",
    });
  }
});

/*
 * ---------------------------------------------------------
 * 3. CREATE TASK
 * ---------------------------------------------------------
 */

router.post("/tasks", (req, res) => {
  try {
    const {
      id,
      taskType,
      site,
      priority = 1,
      operatorId = null,
      machineId = null,
      status = "pending",
      estimatedDuration,
      deadline = null,
      requiredWeather = null,
      operatorAvailableStart = "08:00",
      operatorAvailableEnd = "17:00",
    } = req.body;

    if (!id || !taskType) {
      return res.status(400).json({
        error: "id and taskType are required",
      });
    }

    let duration = estimatedDuration;

    /*
     * Automatically calculate duration if the caller
     * didn't provide one.
     */
    if (!duration && operatorId && machineId) {
      const operator = db
        .prepare(
          `SELECT skill FROM operators WHERE id = ?`,
        )
        .get(operatorId) as { skill: string } | undefined;

      const machine = db
        .prepare(
          `SELECT age_years FROM machines WHERE id = ?`,
        )
        .get(machineId) as { age_years: number } | undefined;

      if (operator && machine) {
        const estimate = estimateTaskTime({
          taskType,
          weather: requiredWeather || "Sunny",
          operatorSkill: operator.skill,
          machineAge: machine.age_years,
        });

        duration = estimate.estimatedMinutes;
      }
    }

    if (!duration) {
      duration = 60;
    }

    db.prepare(`
      INSERT INTO tasks (
        id,
        task_type,
        site,
        priority,
        operator_id,
        machine_id,
        status,
        estimated_duration,
        deadline,
        required_weather,
        operator_available_start,
        operator_available_end
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      taskType,
      site || null,
      Number(priority),
      operatorId,
      machineId,
      status,
      Number(duration),
      deadline,
      requiredWeather,
      operatorAvailableStart,
      operatorAvailableEnd,
    );

    const task = db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(id);

    return res.status(201).json(task);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to create task",
    });
  }
});

/*
 * ---------------------------------------------------------
 * 4. UPDATE TASK
 * ---------------------------------------------------------
 */

router.patch("/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;

    const existing = db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(id);

    if (!existing) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const allowedFields: Record<string, string> = {
      taskType: "task_type",
      site: "site",
      priority: "priority",
      operatorId: "operator_id",
      machineId: "machine_id",
      status: "status",
      estimatedDuration: "estimated_duration",
      scheduledStart: "scheduled_start",
      scheduledEnd: "scheduled_end",
      actualStart: "actual_start",
      actualEnd: "actual_end",
      deadline: "deadline",
      requiredWeather: "required_weather",
    };

    const updates: string[] = [];
    // Values originate from the request body, but are passed to SQLite as
    // bound parameters below.
    const values: any[] = [];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields[key] !== undefined) {
        updates.push(`${allowedFields[key]} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: "No valid fields to update",
      });
    }

    values.push(id);

    db.prepare(`
      UPDATE tasks
      SET ${updates.join(", ")}
      WHERE id = ?
    `).run(...values);

    const updated = db
      .prepare(`SELECT * FROM tasks WHERE id = ?`)
      .get(id);

    return res.json(updated);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to update task",
    });
  }
});

/*
 * ---------------------------------------------------------
 * 5. SMART SCHEDULER
 * ---------------------------------------------------------
 */

router.post("/tasks/schedule/run", (_req, res) => {
  try {
    const pendingTasks = db
      .prepare(`
        SELECT *
        FROM tasks
        WHERE status = 'pending'
        ORDER BY priority DESC
      `)
      .all() as Array<{
        id: string;
        task_type: string;
        priority: number;
        estimated_duration: number;
        deadline: string | null;
        required_weather: string | null;
        operator_available_start: string | null;
        operator_available_end: string | null;
      }>;

    /*
     * Sort by:
     * 1. Higher priority
     * 2. Earlier deadline
     */
    pendingTasks.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      if (a.deadline && b.deadline) {
        return (
          new Date(a.deadline).getTime() -
          new Date(b.deadline).getTime()
        );
      }

      if (a.deadline) return -1;
      if (b.deadline) return 1;

      return 0;
    });

    /*
     * Working day: 08:00 → 17:00
     */
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0, 0);

    const scheduled = [];

    for (const task of pendingTasks) {
      const duration = Number(task.estimated_duration || 60);

      const start = new Date(currentTime);
      const end = new Date(
        start.getTime() + duration * 60 * 1000,
      );

      /*
       * Don't schedule beyond 17:00.
       */
      const dayEnd = new Date(start);
      dayEnd.setHours(17, 0, 0, 0);

      if (end > dayEnd) {
        continue;
      }

      db.prepare(`
        UPDATE tasks
        SET scheduled_start = ?,
            scheduled_end = ?
        WHERE id = ?
      `).run(
        start.toISOString(),
        end.toISOString(),
        task.id,
      );

      scheduled.push({
        taskId: task.id,
        taskType: task.task_type,
        priority: task.priority,
        estimatedMinutes: duration,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
      });

      currentTime = end;
    }

    return res.json({
      message: "Task schedule generated successfully",
      scheduled,
      scheduledCount: scheduled.length,
      deferredCount: pendingTasks.length - scheduled.length,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to schedule tasks",
    });
  }
});

/*
 * ---------------------------------------------------------
 * 6. TODAY'S DASHBOARD
 * ---------------------------------------------------------
 */

router.get("/dashboard/today", (_req, res) => {
  try {
    const tasks = db
      .prepare(`
        SELECT *
        FROM tasks
        ORDER BY
          scheduled_start ASC,
          priority DESC
      `)
      .all();

    const usage = db
      .prepare(`
        SELECT
          COALESCE(SUM(fuel_used), 0) AS fuelUsed,
          COALESCE(SUM(idling_time), 0) AS idleTime
        FROM usage_logs
      `)
      .get() as {
        fuelUsed: number;
        idleTime: number;
      };

    const safety = db
      .prepare(`
        SELECT COUNT(*) AS incidents
        FROM safety_events
      `)
      .get() as {
        incidents: number;
      };

    /*
     * Simple explainable safety score.
     * Starts at 100 and loses 10 points per recorded incident.
     */
    const safetyScore = Math.max(
      0,
      100 - Number(safety.incidents) * 10,
    );

    const completed = tasks.filter(
      (task) => task.status === "done",
    ).length;

    const total = tasks.length;

    return res.json({
      date: new Date().toISOString().split("T")[0],

      tasks,

      stats: {
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: total - completed,
        fuelUsed: Number(usage.fuelUsed),
        idleTimeMinutes: Number(usage.idleTime),
        safetyScore,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to load dashboard",
    });
  }
});

export default router;