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
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
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
      "first_name": "John",
      "last_name": "Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400 Bad Request - Missing Fields):**
```json
{
  "success": false,
  "message": "Please provide username, email, password, first_name, and last_name"
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
      "first_name": "John",
      "last_name": "Doe",
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
      "first_name": "John",
      "last_name": "Doe",
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
        "first_name": "John",
        "last_name": "Doe",
        "role": "user",
        "created_at": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": 2,
        "username": "admin",
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "User",
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
      "first_name": "John",
      "last_name": "Doe",
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
    "password": "newpassword123",
    "first_name": "John",
    "last_name": "Updated"
  }'
```

**Request Body:**
```json
{
  "username": "john_updated",
  "email": "john.updated@example.com",
  "password": "newpassword123",
  "first_name": "John",
  "last_name": "Updated"
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
      "first_name": "John",
      "last_name": "Updated",
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

## 🛒 Order Management Endpoints

### 13. Create Order (Authenticated Users)
**POST** `/api/orders`

**Request:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "fruit_id": 1,
        "quantity": 2
      },
      {
        "fruit_id": 2,
        "quantity": 3
      }
    ],
    "shipping_address": "123 Main Street",
    "shipping_city": "Bangkok",
    "shipping_postal_code": "10110",
    "shipping_country": "Thailand",
    "payment_method": "Thai QR PromptPay",
    "notes": "Please handle with care"
  }'
```

**Request Body:**
```json
{
  "items": [
    {
      "fruit_id": 1,
      "quantity": 2
    },
    {
      "fruit_id": 2,
      "quantity": 3
    }
  ],
  "shipping_address": "123 Main Street",
  "shipping_city": "Bangkok",
  "shipping_postal_code": "10110",
  "shipping_country": "Thailand",
  "payment_method": "Thai QR PromptPay",
  "notes": "Please handle with care"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": 1,
      "user_id": 1,
      "order_number": "ORD-2024-0115-1",
      "status": "pending",
      "total_amount": 10.25,
      "shipping_address": "123 Main Street",
      "shipping_city": "Bangkok",
      "shipping_postal_code": "10110",
      "shipping_country": "Thailand",
      "payment_method": "Thai QR PromptPay",
      "notes": "Please handle with care",
      "created_at": "2024-01-15T14:30:00.000Z",
      "updated_at": "2024-01-15T14:30:00.000Z",
      "username": "john_doe",
      "email": "john@example.com",
      "items": [
        {
          "id": 1,
          "order_id": 1,
          "fruit_id": 1,
          "quantity": 2,
          "price": 2.50,
          "subtotal": 5.00,
          "fruit_name": "Apple",
          "fruit_image": "/uploads/fruits/apple.jpg"
        },
        {
          "id": 2,
          "order_id": 1,
          "fruit_id": 2,
          "quantity": 3,
          "price": 1.75,
          "subtotal": 5.25,
          "fruit_name": "Banana",
          "fruit_image": "/uploads/fruits/banana.jpg"
        }
      ]
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Order items are required"
}
```

**Error Response (400 Bad Request - Insufficient Stock):**
```json
{
  "success": false,
  "message": "Insufficient stock for Apple. Available: 5, Requested: 10"
}
```

---

### 14. Get My Orders (Authenticated Users)
**GET** `/api/orders/my-orders`

**Request:**
```bash
curl -X GET http://localhost:3000/api/orders/my-orders \
  -H "Authorization: Bearer <your_token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": {
    "orders": [
      {
        "id": 1,
        "user_id": 1,
        "order_number": "ORD-2024-0115-1",
        "status": "pending",
        "total_amount": 10.25,
        "shipping_address": "123 Main Street",
        "shipping_city": "Bangkok",
        "shipping_postal_code": "10110",
        "shipping_country": "Thailand",
        "payment_method": "Thai QR PromptPay",
        "notes": "Please handle with care",
        "created_at": "2024-01-15T14:30:00.000Z",
        "updated_at": "2024-01-15T14:30:00.000Z",
        "item_count": 2
      },
      {
        "id": 2,
        "user_id": 1,
        "order_number": "ORD-2024-0114-2",
        "status": "confirmed",
        "total_amount": 5.50,
        "shipping_address": "456 Second Street",
        "shipping_city": "Bangkok",
        "shipping_postal_code": "10120",
        "shipping_country": "Thailand",
        "payment_method": "Thai QR PromptPay",
        "notes": null,
        "created_at": "2024-01-14T10:20:00.000Z",
        "updated_at": "2024-01-14T11:00:00.000Z",
        "item_count": 1
      }
    ]
  }
}
```

---

### 15. Get Order by ID (Owner or Admin)
**GET** `/api/orders/:id`

