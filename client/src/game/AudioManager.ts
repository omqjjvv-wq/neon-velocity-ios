/** DESIGN REMINDER — 音效如同儀表的短促確認，只在使用者首次動作後啟用。 */
export class AudioManager {
  private context: AudioContext | null = null;

  unlock() {
    if (!this.context) this.context = new AudioContext();
    void this.context.resume();
  }

  beep(frequency: number, duration = .05, volume = .025, type: OscillatorType = "square") {
    if (!this.context || this.context.state !== "running") return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }

  dispose() { void this.context?.close(); this.context = null; }
}
