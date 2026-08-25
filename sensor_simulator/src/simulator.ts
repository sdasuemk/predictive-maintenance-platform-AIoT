import readline from "readline";
import { CONFIG } from "./config/config.js";
import { EmbeddedMqttService } from "./services/embedded-mqtt.service.js";
import { MqttService } from "./services/mqtt.service.js";
import { TelemetryRepository } from "./repositories/telemetry.repository.js";
import { FeederService } from "./services/feeder.service.js";
import { FeederState } from "./enums/feeder-state.enum.js";
import { SensorStatus } from "./enums/sensor-status.enum.js";
import { COLORS } from "./utils/ansi-colors.js";
import { startExpressServer } from "./server.js";

class SimulatorRunner {
  private embeddedMqtt: EmbeddedMqttService | null = null;
  private mqttService: MqttService;
  private telemetryRepository: TelemetryRepository;
  private feederService: FeederService;
  private timer: NodeJS.Timeout | null = null;
  private isExiting = false;

  constructor() {
    this.mqttService = new MqttService();
    this.telemetryRepository = new TelemetryRepository();
    this.feederService = new FeederService(CONFIG.FEEDER.EQUIPMENT_ID, CONFIG.FEEDER.PLANT_ID);
  }

  public async start(): Promise<void> {
    console.clear();
    console.log(`${COLORS.bold}${COLORS.cyan}====================================================`);
    console.log("   AIoT Predictive Maintenance - Weigh Feeder Sim");
    console.log(`====================================================${COLORS.reset}\n`);

    // 1. Initialize Embedded MQTT Broker if requested
    if (CONFIG.MQTT.USE_EMBEDDED) {
      this.embeddedMqtt = new EmbeddedMqttService(1883);
      try {
        await this.embeddedMqtt.start();
      } catch (err: any) {
        console.error(`${COLORS.red}Failed to start embedded MQTT Broker: ${err.message}${COLORS.reset}`);
        console.log("Attempting connection to external broker instead...");
      }
    }

    // 2. Connect MQTT Publisher Client
    try {
      await this.mqttService.connect();
    } catch (err: any) {
      console.warn(`${COLORS.yellow}MQTT publisher client failed to connect. Running offline.${COLORS.reset}`);
    }

    // 3. Connect MongoDB
    await this.telemetryRepository.connect();

    // 4. Start HTTP Express Server API
    try {
      startExpressServer(this.feederService);
    } catch (err: any) {
      console.error(`${COLORS.red}Failed to start Express API server: ${err.message}${COLORS.reset}`);
    }

    // 5. Start Weigh Feeder Simulation Engine
    this.feederService.start();
    console.log(`\n${COLORS.green}Feeder simulator engine started successfully!${COLORS.reset}`);
    console.log(`Interval: ${CONFIG.FEEDER.TICK_INTERVAL_MS}ms | Acceleration: ${CONFIG.FEEDER.TIME_ACCELERATION}x`);
    console.log("Loading dashboard...");

    setTimeout(() => {
      // Begin execution loop
      this.timer = setInterval(() => this.tick(), CONFIG.FEEDER.TICK_INTERVAL_MS);
      this.setupKeyboardInput();
    }, 1500);
  }

  private tick(): void {
    if (this.isExiting) return;

    // Run one physical step
    const telemetry = this.feederService.tick();

    // Publish data
    this.mqttService.publishTelemetry(telemetry);
    this.telemetryRepository.save(telemetry);

    // Draw Dashboard
    this.renderDashboard(telemetry);
  }

