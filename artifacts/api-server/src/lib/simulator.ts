import { randomUUID } from "node:crypto";

type EngineState = "offline" | "ready" | "running" | "braking";
type EventLevel = "info" | "warning" | "alert";
type SensorStatus = "normal" | "warning" | "alert";
type SensorDirection = "high" | "low";
type ObstacleSeverity = "caution" | "danger";

export type SimulatorAction =
  | "start_engine"
  | "stop_engine"
  | "demo_brake"
  | "reset";

export type SimulatorState = {
  machine: {
    engine: EngineState;
    speed: number;
    heading: number;
  };
  safety: {
    ppeDetected: boolean;
    seatbeltFastened: boolean;
  };
  sensors: SensorReading[];
  terrain: {
    machineX: number;
    machineY: number;
    obstacles: Obstacle[];
    nearestObstacleDistance: number;
    dangerDistance: number;
  };
  eventLog: SimulatorEvent[];
  updatedAt: string;
};

type SensorReading = {
  id: string;
  label: string;
  value: number;
  unit: string;
  threshold: number;
  status: SensorStatus;
  direction: SensorDirection;
};

type Obstacle = {
  id: string;
  x: number;
  y: number;
  distance: number;
  severity: ObstacleSeverity;
};

type SimulatorEvent = {
  id: string;
  timestamp: string;
  level: EventLevel;
  message: string;
};

type SensorDefinition = Omit<SensorReading, "value" | "status"> & {
  baseline: number;
  spread: number;
  warningMargin: number;
  alertMargin: number;
};

const SENSOR_DEFINITIONS: SensorDefinition[] = [
  {
    id: "oxygen",
    label: "O2 concentration",
    unit: "%",
    threshold: 19.5,
    direction: "low",
    baseline: 20.8,
    spread: 0.08,
    warningMargin: 0.7,
    alertMargin: 1.5,
  },
  {
    id: "chlorine",
    label: "Chlorine",
    unit: "ppm",
    threshold: 0.3,
    direction: "high",
    baseline: 0.04,
    spread: 0.018,
    warningMargin: 0.18,
    alertMargin: 0.45,
  },
  {
    id: "phosphine",
    label: "Phosphine",
    unit: "ppm",
    threshold: 0.3,
    direction: "high",
    baseline: 0.01,
    spread: 0.007,
    warningMargin: 0.16,
    alertMargin: 0.4,
  },
  {
    id: "pressure",
    label: "Cabin pressure",
    unit: "psi",
    threshold: 18,
    direction: "high",
    baseline: 14.7,
    spread: 0.12,
    warningMargin: 2.1,
    alertMargin: 4.8,
  },
];

