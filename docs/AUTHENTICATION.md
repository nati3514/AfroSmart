# Authentication API

This document describes the authentication flow and API endpoints for user authentication and token management.

## Authentication Flow

1. **Login**: User logs in with email/password and receives an access token and refresh token
2. **Access Protected Routes**: Use the access token in the `Authorization` header
3. **Token Expiry**: When the access token expires, use the refresh token to get a new one
4. **Logout**: Invalidate the refresh token to log out the user

## Security Considerations

- **Access Token**: Short-lived (15-60 minutes) JWT token sent in the `Authorization` header
- **Refresh Token**: Long-lived token (7-30 days) stored as an HTTP-only cookie
- **Rate Limiting**: All auth endpoints are rate limited to prevent brute force attacks
- **Device Tracking**: Each device gets a unique refresh token

## API Endpoints

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user",
      "isEmailVerified": false,
      "isActive": true
    },
    "tokens": {
      "access": {
        "token": "eyJhbGciOiJ...",
        "expires": "2025-08-19T09:00:00.000Z"
      }
    }
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh-token
```

**Request Headers:**
```
Authorization: Bearer <refresh_token>
```

**OR**

**Request Body:**
```json
{
  "refreshToken": "<refresh_token>"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "tokens": {
      "access": {
        "token": "new_access_token_here",
        "expires": "2025-08-19T10:00:00.000Z"
      },
      "refresh": {
        "token": "new_refresh_token_here",
        "expires": "2025-08-26T08:00:00.000Z"
      }
    }
  }
}
```

### Logout

```http
POST /api/auth/logout
```

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "<refresh_token>"
}
```

**Response:**
```http
204 No Content
```

## Error Responses

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Please authenticate"
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Account is deactivated"
}
```

### 429 Too Many Requests
```json
{
  "status": "error",
  "message": "Too many requests from this IP, please try again after 15 minutes"
}
```
## Client Implementation Guide

### Web (Next.js)

```javascript
// lib/auth.js
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // For cookies
});

// Add request interceptor to include access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true });
        const { access } = data.data.tokens;
        
        // Save new access token
        localStorage.setItem('accessToken', access.token);
        
        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${access.token}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (error) {
        // If refresh fails, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { access } = response.data.data.tokens;
  
  // Store access token in memory
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access.token);
  }
  
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    // Clear client-side tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }
};
```

### Mobile (Flutter)

```dart
// lib/services/auth_service.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  final Dio _dio = Dio();
  final String _baseUrl = 'http://your-api-url/api';
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  AuthService() {
    _dio.options.baseUrl = _baseUrl;
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _secureStorage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            // Try to refresh token
            try {
              final refreshToken = await _secureStorage.read(key: 'refresh_token');
              if (refreshToken != null) {
                final response = await _dio.post(
                  '$_baseUrl/auth/refresh-token',
                  data: {'refreshToken': refreshToken},
                );
                
                final newAccessToken = response.data['data']['tokens']['access']['token'];
                await _secureStorage.write(
                  key: 'access_token',
                  value: newAccessToken,
                );
                
                // Retry the original request
                final opts = error.requestOptions;
                opts.headers['Authorization'] = 'Bearer $newAccessToken';
                return _dio.fetch(opts);
              }
            } catch (e) {
              // Refresh token failed, redirect to login
              await _secureStorage.deleteAll();
              // Navigate to login screen
              // Get.offAllNamed('/login');
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '$_baseUrl/auth/login',
        data: {'email': email, 'password': password},
      );
      
      final tokens = response.data['data']['tokens'];
      await _secureStorage.write(
        key: 'access_token',
        value: tokens['access']['token'],
      );
      
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _secureStorage.read(key: 'refresh_token');
      if (refreshToken != null) {
        await _dio.post(
          '$_baseUrl/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      }
    } finally {
      await _secureStorage.deleteAll();
    }
  }
}
```

## Testing the API

### 1. Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Access protected route
```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <access_token>"
```

### 4. Refresh token
```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Authorization: Bearer <refresh_token>"
```

### 5. Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

## Security Best Practices

1. **Never store access tokens in localStorage** - Use HTTP-only cookies or secure storage
2. **Implement token rotation** - Refresh tokens should be rotated on each use
3. **Use short expiration times** - 15-60 minutes for access tokens
4. **Implement rate limiting** - Prevent brute force attacks
5. **Use HTTPS** - Always use HTTPS in production
6. **Implement CSRF protection** - For web applications
7. **Log security events** - Monitor for suspicious activity
8. **Implement device tracking** - Track and manage devices with active sessions