**Request:**
```bash
curl -X GET http://localhost:3000/api/orders/1 \
  -H "Authorization: Bearer <your_token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order fetched successfully",
  "data": {
    "order": {
      "id": 1,
      "user_id": 1,
      "order_number": "ORD-2024-0115-1",
      "status": "pending",
      "total_amount": 10.25,
      "shipping_address": "123 Main Street",
      "shipping_city": "Bangkok",
      "shipping_postal_code": "10110",
      "shipping_country": "Thailand",
      "payment_method": "Thai QR PromptPay",
      "notes": "Please handle with care",
      "created_at": "2024-01-15T14:30:00.000Z",
      "updated_at": "2024-01-15T14:30:00.000Z",
      "username": "john_doe",
      "email": "john@example.com",
      "items": [
        {
          "id": 1,
          "order_id": 1,
          "fruit_id": 1,
          "quantity": 2,
          "price": 2.50,
          "subtotal": 5.00,
          "fruit_name": "Apple",
          "fruit_image": "/uploads/fruits/apple.jpg"
        },
        {
          "id": 2,
          "order_id": 1,
          "fruit_id": 2,
          "quantity": 3,
          "price": 1.75,
          "subtotal": 5.25,
          "fruit_name": "Banana",
          "fruit_image": "/uploads/fruits/banana.jpg"
        }
      ]
    }
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied. You can only view your own orders"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Order not found"
}
```

---

### 16. Get All Orders (Admin Only)
**GET** `/api/orders/all`

**Request:**
```bash
curl -X GET http://localhost:3000/api/orders/all \
  -H "Authorization: Bearer <admin_token>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All orders fetched successfully",
  "data": {
    "orders": [
      {
        "id": 1,
        "user_id": 1,
        "order_number": "ORD-2024-0115-1",
        "status": "pending",
        "total_amount": 10.25,
        "shipping_address": "123 Main Street",
        "shipping_city": "Bangkok",
        "shipping_postal_code": "10110",
        "shipping_country": "Thailand",
        "payment_method": "Thai QR PromptPay",
        "notes": "Please handle with care",
        "created_at": "2024-01-15T14:30:00.000Z",
        "updated_at": "2024-01-15T14:30:00.000Z",
        "username": "john_doe",
        "email": "john@example.com",
        "item_count": 2
      },
      {
        "id": 2,
        "user_id": 2,
        "order_number": "ORD-2024-0114-2",
        "status": "confirmed",
        "total_amount": 8.00,
        "shipping_address": "789 Third Avenue",
        "shipping_city": "Bangkok",
        "shipping_postal_code": "10130",
        "shipping_country": "Thailand",
        "payment_method": "Thai QR PromptPay",
        "notes": null,
        "created_at": "2024-01-14T10:20:00.000Z",
        "updated_at": "2024-01-14T11:00:00.000Z",
        "username": "jane_smith",
        "email": "jane@example.com",
        "item_count": 1
      }
    ]
  }
}
```

---

### 17. Update Order Status (Admin Only)
**PUT** `/api/orders/:id/status`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/orders/1/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Valid Status Values:**
- `pending` - Order created, waiting for payment
- `confirmed` - Payment confirmed, stock reduced
- `processing` - Order being prepared
- `paid` - Payment completed
- `cancelled` - Order cancelled (stock restored if was confirmed)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "order": {
      "id": 1,
      "user_id": 1,
      "order_number": "ORD-2024-0115-1",
      "status": "confirmed",
      "total_amount": 10.25,
      "shipping_address": "123 Main Street",
      "shipping_city": "Bangkok",
      "shipping_postal_code": "10110",
      "shipping_country": "Thailand",
      "payment_method": "Thai QR PromptPay",
      "notes": "Please handle with care",
      "created_at": "2024-01-15T14:30:00.000Z",
      "updated_at": "2024-01-15T15:00:00.000Z",
      "username": "john_doe",
      "email": "john@example.com",
      "items": [
        {
          "id": 1,
          "order_id": 1,
          "fruit_id": 1,
          "quantity": 2,
          "price": 2.50,
          "subtotal": 5.00,
          "fruit_name": "Apple",
          "fruit_image": "/uploads/fruits/apple.jpg"
        },
        {
          "id": 2,
          "order_id": 1,
          "fruit_id": 2,
          "quantity": 3,
          "price": 1.75,
          "subtotal": 5.25,
          "fruit_name": "Banana",
          "fruit_image": "/uploads/fruits/banana.jpg"
        }
      ]
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid status. Must be one of: pending, confirmed, processing, paid, cancelled"
}
```

**Error Response (400 Bad Request - Insufficient Stock):**
```json
{
  "success": false,
  "message": "Insufficient stock for fruit ID 1"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Order not found"
}
```

---

## 🔒 Authentication Notes

- **Public Endpoints**: No authentication required
  - `GET /api/fruits`
  - `GET /api/fruits/:id`

- **Authenticated Endpoints**: Require `Authorization: Bearer <token>` header
  - All `/api/users/*` endpoints (except admin-only ones)
  - `POST /api/orders` (create order)
  - `GET /api/orders/my-orders` (get user's orders)
  - `GET /api/orders/:id` (get order by ID - owner or admin)

- **Admin Only Endpoints**: Require admin token
  - `GET /api/users` (get all users)
  - `PUT /api/users/:userId/role`
  - `POST /api/fruits`
  - `PUT /api/fruits/:id`
  - `DELETE /api/fruits/:id`
  - `GET /api/orders/all` (get all orders)
  - `PUT /api/orders/:id/status` (update order status)

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