const DANGER_DISTANCE = 14;
const MAX_EVENT_LOG = 8;

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function distanceBetween(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function initialSensors(): SensorReading[] {
  return SENSOR_DEFINITIONS.map(({ baseline, ...definition }) => ({
    ...definition,
    value: baseline,
    status: "normal",
  }));
}

function initialState(): SimulatorState {
  return {
    machine: {
      engine: "ready",
      speed: 0,
      heading: 12,
    },
    safety: {
      ppeDetected: false,
      seatbeltFastened: false,
    },
    sensors: initialSensors(),
    terrain: {
      machineX: 50,
      machineY: 52,
      obstacles: [],
      nearestObstacleDistance: 99,
      dangerDistance: DANGER_DISTANCE,
    },
    eventLog: [
      {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Operator station online — simulated telemetry connected",
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

class Simulator {
  private state = initialState();
  private tickCount = 0;
  private anomalyTicksRemaining = 0;
  private anomalySensorId: string | null = null;
  private previousSensorStatuses = new Map<string, SensorStatus>();

  constructor() {
    for (const sensor of this.state.sensors) {
      this.previousSensorStatuses.set(sensor.id, sensor.status);
    }

    // TODO: replace with real IoT input. This timer keeps the demo moving even
    // before the first browser poll and mirrors an incoming sensor stream.
    setInterval(() => this.tick(), 1800);
  }

  getState() {
    return structuredClone(this.state);
  }

  applyAction(action: SimulatorAction) {
    switch (action) {
      case "start_engine":
        if (this.state.machine.engine !== "running") {
          this.state.machine.engine = "running";
          this.state.machine.speed = 8;
          this.addEvent("info", "Engine started — machine systems nominal");
        }
        break;
      case "stop_engine":
        this.state.machine.engine = "ready";
        this.state.machine.speed = 0;
        this.addEvent("info", "Engine stopped — machine standing by");
        break;
      case "demo_brake":
        this.triggerDemoBrake();
        break;
      case "reset":
        this.state = initialState();
        this.tickCount = 0;
        this.anomalyTicksRemaining = 0;
        this.anomalySensorId = null;
        this.previousSensorStatuses.clear();
        for (const sensor of this.state.sensors) {
          this.previousSensorStatuses.set(sensor.id, sensor.status);
        }
        break;
    }

    this.state.updatedAt = new Date().toISOString();
    return this.getState();
  }

  private tick() {
    this.tickCount += 1;
    this.updateMachine();
    this.updateSensors();
    this.updateTerrain();
    this.state.updatedAt = new Date().toISOString();
  }

  private updateMachine() {
    if (this.state.machine.engine === "running") {
      this.state.machine.speed = Math.min(
        24,
        this.state.machine.speed + (Math.random() - 0.25) * 1.6,
      );
      this.state.machine.heading =
        (this.state.machine.heading + (Math.random() - 0.45) * 4 + 360) % 360;
    } else if (this.state.machine.engine !== "braking") {
      this.state.machine.speed = 0;
    }
  }

  private updateSensors() {
    if (this.anomalyTicksRemaining === 0 && Math.random() < 0.07) {
      this.anomalyTicksRemaining = 6;
      this.anomalySensorId =
        SENSOR_DEFINITIONS[Math.floor(Math.random() * SENSOR_DEFINITIONS.length)]
          ?.id ?? "oxygen";
    }

    for (const definition of SENSOR_DEFINITIONS) {
      const isAnomaly = definition.id === this.anomalySensorId;
      const jitter = (Math.random() - 0.5) * definition.spread;
      let value = definition.baseline + jitter;

      if (isAnomaly) {
        const directionMultiplier = definition.direction === "high" ? 1 : -1;
        const severity = definition.alertMargin * (0.92 + Math.random() * 0.28);
        value = definition.threshold + directionMultiplier * severity;
      }

      const status = this.getSensorStatus(definition, value);
      const previousStatus =
        this.previousSensorStatuses.get(definition.id) ?? "normal";
      const sensor = this.state.sensors.find(
        (candidate) => candidate.id === definition.id,
      );

      if (sensor) {
        sensor.value = round(value, definition.id === "oxygen" ? 2 : 2);
        sensor.status = status;
      }

      if (status !== previousStatus && status !== "normal") {
        this.addEvent(
          status,
          this.getSensorMessage(definition, status),
        );
      }
      this.previousSensorStatuses.set(definition.id, status);
    }

    if (this.anomalyTicksRemaining > 0) {
      this.anomalyTicksRemaining -= 1;
      if (this.anomalyTicksRemaining === 0) {
        this.anomalySensorId = null;
      }
    }
  }

  private getSensorStatus(
    definition: SensorDefinition,
    value: number,
  ): SensorStatus {
    const delta =
      definition.direction === "high"
        ? value - definition.threshold
        : definition.threshold - value;
    if (delta >= definition.alertMargin) return "alert";
    if (delta >= definition.warningMargin) return "warning";
    return "normal";
  }

  private getSensorMessage(
    definition: SensorDefinition,
    status: SensorStatus,
  ) {
    if (definition.id === "oxygen") {
      return status === "alert"
        ? "O2 dropping — ventilate the area now"
        : "O2 trending low — monitor ventilation";
    }
    if (definition.id === "pressure") {
      return status === "alert"
        ? "Cabin pressure high — stop and inspect seals"
        : "Cabin pressure rising — inspect the seal";
    }
    return status === "alert"
      ? `${definition.label} elevated — move to fresh air`
      : `${definition.label} rising — monitor the area`;
  }

  private updateTerrain() {
    if (
      this.tickCount % 5 === 0 &&
      this.state.terrain.obstacles.length < 4 &&
      Math.random() < 0.72
    ) {
      this.spawnObstacle();
    }

    const obstacles = this.state.terrain.obstacles.map((obstacle) => {
      const distance = distanceBetween(
        this.state.terrain.machineX,
        this.state.terrain.machineY,
        obstacle.x,
        obstacle.y,
      );
      return {
        ...obstacle,
        distance: round(distance, 1),
        severity: distance <= DANGER_DISTANCE ? "danger" : "caution",
      } as Obstacle;
    });

    const nearest = obstacles.reduce(
      (closest, obstacle) =>
        obstacle.distance < closest.distance ? obstacle : closest,
      { distance: 99 } as Obstacle,
    );

    this.state.terrain.obstacles = obstacles;
    this.state.terrain.nearestObstacleDistance = round(nearest.distance, 1);

    if (
      nearest.id &&
      nearest.distance <= DANGER_DISTANCE &&
      this.state.machine.engine === "running"
    ) {
      this.state.machine.engine = "braking";
      this.state.machine.speed = 0;
      this.addEvent(
        "alert",
        `Emergency braking — obstacle ${Math.round(nearest.distance)}m ahead`,
      );
    }

    if (this.state.machine.engine === "braking" && this.tickCount % 4 === 0) {
      this.state.machine.engine = "ready";
      this.addEvent("info", "Machine secure — obstacle avoidance complete");
    }
  }

  private spawnObstacle() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 26;
    const x = Math.max(
      8,
      Math.min(92, this.state.terrain.machineX + Math.cos(angle) * radius),
    );
    const y = Math.max(
      10,
      Math.min(90, this.state.terrain.machineY + Math.sin(angle) * radius),
    );
    this.state.terrain.obstacles.push({
      id: `obstacle-${this.tickCount}`,
      x: round(x, 1),
      y: round(y, 1),
      distance: round(
        distanceBetween(
          this.state.terrain.machineX,
          this.state.terrain.machineY,
          x,
          y,
        ),
        1,
      ),
      severity: "caution",
    });
  }

  private triggerDemoBrake() {
    const obstacle = {
      id: `demo-obstacle-${this.tickCount}`,
      x: this.state.terrain.machineX + 8,
      y: this.state.terrain.machineY + 2,
      distance: 8.2,
      severity: "danger" as const,
    };
    this.state.terrain.obstacles = [
      ...this.state.terrain.obstacles.filter(
        (candidate) => candidate.distance > DANGER_DISTANCE,
      ),
      obstacle,
    ];
    this.state.machine.engine = "braking";
    this.state.machine.speed = 0;
    this.addEvent("alert", "Demo brake engaged — obstacle detected in path");
  }

  private addEvent(level: EventLevel, message: string) {
    this.state.eventLog = [
      {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        level,
        message,
      },
      ...this.state.eventLog,
    ].slice(0, MAX_EVENT_LOG);
  }
}

export const simulator = new Simulator();