  private renderDashboard(telemetry: any): void {
    process.stdout.write("\x1Bc");

    const header = `${COLORS.bold}${COLORS.cyan}========================================================================================
  SCHENCK PROCESS MULTIDOS-H WEIGH FEEDER SIMULATOR - DISOCONT TERSUS CONTROLLER
========================================================================================${COLORS.reset}`;
    console.log(header);

    let stateStr = telemetry.state;
    if (telemetry.state === FeederState.RUNNING) {
      stateStr = `${COLORS.green}${COLORS.bold}RUNNING${COLORS.reset}`;
    } else if (telemetry.state === FeederState.DEGRADED) {
      stateStr = `${COLORS.yellow}${COLORS.bold}DEGRADED${COLORS.reset}`;
    } else if (telemetry.state === FeederState.PRE_FAILURE) {
      stateStr = `${COLORS.yellow}${COLORS.bold}PRE-FAILURE${COLORS.reset}`;
    } else if (telemetry.state === FeederState.FAILURE) {
      stateStr = `${COLORS.red}${COLORS.bold}FAILURE (CRITICAL)${COLORS.reset}`;
    } else if (telemetry.state === FeederState.TRIP) {
      stateStr = `${COLORS.bgRed}${COLORS.bold} TRIP / HALTED ${COLORS.reset}`;
    } else {
      stateStr = `${COLORS.dim}${telemetry.state}${COLORS.reset}`;
    }

    const health = telemetry.healthScore;
    let healthColor = COLORS.green;
    if (health < 40) healthColor = COLORS.red;
    else if (health < 75) healthColor = COLORS.yellow;

    const barLength = 20;
    const filledLength = Math.round((health / 100) * barLength);
    const bar = `${healthColor}${"█".repeat(filledLength)}${COLORS.dim}${"░".repeat(barLength - filledLength)}${COLORS.reset}`;

    console.log(` ${COLORS.bold}Plant ID:${COLORS.reset} ${telemetry.plantId}  |  ${COLORS.bold}Asset ID:${COLORS.reset} ${telemetry.equipmentId}  |  ${COLORS.bold}Model:${COLORS.reset} ${telemetry.model}`);
    console.log(` ${COLORS.bold}State:${COLORS.reset} ${stateStr}  |  ${COLORS.bold}Health Score:${COLORS.reset} ${bar} ${healthColor}${health}%${COLORS.reset}`);
    
    if (telemetry.activeFailureMode) {
      const p = Math.round(this.feederService["anomalyInjector"].getProgression() * 100);
      console.log(` ${COLORS.red}${COLORS.bold}ACTIVE ANOMALY:${COLORS.reset} ${COLORS.yellow}${telemetry.activeFailureMode}${COLORS.reset} (Progression: ${COLORS.bold}${p}%${COLORS.reset})`);
    } else {
      console.log(` ${COLORS.green}Normal Operation (No Active Failure Modes)${COLORS.reset}`);
    }
    console.log(`${COLORS.dim}----------------------------------------------------------------------------------------${COLORS.reset}`);

    const fmtSensor = (sensorKey: string) => {
      const s = telemetry.sensors[sensorKey];
      let valStr = `${s.value.toString().padStart(8)} ${s.unit.padEnd(5)}`;
      if (s.status === SensorStatus.CRITICAL) {
        return `${COLORS.red}${COLORS.bold}${valStr} [CRIT]${COLORS.reset}`;
      } else if (s.status === SensorStatus.WARNING) {
        return `${COLORS.yellow}${COLORS.bold}${valStr} [WARN]${COLORS.reset}`;
      } else if (s.status === SensorStatus.HIGH) {
        return `${COLORS.yellow}${valStr} [HIGH]${COLORS.reset}`;
      } else if (s.status === SensorStatus.LOW) {
        return `${COLORS.yellow}${valStr} [LOW]${COLORS.reset}`;
      }
      return `${COLORS.green}${valStr} [ OK ]${COLORS.reset}`;
    };

    console.log(` ${COLORS.bold}PROCESS TELEMETRY:${COLORS.reset}                       ${COLORS.bold}MOTOR & EQUIPMENT METRICS:${COLORS.reset}`);
    console.log(`   Feed Rate Actual  : ${fmtSensor("feed_rate_actual")}   Motor Current     : ${fmtSensor("motor_current")}`);
    console.log(`   Feed Rate Setpoint: ${fmtSensor("feed_rate_setpoint")}   Motor Temperature : ${fmtSensor("motor_temp")}`);
    console.log(`   Feed Rate Dev     : ${fmtSensor("feed_rate_deviation")}   Belt Tension      : ${fmtSensor("belt_tension")}`);
    console.log(`   Belt Load (Weight): ${fmtSensor("belt_load")}   Zero-Point Drift  : ${fmtSensor("zero_drift")}`);
    console.log(`   Belt Speed        : ${fmtSensor("belt_speed")}   Drive End Vibration: ${fmtSensor("vibration_drive")}`);
    console.log(`   Moisture          : ${fmtSensor("moisture")}   Tail End Vibration : ${fmtSensor("vibration_tail")}`);
    console.log(`   Totalizer (Tons)  : ${COLORS.cyan}${telemetry.sensors.totalizer.value.toFixed(2).padStart(8)} t${COLORS.reset}           Ambient Temp      : ${fmtSensor("ambient_temp")}`);
    console.log(`${COLORS.dim}----------------------------------------------------------------------------------------${COLORS.reset}`);

    console.log(` ${COLORS.bold}ACTIVE CONTROLLER ALERTS:${COLORS.reset}`);
    if (telemetry.alerts.length === 0) {
      console.log(`   ${COLORS.dim}No active alarms/warnings.${COLORS.reset}`);
    } else {
      telemetry.alerts.forEach((alert: any) => {
        const c = alert.severity === "CRITICAL" ? COLORS.red : COLORS.yellow;
        console.log(`   [${c}${alert.severity}${COLORS.reset}] ${alert.code}: ${alert.message}`);
      });
    }
    console.log(`${COLORS.dim}----------------------------------------------------------------------------------------${COLORS.reset}`);

    console.log(` ${COLORS.bold}INTERACTIVE FAULT INJECTION CONTROLS:${COLORS.reset}`);
    console.log(`   [${COLORS.bold}1${COLORS.reset}] Load Cell Zero Drift (FM-01)     [${COLORS.bold}4${COLORS.reset}] Chute Blockage / Stall (FM-04)`);
    console.log(`   [${COLORS.bold}2${COLORS.reset}] Belt Slippage (FM-02)            [${COLORS.bold}5${COLORS.reset}] Belt Mistracking/Oscillations (FM-05)`);
    console.log(`   [${COLORS.bold}3${COLORS.reset}] Bearing Wear (FM-03)             [${COLORS.bold}R${COLORS.reset}] Reset Faults / Restart Feeder`);
    console.log(`   [${COLORS.bold}S${COLORS.reset}] Toggle Start/Stop Feeder         [${COLORS.bold}Q${COLORS.reset}] Exit Simulator`);
    console.log(`\n Topic Prefix: ${COLORS.magenta}${CONFIG.MQTT.TOPIC_PREFIX}/#${COLORS.reset}`);
  }

