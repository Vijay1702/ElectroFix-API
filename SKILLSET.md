# ElectroFix - Repair Shop Management System

# Backend API Architecture Documentation

---

## 1. Backend Technology Stack

### Core Technologies

- Node.js
- Express.js
- TypeScript

---

## 2. Database

### Recommended Database

- PostgreSQL

---

## 3. ORM

### Recommended ORM

- Prisma ORM

---

## 4. Backend Architecture Standards

### IMPORTANT DEVELOPMENT RULES

#### Rule 1

DO NOT write business logic directly inside routes.

**BAD:**

```ts
router.get("/customers", async (req, res) => {
  const customers = await prisma.customer.findMany();

  res.json(customers);
});
```

**GOOD:**

```ts
router.get("/customers", customerController.getCustomers);
```

---

#### Rule 2

Controllers should ONLY:

- Receive request
- Validate request
- Call service layer
- Send response

---

#### Rule 3

Business logic MUST be inside services.

---

#### Rule 4

Database queries MUST be handled using:

- Prisma ORM

---

#### Rule 5

DO NOT hardcode:

- Status values
- Messages
- Roles
- API paths

Use constants/config files.

---

#### Rule 6

All API responses MUST use common response format.

---

## 5. Recommended Backend Folder Structure

```txt
backend/
├── prisma/
│
├── src/
│   ├── api/
│   │
│   ├── config/
│   │
│   ├── constants/
│   │
│   ├── controllers/
│   │
│   ├── services/
│   │
│   ├── repositories/
│   │
│   ├── middlewares/
│   │
│   ├── routes/
│   │
│   ├── validators/
│   │
│   ├── utils/
│   │
│   ├── types/
│   │
│   ├── helpers/
│   │
│   ├── i18n/
│   │
│   ├── logs/
│   │
│   └── app.ts
│
├── .env
├── package.json
└── tsconfig.json
```

---

## 6. API Layer Architecture

### Request Flow

```txt
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma ORM
  ↓
PostgreSQL
```

---

## 7. Environment Configuration

### IMPORTANT RULE

DO NOT hardcode:

- DB URLs
- JWT Secret
- API Port
- API Base URL

---

### .env Example

```env
PORT=5000

DATABASE_URL="postgresql://postgres:password@localhost:5432/repair_shop"

JWT_SECRET=repair_shop_secret

JWT_EXPIRES_IN=7d

API_PREFIX=/api/v1
```

---

## 8. Route Architecture

### Recommended Route Structure

```txt
src/routes/
├── auth.routes.ts
├── customer.routes.ts
├── repair.routes.ts
├── product.routes.ts
├── billing.routes.ts
├── payment.routes.ts
└── report.routes.ts
```

---

### Route Example

#### customer.routes.ts

```ts
router.get("/", authMiddleware, customerController.getCustomers);

router.post(
  "/",
  authMiddleware,
  validate(createCustomerSchema),
  customerController.createCustomer
);
```

---

## 9. Controller Architecture

### Purpose

Controllers handle:

- Request
- Response
- Validation
- Error forwarding

---

### Controller Structure

```txt
src/controllers/
├── auth.controller.ts
├── customer.controller.ts
├── repair.controller.ts
├── product.controller.ts
├── billing.controller.ts
└── payment.controller.ts
```

---

### Controller Example

```ts
export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customers = await customerService.getCustomers();

    return successResponse(res, customers);
  } catch (error) {
    next(error);
  }
};
```

---

## 10. Service Layer Architecture

### IMPORTANT RULE

All business logic MUST be inside services.

---

### Service Structure

```txt
src/services/
├── auth.service.ts
├── customer.service.ts
├── repair.service.ts
├── product.service.ts
├── billing.service.ts
└── payment.service.ts
```

---

### Service Responsibilities

#### Example

Repair Service:

- Create repair job
- Update status
- Assign technician
- Validate repair flow
- Generate invoice data

---

### Service Example

```ts
export const createRepairJob = async (
  payload: CreateRepairPayload
) => {
  return repairRepository.create(payload);
};
```

---

## 11. Repository Layer

### Purpose

Handle all database operations.

---

### Repository Structure

```txt
src/repositories/
├── customer.repository.ts
├── repair.repository.ts
├── product.repository.ts
├── billing.repository.ts
└── payment.repository.ts
```

---

### Repository Example

```ts
export const getCustomers = async () => {
  return prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};
```

---

## 12. Prisma ORM Architecture

### Prisma Folder Structure

