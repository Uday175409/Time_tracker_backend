import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

type ErrorWithMeta = Error & {
  status?: number;
  statusCode?: number;
  code?: number | string;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message?: string }>;
  path?: string;
  type?: string;
};

type ApiErrorBody = {
  success: false;
  message: string;
  errorType: string;
  details?: unknown;
};

const FALLBACK_MESSAGE = 'Internal server error';

const toMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return FALLBACK_MESSAGE;
};

const buildErrorResponse = (error: unknown, defaultStatus = 500): { status: number; body: ApiErrorBody } => {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Validation failed',
        errorType: 'validation_error',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  }

  const err = error as ErrorWithMeta;

  if (err instanceof SyntaxError && err.message.toLowerCase().includes('json')) {
    return {
      status: 400,
      body: {
        success: false,
        message: 'Invalid JSON in request body',
        errorType: 'invalid_json',
      },
    };
  }

  if (err.message === 'Not allowed by CORS') {
    return {
      status: 403,
      body: {
        success: false,
        message: 'Request origin is not allowed by CORS policy',
        errorType: 'cors_error',
      },
    };
  }

  if (err.code === 11000) {
    const key = Object.keys(err.keyValue || {})[0];
    return {
      status: 409,
      body: {
        success: false,
        message: key ? `Duplicate value for ${key}` : 'Duplicate key error',
        errorType: 'duplicate_error',
        details: err.keyValue,
      },
    };
  }

  if (err.name === 'ValidationError') {
    const first = err.errors ? Object.values(err.errors)[0] : undefined;
    return {
      status: 400,
      body: {
        success: false,
        message: first?.message || toMessage(error),
        errorType: 'db_validation_error',
      },
    };
  }

  if (err.name === 'CastError') {
    return {
      status: 400,
      body: {
        success: false,
        message: `Invalid value for ${err.path || 'field'}`,
        errorType: 'invalid_reference',
      },
    };
  }

  if (err.name === 'DocumentNotFoundError' || err.message.toLowerCase().includes('not found')) {
    return {
      status: 404,
      body: {
        success: false,
        message: toMessage(error),
        errorType: 'not_found',
      },
    };
  }

  const explicitStatus = typeof err.statusCode === 'number' ? err.statusCode : err.status;
  if (typeof explicitStatus === 'number') {
    return {
      status: explicitStatus,
      body: {
        success: false,
        message: toMessage(error),
        errorType: 'request_error',
      },
    };
  }

  return {
    status: defaultStatus,
    body: {
      success: false,
      message: toMessage(error),
      errorType: defaultStatus >= 500 ? 'server_error' : 'request_error',
    },
  };
};

export const handleControllerError = (res: Response, error: unknown, defaultStatus = 400): void => {
  const { status, body } = buildErrorResponse(error, defaultStatus);
  res.status(status).json(body);
};

export const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, body } = buildErrorResponse(error, 500);
  console.error('Unhandled server error:', error);
  res.status(status).json(body);
};