const send = (res, status, body) => res.status(status).json(body);

const success = (res, data, message = null, extras = {}) =>
  send(res, 200, {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...extras,
  });

const created = (res, data, message = null, extras = {}) =>
  send(res, 201, {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...extras,
  });

const exposeInternalErrors = process.env.NODE_ENV !== "production";

const failure = (res, status, message, error = undefined, extras = {}) =>
  send(res, status, {
    success: false,
    message,
    ...(error && exposeInternalErrors ? { error } : {}),
    ...extras,
  });

module.exports = {
  success,
  created,
  badRequest: (res, message, extras = {}) => failure(res, 400, message, undefined, extras),
  unauthorized: (res, message = "Unauthorized") => failure(res, 401, message),
  forbidden: (res, message = "Forbidden") => failure(res, 403, message),
  notFound: (res, message = "Not found") => failure(res, 404, message),
  conflict: (res, message = "Conflict") => failure(res, 409, message),
  payloadTooLarge: (res, message = "Request body too large") => failure(res, 413, message),
  serverError: (res, message = "Internal server error", error = undefined) =>
    failure(res, 500, message, error),
  failure,
};