```txt
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

---

### schema.prisma Example

```prisma
model Customer {
  id          String   @id @default(uuid())
  name        String
  phoneNumber String
  address     String?
  createdAt   DateTime @default(now())
}
```

---

## 13. Validation Architecture

### Recommended Libraries

- Zod
- Express Validator

---

### Validator Structure

```txt
src/validators/
├── auth.validator.ts
├── customer.validator.ts
├── repair.validator.ts
├── product.validator.ts
└── billing.validator.ts
```

---

### Validation Example

```ts
export const createCustomerSchema = z.object({
  name: z.string().min(3),
  phoneNumber: z.string().min(10),
});
```

---

## 14. Authentication Architecture

### Recommended

Use:

- JWT Authentication

---

### Features

- Login
- Logout
- Access Token
- Refresh Token
- Role-based access

---

### User Roles

```txt
ADMIN
STAFF
TECHNICIAN
```

---

### JWT Middleware Example

```ts
export const authMiddleware = (
  req,
  res,
  next
) => {
  const token = req.headers.authorization;

  if (!token) {
    throw new UnauthorizedError();
  }

  next();
};
```

---

## 15. Authorization Architecture

### IMPORTANT RULE

Protect routes based on user roles.

---

### Example

```ts
router.post(
  "/products",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  productController.createProduct
);
```

---

## 16. API Response Standards

### IMPORTANT RULE

All responses MUST use common format.

---

### Success Response

```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": [],
  "statusCode": 200
}
```

---

### Error Response

```json
{
  "success": false,
  "message": "Invalid request",
  "errors": [],
  "statusCode": 400
}
```

---

## 17. Common Response Helpers

### Path

```txt
src/utils/response.ts
```

---

### Example

```ts
export const successResponse = (
  res,
  data,
  message = "Success"
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};
```

---

## 18. Error Handling Architecture

### IMPORTANT RULE

Use centralized error handling.

---

### Middleware Structure

```txt
src/middlewares/error.middleware.ts
```

---

### Example

```ts
app.use(errorMiddleware);
```

---

### Error Middleware Example

```ts
export const errorMiddleware = (
  err,
  req,
  res,
  next
) => {
  return res.status(500).json({
    success: false,
    message: err.message,
  });
};
```

---

## 19. Constants Architecture

### IMPORTANT RULE

DO NOT hardcode statuses/messages.

---

### Constants Folder

```txt
src/constants/
├── repair-status.constants.ts
├── roles.constants.ts
├── payment-status.constants.ts
└── messages.constants.ts
```

---

### repair-status.constants.ts

```ts
export const REPAIR_STATUS = {
  RECEIVED: "received",
  UNDER_REPAIR: "under_repair",
  WAITING_PARTS: "waiting_parts",
  DELIVERED: "delivered",
};
```

---

## 20. Logger Architecture

### Recommended

Use:

- Winston
- Morgan

---

### Logger Structure

```txt
src/logs/
├── error.log
└── combined.log
```

---

## 21. File Upload Architecture

### Recommended

Use:

- Multer

---

### Upload Features

- Device image upload
- Invoice PDF upload
- Product image upload

---

### Upload Folder

```txt
uploads/
├── repairs/
├── products/
└── invoices/
```

---

## 22. Notification Architecture

### Future Features

- WhatsApp notifications
- SMS notifications
- Email notifications

---

### Recommended Structure

```txt
src/services/notification/
├── whatsapp.service.ts
├── sms.service.ts
└── email.service.ts
```

---

## 23. Payment Architecture

### Features

- Full payment
- Partial payment
- Pending payment
- Advance payment

---

### Payment Status

```ts
export const PAYMENT_STATUS = {
  PAID: "paid",
  PARTIAL: "partial",
  PENDING: "pending",
};
```

---

## 24. Repair Workflow Architecture

### Repair Status Flow

```txt
RECEIVED
   ↓
UNDER_INSPECTION
   ↓
UNDER_REPAIR
   ↓
WAITING_PARTS
   ↓
READY_FOR_DELIVERY
   ↓
DELIVERED
```

---

## 25. API Versioning

### IMPORTANT RULE

Always use API versioning.

---

### Example

```txt
/api/v1/customers
/api/v1/products
```

---

## 26. Security Standards

### Recommended Security Packages

- helmet
- cors
- rate-limit
- bcrypt

---

### Features

- Password hashing
- API rate limiting
- Secure headers
- CORS protection

---

## 27. Caching Architecture (Future)

### Recommended

Use:

- Redis

---

### Usage

- Dashboard caching
- Report caching
- Session caching

---

## 28. Documentation Standards

### Recommended

Use:

- Swagger

---

### Swagger Route

```txt
/api-docs
```

---

## 29. Testing Architecture

### Recommended

Use:

- Jest
- Supertest

---

### Test Structure

```txt
tests/
├── auth/
├── customer/
├── repair/
└── product/
```

---

## 30. Deployment Architecture

### Recommended Deployment

#### Backend

- Railway
- Render
- Docker

#### Database

- PostgreSQL

---

### Recommended Production Stack

```txt
Frontend  → Vercel
Backend   → Railway
Database  → PostgreSQL
Storage   → Cloudinary / Local Storage
```

---

## 31. Final Backend Architecture Goal

The backend must be:

- Clean architecture
- Scalable
- Secure
- Modular
- Maintainable
- Service based
- Enterprise ready
- API standardized
- Multi-language ready
- Role based
- Production ready
