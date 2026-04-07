# Backend Connection Guide for Frontend

## Overview
This guide provides all necessary information for the frontend to connect to the GestionHuilerie Backend API.

---

## 1. Base Configuration

### Server Details
- **Backend URL:** `http://localhost:8000`
- **API Base Path:** `/api`
- **Full API URL:** `http://localhost:8000/api`

### Database Connection (Backend Only)
- **Database:** MySQL
- **Host:** localhost
- **Port:** 3306
- **Database Name:** gestionhuilerie
- **Driver:** com.mysql.cj.jdbc.Driver

---

## 2. CORS Configuration

The backend is configured to accept requests from frontends running on:
- `http://localhost:*` (any port on localhost)
- `http://127.0.0.1:*` (any port on 127.0.0.1)

### Allowed HTTP Methods
- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS

### Allowed Headers
- All headers (`*`)

### Credentials
- Yes, credentials are allowed

### Cache Duration
- Max Age: 3600 seconds (1 hour)

---

## 3. Authentication & JWT

### Overview
The backend uses JWT (JSON Web Token) for authentication.

### Token Configuration
- **Token Type:** Bearer Token
- **Token Expiration:** 86,400,000 ms (24 hours)
- **Refresh Token Expiration:** 604,800,000 ms (7 days)
- **Secret Key:** Configured server-side (do not hardcode)

### Authentication Flow

#### Step 1: Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "user",
  "password": "password"
}
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "123",
  "username": "user",
  "huilerie": {...}
}
```

#### Step 2: Use Token in Requests
Include the JWT token in the Authorization header for all protected endpoints:

```
Authorization: Bearer <token>
```

**Example Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Step 3: Token Refresh
**Endpoint:** `POST /api/auth/refresh-token`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 4. Available API Endpoints

### Authentication Endpoints
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user (if enabled)
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### User & Profile Endpoints
- `GET /api/utilisateur` - List all users (admin only)
- `GET /api/utilisateur/{id}` - Get user details
- `PUT /api/utilisateur/{id}` - Update user
- `POST /api/profil` - Create profile
- `GET /api/profil` - Get profiles

### Huilerie (Oil Mill) Endpoints
- `GET /api/huilerie` - List all oil mills
- `GET /api/huilerie/{id}` - Get specific oil mill
- `POST /api/huilerie` - Create new oil mill
- `PUT /api/huilerie/{id}` - Update oil mill
- `DELETE /api/huilerie/{id}` - Delete oil mill

### Production Endpoints
- `GET /api/guide-production` - List production guides
- `GET /api/guide-production/{id}` - Get production guide details
- `POST /api/guide-production` - Create production guide
- `PUT /api/guide-production/{id}` - Update production guide

- `GET /api/execution-production` - List production executions
- `POST /api/execution-production` - Create production execution

### Stock Management
- `GET /api/stock` - List inventory items
- `GET /api/stock/{id}` - Get stock details
- `POST /api/stock` - Create stock item
- `PUT /api/stock/{id}` - Update stock
- `DELETE /api/stock/{id}` - Delete stock

- `GET /api/stock-movement` - List stock movements
- `POST /api/stock-movement` - Record stock movement

### Machine Management
- `GET /api/machine` - List machines
- `POST /api/machine` - Create machine
- `PUT /api/machine/{id}` - Update machine
- `DELETE /api/machine/{id}` - Delete machine

### Lot Management
- `GET /api/lot-olives` - List olive lots
- `POST /api/lot-olives` - Create olive lot
- `GET /api/lot-olives/{id}` - Get lot details

### Traceability
- `GET /api/traceability` - Get traceability information
- `GET /api/traceability/{id}` - Get specific traceability record

### Permissions
- `GET /api/permission` - List permissions
- `POST /api/permission` - Create permission
- `PUT /api/permission/{id}` - Update permission
- `DELETE /api/permission/{id}` - Delete permission

### Module Management
- `GET /api/module` - List modules
- `POST /api/module` - Create module

---

## 5. Error Handling

### Common HTTP Status Codes
- **200 OK** - Request succeeded
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request format
- **401 Unauthorized** - Missing or invalid token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

### Error Response Format
```json
{
  "message": "Error description",
  "status": 400,
  "timestamp": "2026-04-07T10:30:00Z"
}
```

---

## 6. Frontend Setup Example

### Configuration File (frontend/.env or similar)
```
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_API_TIMEOUT=5000
```

### API Client Setup (Example with Axios)
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwtToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Call refresh endpoint
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 7. Data Transfer Objects (DTOs)

### Common Response Format
Most endpoints return data wrapped in an API response:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### Authentication Response (AuthResponseDTO)
```json
{
  "token": "string",
  "refreshToken": "string",
  "userId": "number",
  "username": "string",
  "huilerie": {...}
}
```

---

## 8. Email Configuration

The backend is configured to send emails via Gmail:
- **SMTP Host:** smtp.gmail.com
- **SMTP Port:** 587
- **Email:** Huileriaa@gmail.com
- **Features:** Password reset emails, notifications (if implemented)

---

## 9. Dashboard Link

The frontend dashboard may redirect to:
```
http://localhost:64412/pages/dashboard/production
```

---

## 10. Development Notes

- **Cors Max Age:** 3600 seconds (1 hour)
- **Token Duration:** 24 hours (refresh token: 7 days)
- **Time Zone:** Server-based
- **Charset:** UTF-8

---

## 11. Common Integration Tasks

### Login Flow
1. User submits credentials
2. Call `POST /api/auth/login`
3. Store returned `token` in localStorage/sessionStorage
4. Store returned `refreshToken` for token refresh
5. Set Authorization header for subsequent requests

### Protected Endpoints
1. Attach JWT token to Authorization header
2. If you receive 401, refresh token using refresh endpoint
3. Retry original request with new token

### Logout Flow
1. Call `POST /api/auth/logout` (optional)
2. Clear `token` and `refreshToken` from storage
3. Redirect to login page

---

**Last Updated:** April 7, 2026
**Backend Version:** Spring Boot 3.x
**API Version:** v1
