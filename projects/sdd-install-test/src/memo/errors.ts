export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`메모를 찾을 수 없음: ${id}`);
    this.name = "NotFoundError";
  }
}
