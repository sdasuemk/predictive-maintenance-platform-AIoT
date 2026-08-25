/**
 * Utility functions for generating realistic sensor signals, noise, and waveforms.
 */
export class SignalPatterns {
  /**
   * Generates standard Box-Muller transform Gaussian (normal) distributed noise.
   */
  public static gaussianNoise(mean: number = 0, stdDev: number = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
  }

  /**
   * Generates a baseline value with small random fluctuations.
   */
  public static noisyValue(base: number, noiseLevel: number): number {
    return base + this.gaussianNoise(0, noiseLevel);
  }

  /**
   * Simulates a slow drift over time.
   * @param t Current tick index
   * @param rate Rate of drift per tick
   * @param direction 1 for up, -1 for down
   */
  public static linearDrift(t: number, rate: number, direction: 1 | -1 = 1): number {
    return t * rate * direction;
  }

  /**
   * Simulates a periodic sinusoidal pattern (e.g., belt revolution noise or motor vibrations).
   * @param t Current tick index
   * @param period Ticks per full cycle
   * @param amplitude Magnitude of the periodic noise
   */
  public static periodicPattern(t: number, period: number, amplitude: number): number {
    return Math.sin((2 * Math.PI * t) / period) * amplitude;
  }

  /**
   * Generates a sudden spike with high probability of decaying over time.
   * @param currentSpikeValue The last spike value (decays automatically)
   * @param probability Chance to start a new spike
   * @param maxIntensity Maximum intensity of the spike
   * @param decayRate Factor to multiply by per tick (e.g., 0.7 for quick decay)
   */
  public static updateSpike(
    currentSpikeValue: number,
    probability: number,
    maxIntensity: number,
    decayRate: number = 0.8
  ): number {
    let nextValue = currentSpikeValue * decayRate;
    if (Math.random() < probability) {
      // Add a fresh spike
      const sign = Math.random() < 0.5 ? -1 : 1;
      nextValue += sign * (Math.random() * maxIntensity);
    }
    return nextValue;
  }
}
