export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  constructor(
    private readonly scope: string,
    private readonly minimumLevel: LogLevel = "info",
  ) {}

  debug(message: string, ...details: unknown[]): void {
    this.#write("debug", message, details);
  }

  info(message: string, ...details: unknown[]): void {
    this.#write("info", message, details);
  }

  warn(message: string, ...details: unknown[]): void {
    this.#write("warn", message, details);
  }

  error(message: string, ...details: unknown[]): void {
    this.#write("error", message, details);
  }

  #write(level: LogLevel, message: string, details: unknown[]): void {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    if (levels.indexOf(level) < levels.indexOf(this.minimumLevel)) return;

    const method = level === "debug" ? "debug" : level;
    console[method](`[KikiLink:${this.scope}] ${message}`, ...details);
  }
}
