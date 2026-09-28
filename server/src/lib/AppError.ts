export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "ERROR",
    public details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, "BAD_REQUEST", details);
  }
  static unauthorized(message = "No autenticado") {
    return new AppError(401, message, "UNAUTHORIZED");
  }
  static forbidden(message = "No tenés permiso para esta acción") {
    return new AppError(403, message, "FORBIDDEN");
  }
  static notFound(what = "Recurso") {
    return new AppError(404, `${what} no encontrado`, "NOT_FOUND");
  }
  static conflict(message: string) {
    return new AppError(409, message, "CONFLICT");
  }
}
