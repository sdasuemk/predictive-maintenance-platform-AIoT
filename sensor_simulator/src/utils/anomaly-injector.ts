import { SignalPatterns } from "./signal-patterns.js";

export type FailureMode = "FM-01" | "FM-02" | "FM-03" | "FM-04" | "FM-05";

export interface AnomalyEffects {
  zeroDriftOffset: number;
  speedScale: number;
  tensionScale: number;
  vibrationDriveOffset: number;
  vibrationTailOffset: number;
  motorCurrentOffset: number;
  motorTempOffset: number;
  loadNoiseMultiplier: number;
  loadScale: number;
}

export class AnomalyInjector {
  private activeMode: FailureMode | null = null;
  private progression = 0; // 0.0 to 1.0
  private ticksActive = 0;

  public trigger(mode: FailureMode): void {
    this.activeMode = mode;
    this.progression = 0;
    this.ticksActive = 0;
  }

  public reset(): void {
    this.activeMode = null;
    this.progression = 0;
    this.ticksActive = 0;
  }

  public getActiveMode(): FailureMode | null {
    return this.activeMode;
  }

  public getProgression(): number {
    return this.progression;
  }

  public tick(timeAcceleration: number): void {
    if (!this.activeMode) return;

    this.ticksActive++;

    // Configure progression rate based on failure mode
    let rate = 0.01; // Default: 100 ticks to full failure
    switch (this.activeMode) {
      case "FM-01": // Load Cell Drift - very slow
        rate = 0.003;
        break;
      case "FM-02": // Belt Slip - medium
        rate = 0.015;
        break;
      case "FM-03": // Bearing Failure - slow
        rate = 0.005;
        break;
      case "FM-04": // Chute Jam - sudden
        rate = 0.08;
        break;
      case "FM-05": // Belt Mistracking - slow
        rate = 0.008;
        break;
    }

    // Advance progression, capping at 1.0
    this.progression = Math.min(1.0, this.progression + rate * timeAcceleration);
  }

  /**
   * Calculates the current sensor offsets/modifiers based on the failure mode and its progression.
   */
  public getEffects(): AnomalyEffects {
    const effects: AnomalyEffects = {
      zeroDriftOffset: 0,
      speedScale: 1.0,
      tensionScale: 1.0,
      vibrationDriveOffset: 0,
      vibrationTailOffset: 0,
      motorCurrentOffset: 0,
      motorTempOffset: 0,
      loadNoiseMultiplier: 1.0,
      loadScale: 1.0,
    };

    if (!this.activeMode) return effects;

    const p = this.progression;

    switch (this.activeMode) {
      case "FM-01": // Load Cell Drift (buildup of coal/limestone dust)
        // Zero drift climbs up to +3.5 kg/m
        effects.zeroDriftOffset = p * 3.5;
        // Minor vibration increase from buildup rubbing
        effects.vibrationTailOffset = p * 0.8;
        break;

      case "FM-02": // Belt Slip (due to loss of belt tension)
        // Tension drops significantly (down to 30% of normal)
        effects.tensionScale = 1.0 - p * 0.7;
        // Speed drops due to slip (up to 50% loss at pulley)
        effects.speedScale = 1.0 - p * 0.5;
        // Drive motor current spikes as it works harder/faster to compensate
        effects.motorCurrentOffset = p * 6.0;
        effects.motorTempOffset = p * 15.0;
        // Vibration increases due to belt flapping/slipping
        effects.vibrationDriveOffset = p * 2.2;
        break;

      case "FM-03": // Bearing Failure (Drive End)
        // Drive end vibration rises severely (up to +7.5 mm/s)
        effects.vibrationDriveOffset = p * 7.5;
        // Motor current rises due to mechanical binding
        effects.motorCurrentOffset = p * 5.0;
        // Temperature rises significantly
        effects.motorTempOffset = p * 35.0;
        break;

      case "FM-04": // Chute Jam / Blockage
        // Load scale increases rapidly (material piles up on belt)
        effects.loadScale = 1.0 + p * 1.5;
        // Speed grinds to a halt
        effects.speedScale = Math.max(0, 1.0 - p * 1.2);
        // Current spikes to critical/trip levels
        effects.motorCurrentOffset = p * 15.0;
        effects.motorTempOffset = p * 20.0;
        effects.vibrationDriveOffset = p * 4.0;
        break;

      case "FM-05": // Belt Mistracking
        // Belt oscillates sideways, causing tension variance
        effects.tensionScale = 1.0 + SignalPatterns.periodicPattern(this.ticksActive, 10, 0.15 * p);
        // Tail vibration rises because belt hits tracking switches/guides
        effects.vibrationTailOffset = p * 4.5;
        // Load reading becomes noisy/unstable
        effects.loadNoiseMultiplier = 1.0 + p * 3.0;
        effects.zeroDriftOffset = SignalPatterns.periodicPattern(this.ticksActive, 15, p * 0.4);
        break;
    }

    return effects;
  }
}
