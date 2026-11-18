export class PosError extends Error {
  public readonly status: number;
  public readonly code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = "PosError";
    this.status = status;
    this.code = code;
  }
}
