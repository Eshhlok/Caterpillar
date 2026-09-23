import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dataDirectory = path.resolve(process.cwd(), "artifacts/api-server/data");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(dataDirectory, "caterpillar.db");

export const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS operators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    skill TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    machine_type TEXT NOT NULL,
    age_years INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    site TEXT,
    priority INTEGER DEFAULT 1,
    operator_id TEXT,
    machine_id TEXT,
    status TEXT DEFAULT 'pending',
    estimated_duration INTEGER,
    scheduled_start TEXT,
    scheduled_end TEXT,
    actual_start TEXT,
    actual_end TEXT
  );

  CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    weather TEXT NOT NULL,
    operator_skill TEXT NOT NULL,
    machine_age INTEGER NOT NULL,
    estimated_time INTEGER NOT NULL,
    actual_time INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    engine_hours REAL NOT NULL,
    fuel_used REAL NOT NULL,
    load_cycles INTEGER NOT NULL,
    idling_time INTEGER NOT NULL,
    seatbelt_status TEXT NOT NULL,
    safety_alert_triggered TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS safety_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    machine_id TEXT,
    operator_id TEXT,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS behavior_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    baseline REAL NOT NULL,
    deviation REAL NOT NULL,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS training_modules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    tags TEXT,
    difficulty TEXT
  );

  CREATE TABLE IF NOT EXISTS training_assignments (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    status TEXT DEFAULT 'assigned',
    score REAL
  );

  CREATE TABLE IF NOT EXISTS instructor_bookings (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    slot TEXT NOT NULL,
    status TEXT DEFAULT 'booked'
  );
`);

function seedDatabase() {
  const taskCount = db
    .prepare("SELECT COUNT(*) as count FROM task_history")
    .get() as { count: number };

  if (taskCount.count === 0) {
    const insertTask = db.prepare(`
      INSERT INTO task_history
      (id, task_type, weather, operator_skill, machine_age, estimated_time, actual_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run(
      "T001",
      "Earth Excavation",
      "Sunny",
      "Expert",
      2,
      60,
      58,
    );

    insertTask.run(
      "T002",
      "Trenching",
      "Rainy",
      "Intermediate",
      4,
      45,
      52,
    );

    insertTask.run(
      "T003",
      "Material Loading",
      "Cloudy",
      "Beginner",
      3,
      30,
      42,
    );

    insertTask.run(
      "T004",
      "Grading",
      "Sunny",
      "Expert",
      5,
      35,
      33,
    );

    insertTask.run(
      "T005",
      "Demolition",
      "Windy",
      "Intermediate",
      6,
      90,
      105,
    );
  }

  const usageCount = db
    .prepare("SELECT COUNT(*) as count FROM usage_logs")
    .get() as { count: number };

  if (usageCount.count === 0) {
    const insertUsage = db.prepare(`
      INSERT INTO usage_logs
      (
        timestamp,
        machine_id,
        operator_id,
        engine_hours,
        fuel_used,
        load_cycles,
        idling_time,
        seatbelt_status,
        safety_alert_triggered
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUsage.run(
      "2025-05-01 08:00:00",
      "EXC001",
      "OP1001",
      1523.5,
      5.2,
      12,
      30,
      "Fastened",
      "No",
    );

    insertUsage.run(
      "2025-05-01 10:00:00",
      "EXC001",
      "OP1001",
      1524.8,
      3.8,
      2,
      55,
      "Unfastened",
      "Yes",
    );

    insertUsage.run(
      "2025-05-01 14:00:00",
      "EXC001",
      "OP1001",
      1526.5,
      6.1,
      10,
      15,
      "Fastened",
      "No",
    );

    insertUsage.run(
      "2025-05-02 09:00:00",
      "EXC001",
      "OP1001",
      1530.2,
      2.0,
      1,
      60,
      "Unfastened",
      "Yes",
    );
  }

  // Basic demo operator and machine
  db.prepare(`
    INSERT OR IGNORE INTO operators (id, name, skill)
    VALUES (?, ?, ?)
  `).run("OP1001", "Demo Operator", "Intermediate");

  db.prepare(`
    INSERT OR IGNORE INTO machines (id, name, machine_type, age_years)
    VALUES (?, ?, ?, ?)
  `).run("EXC001", "CAT Excavator 001", "Excavator", 4);
}

seedDatabase();

console.log(`Database ready: ${databasePath}`);