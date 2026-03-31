# Backend Error Handling System

## Overview
The backend implements a centralized error handling system that provides specific, user-friendly error messages for every error type. This helps the frontend display meaningful feedback to users.

## Error Response Format
All errors are returned in a consistent JSON format:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "errorType": "error_type_identifier",
  "details": {} // Optional: Additional context for validation errors
}
```

## Error Types & Handling

### 1. **Validation Errors** (400)
- **Trigger**: Zod schema validation failure
- **errorType**: `validation_error`
- **Details**: Array of field-level validation issues
```json
{
  "success": false,
  "message": "Validation failed",
  "errorType": "validation_error",
  "details": [
    { "field": "userId", "message": "String must contain at least 1 character" }
  ]
}
```

### 2. **Missing Required Fields** (400)
- **Trigger**: Required query/path parameters are missing
- **errorType**: `missing_required_field`
```json
{
  "success": false,
  "message": "userId required",
  "errorType": "missing_required_field"
}
```

### 3. **Invalid JSON** (400)
- **Trigger**: Malformed JSON in request body
- **errorType**: `invalid_json`
```json
{
  "success": false,
  "message": "Invalid JSON in request body",
  "errorType": "invalid_json"
}
```

### 4. **Database Validation Errors** (400)
- **Trigger**: Mongoose schema validation failure
- **errorType**: `db_validation_error`
```json
{
  "success": false,
  "message": "Validation failed error description"
}
```

### 5. **Invalid Data Type** (400)
- **Trigger**: Invalid type cast (e.g., invalid MongoDB ObjectId)
- **errorType**: `invalid_reference`
```json
{
  "success": false,
  "message": "Invalid value for fieldName",
  "errorType": "invalid_reference"
}
```

### 6. **Duplicate Key Error** (409)
- **Trigger**: Unique constraint violation (duplicate emails, names, etc.)
- **errorType**: `duplicate_error`
- **Details**: Shows which field caused the duplicate
```json
{
  "success": false,
  "message": "Duplicate value for name",
  "errorType": "duplicate_error",
  "details": { "name": "John" }
}
```

### 7. **Not Found** (404)
- **Trigger**: Resource doesn't exist or access denied
- **errorType**: `not_found`
```json
{
  "success": false,
  "message": "Entry not found or access denied",
  "errorType": "not_found"
}
```

### 8. **Invalid Credentials** (401)
- **Trigger**: Authentication failure (wrong password)
- **errorType**: `invalid_credentials`
```json
{
  "success": false,
  "message": "Invalid password",
  "errorType": "invalid_credentials"
}
```

### 9. **CORS Error** (403)
- **Trigger**: Request from unauthorized origin
- **errorType**: `cors_error`
```json
{
  "success": false,
  "message": "Request origin is not allowed by CORS policy",
  "errorType": "cors_error"
}
```

### 10. **Route Not Found** (404)
- **Trigger**: Endpoint doesn't exist
- **errorType**: `route_not_found`
```json
{
  "success": false,
  "message": "Route not found",
  "errorType": "route_not_found"
}
```

### 11. **Server Error** (500)
- **Trigger**: Unhandled exceptions or database connection failures
- **errorType**: `server_error`
```json
{
  "success": false,
  "message": "Internal server error or specific error description",
  "errorType": "server_error"
}
```

## Implementation Details

### Global Error Handler
Located in `src/utils/error-handler.ts`, provides:
- `handleControllerError(res, error, defaultStatus)` - Use in controller catch blocks
- `globalErrorHandler(error, req, res, next)` - Express middleware for unhandled errors

### How to Use in Controllers

```typescript
import { handleControllerError } from '../utils/error-handler.js';

export const myController = async (req: Request, res: Response) => {
  try {
    // Your logic here
    res.json({ success: true, data });
  } catch (error) {
    handleControllerError(res, error);
  }
};
```

### Error Detection Logic
The error handler automatically detects and formats:
1. Zod validation errors
2. Mongoose validation errors (ValidationError)
3. Mongoose cast errors (invalid ObjectId)
4. MongoDB duplicate key errors (code 11000)
5. Not found errors
6. CORS errors
7. JSON parsing errors
8. Any custom errors via error.statusCode or error.status

## Frontend Integration
The frontend can:
1. Check `errorType` to provide context-specific help
2. Display `message` directly to users
3. Use `details` for showing multiple validation issues
4. Log `errorType` for analytics/debugging

### Example Frontend Handling
```typescript
try {
  const response = await api.post('/api/track/start', data);
  if (!response.success) {
    switch (response.errorType) {
      case 'validation_error':
        response.details.forEach(issue => {
          showFieldError(issue.field, issue.message);
        });
        break;
      case 'duplicate_error':
        showAlert(`${response.message} - Please use a different value`);
        break;
      case 'not_found':
        showAlert('The resource was not found');
        break;
      default:
        showAlert(response.message);
    }
  }
} catch (error) {
  showAlert('Network error occurred');
}
```

## Benefits
✅ Consistent error responses across all endpoints
✅ User-friendly error messages
✅ Detailed validation feedback
✅ Easy frontend error handling
✅ Better debugging with error types
✅ Proper HTTP status codes
✅ Handles all common error scenarios
