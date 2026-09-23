import { db } from "../lib/db";

type EstimateInput = {
  taskType: string;
  weather: string;
  operatorSkill: string;
  machineAge: number;
};

type BreakdownItem = {
  factor: string;
  deltaMinutes: number;
};

export function estimateTaskTime(input: EstimateInput) {
  const rows = db
    .prepare(`
      SELECT
        task_type,
        weather,
        operator_skill,
        machine_age,
        estimated_time,
        actual_time
      FROM task_history
    `)
    .all() as Array<{
      task_type: string;
      weather: string;
      operator_skill: string;
      machine_age: number;
      estimated_time: number;
      actual_time: number;
    }>;

  if (rows.length === 0) {
    return {
      estimatedMinutes: 60,
      breakdown: [
        {
          factor: "No historical data",
          deltaMinutes: 0,
        },
      ],
    };
  }

  /*
   * Start with the historical average for the requested task type.
   * If that exact task type does not exist, use the overall average.
   */
  const matchingTasks = rows.filter(
    (row) =>
      row.task_type.toLowerCase() === input.taskType.toLowerCase(),
  );

  const baseRows = matchingTasks.length > 0 ? matchingTasks : rows;

  const baseAverage =
    baseRows.reduce((sum, row) => sum + row.actual_time, 0) /
    baseRows.length;

  const breakdown: BreakdownItem[] = [];

  /*
   * Weather adjustment
   */
  const weatherRows = rows.filter(
    (row) => row.weather.toLowerCase() === input.weather.toLowerCase(),
  );

  if (weatherRows.length > 0) {
    const weatherDelta =
      weatherRows.reduce(
        (sum, row) => sum + (row.actual_time - row.estimated_time),
        0,
      ) / weatherRows.length;

    breakdown.push({
      factor: `${input.weather} weather`,
      deltaMinutes: Math.round(weatherDelta),
    });
  }

  /*
   * Operator skill adjustment
   */
  const skillRows = rows.filter(
    (row) =>
      row.operator_skill.toLowerCase() ===
      input.operatorSkill.toLowerCase(),
  );

  if (skillRows.length > 0) {
    const skillDelta =
      skillRows.reduce(
        (sum, row) => sum + (row.actual_time - row.estimated_time),
        0,
      ) / skillRows.length;

    breakdown.push({
      factor: `${input.operatorSkill} operator`,
      deltaMinutes: Math.round(skillDelta),
    });
  }

  /*
   * Machine age adjustment.
   * We compare the requested machine age with the historical average.
   */
  const ageDeltaRows = rows.map(
    (row) => row.actual_time - row.estimated_time,
  );

  const overallDelta =
    ageDeltaRows.reduce((sum, value) => sum + value, 0) /
    ageDeltaRows.length;

  const ageAdjustment =
    input.machineAge >= 6
      ? Math.max(3, Math.round(overallDelta))
      : input.machineAge <= 2
        ? Math.min(-2, Math.round(overallDelta))
        : 0;

  if (ageAdjustment !== 0) {
    breakdown.push({
      factor: `Machine age (${input.machineAge} years)`,
      deltaMinutes: ageAdjustment,
    });
  }

  /*
   * Combine adjustments.
   */
  const totalAdjustment = breakdown.reduce(
    (sum, item) => sum + item.deltaMinutes,
    0,
  );

  const estimatedMinutes = Math.max(
    5,
    Math.round(baseAverage + totalAdjustment),
  );

  return {
    estimatedMinutes,
    breakdown: [
      {
        factor: "Historical task duration",
        deltaMinutes: Math.round(baseAverage),
      },
      ...breakdown,
    ],
  };
}