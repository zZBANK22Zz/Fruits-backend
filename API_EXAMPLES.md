# API Endpoints Examples

Base URL: `http://localhost:3000`

---

## 🔐 Authentication Endpoints

### 1. Register User
**POST** `/api/auth/register`

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Login User
**POST** `/api/auth/login`

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 👤 User Management Endpoints

### 3. Get Current User Profile
**GET** `/api/users/profile`

**Request:**
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### 4. Get All Users (Admin Only)
**GET** `/api/users`

**Request:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <admin_token>"
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "role": "user",
        "created_at": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": 2,
        "username": "admin",
        "email": "admin@example.com",
        "role": "admin",
        "created_at": "2024-01-14T08:20:00.000Z"
      }
    ]
  }
}
```

---

### 5. Update User Role (Admin Only)
**PUT** `/api/users/:userId/role`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/users/1/role \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User role updated successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "admin",
      "updated_at": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

---

### 6. Edit User
**PUT** `/api/users/:userId`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_updated",
    "email": "john.updated@example.com",
    "password": "newpassword123"
  }'
```

**Request Body:**
```json
{
  "username": "john_updated",
  "email": "john.updated@example.com",
  "password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "john_updated",
      "email": "john.updated@example.com",
      "role": "user",
      "updated_at": "2024-01-15T11:15:00.000Z"
    }
  }
}
```

---

### 7. Delete User
**DELETE** `/api/users/:userId`

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/users/1 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
}
```

---

## 🍎 Fruit Management Endpoints

### 8. Get All Fruits (Public)
**GET** `/api/fruits`

**Request:**
```bash
curl -X GET http://localhost:3000/api/fruits
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Fruits fetched successfully",
  "data": {
    "fruits": [
      {
        "id": 1,
        "name": "Apple",
        "description": "Fresh red apples",
        "price": 2.50,
        "stock": 100,
        "image_url": "/uploads/fruits/apple.jpg",
        "category": "Pome",
        "created_at": "2024-01-15T10:00:00.000Z",
        "updated_at": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": 2,
        "name": "Banana",
        "description": "Sweet yellow bananas",
        "price": 1.75,
        "stock": 150,
        "image_url": "/uploads/fruits/banana.jpg",
        "category": "Tropical",
        "created_at": "2024-01-15T10:05:00.000Z",
        "updated_at": "2024-01-15T10:05:00.000Z"
      }
    ]
  }
}
```

---

### 9. Get Fruit by ID (Public)
**GET** `/api/fruits/:id`

**Request:**
```bash
curl -X GET http://localhost:3000/api/fruits/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Fruit fetched successfully",
  "data": {
    "fruit": {
      "id": 1,
      "name": "Apple",
      "description": "Fresh red apples",
      "price": 2.50,
      "stock": 100,
      "image_url": "/uploads/fruits/apple.jpg",
      "category": "Pome",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Fruit not found"
}
```

---

### 10. Create Fruit (Admin Only)
**POST** `/api/fruits`

**Request:**
```bash
curl -X POST http://localhost:3000/api/fruits \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Orange",
    "description": "Juicy sweet oranges",
    "price": 3.00,
    "stock": 80,
    "image_url": "/uploads/fruits/orange.jpg",
    "category": "Citrus"
  }'
```

**Request Body:**
```json
{
  "name": "Orange",
  "description": "Juicy sweet oranges",
  "price": 3.00,
  "stock": 80,
  "image_url": "/uploads/fruits/orange.jpg",
  "category": "Citrus"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Fruit created successfully",
  "data": {
    "fruit": {
      "id": 3,
      "name": "Orange",
      "description": "Juicy sweet oranges",
      "price": 3.00,
      "stock": 80,
      "image_url": "/uploads/fruits/orange.jpg",
      "category": "Citrus",
      "created_at": "2024-01-15T11:30:00.000Z",
      "updated_at": "2024-01-15T11:30:00.000Z"
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Name and price are required"
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Fruit with this name already exists"
}
```

---

### 11. Update Fruit (Admin Only)
**PUT** `/api/fruits/:id`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/fruits/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Red Apple",
    "price": 2.75,
    "stock": 120
  }'
```

**Request Body (partial update - only include fields to update):**
```json
{
  "name": "Red Apple",
  "price": 2.75,
  "stock": 120
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Fruit updated successfully",
  "data": {
    "fruit": {
      "id": 1,
      "name": "Red Apple",
      "description": "Fresh red apples",
      "price": 2.75,
      "stock": 120,
      "image_url": "/uploads/fruits/apple.jpg",
      "category": "Pome",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T12:00:00.000Z"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Fruit not found"
}
```

---

### 12. Delete Fruit (Admin Only)
**DELETE** `/api/fruits/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/fruits/1 \
  -H "Authorization: Bearer <admin_token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Fruit deleted successfully",
  "data": {
    "fruit": {
      "id": 1,
      "name": "Apple",
      "description": "Fresh red apples",
      "price": 2.50,
      "stock": 100,
      "image_url": "/uploads/fruits/apple.jpg",
      "category": "Pome",
      "created_at": "2024-01-15T10:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Fruit not found"
}
```

---

## 🔒 Authentication Notes

- **Public Endpoints**: No authentication required
  - `GET /api/fruits`
  - `GET /api/fruits/:id`

- **Authenticated Endpoints**: Require `Authorization: Bearer <token>` header
  - All `/api/users/*` endpoints (except admin-only ones)

- **Admin Only Endpoints**: Require admin token
  - `GET /api/users` (get all users)
  - `PUT /api/users/:userId/role`
  - `POST /api/fruits`
  - `PUT /api/fruits/:id`
  - `DELETE /api/fruits/:id`

---

## 📝 Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided. Authorization header must be: Bearer <token>"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details here"
}
```