  private setupKeyboardInput(): void {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on("keypress", (str, key) => {
      if (key.ctrl && key.name === "c") {
        this.exit();
        return;
      }

      const choice = str.toLowerCase();
      switch (choice) {
        case "1":
          this.feederService.triggerFailure("FM-01");
          break;
        case "2":
          this.feederService.triggerFailure("FM-02");
          break;
        case "3":
          this.feederService.triggerFailure("FM-03");
          break;
        case "4":
          this.feederService.triggerFailure("FM-04");
          break;
        case "5":
          this.feederService.triggerFailure("FM-05");
          break;
        case "r":
          this.feederService.resetFailure();
          break;
        case "s":
          if (this.feederService.state === FeederState.IDLE) {
            this.feederService.start();
          } else {
            this.feederService.stop();
          }
          break;
        case "q":
          this.exit();
          break;
      }
    });
  }

  public async exit(): Promise<void> {
    if (this.isExiting) return;
    this.isExiting = true;

    if (this.timer) {
      clearInterval(this.timer);
    }

    console.log(`\n${COLORS.yellow}Shutting down simulator services...${COLORS.reset}`);
    await this.mqttService.disconnect();
    await this.telemetryRepository.disconnect();
    if (this.embeddedMqtt) {
      await this.embeddedMqtt.stop();
    }
    console.log(`${COLORS.green}Shutdown complete. Goodbye!${COLORS.reset}`);
    process.exit(0);
  }
}

const runner = new SimulatorRunner();
runner.start();
