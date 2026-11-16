class HttpError extends Error {
  code: number;

  /** Detalhes por campo, preenchidos pela validação. */
  issues?: unknown[];

  constructor(message: string, code: number = 400, issues?: unknown[]) {
    super(message);
    this.code = code;
    this.issues = issues;
  }
}

export default HttpError;
