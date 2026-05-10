export const MESSAGES = {
  // Auth
  AUTH: {
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logout successful",
    INVALID_CREDENTIALS: "Invalid email or password",
    TOKEN_EXPIRED: "Token has expired",
    TOKEN_INVALID: "Invalid token",
    TOKEN_REQUIRED: "Authentication token is required",
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "You do not have permission to perform this action",
    REFRESH_SUCCESS: "Token refreshed successfully",
  },

  // User
  USER: {
    CREATED: "User created successfully",
    UPDATED: "User updated successfully",
    DELETED: "User deleted successfully",
    FETCHED: "Users fetched successfully",
    FETCHED_ONE: "User fetched successfully",
    NOT_FOUND: "User not found",
    EMAIL_EXISTS: "Email already exists",
    INACTIVE: "User account is inactive",
  },

  // Customer
  CUSTOMER: {
    CREATED: "Customer created successfully",
    UPDATED: "Customer updated successfully",
    DELETED: "Customer deleted successfully",
    FETCHED: "Customers fetched successfully",
    FETCHED_ONE: "Customer fetched successfully",
    NOT_FOUND: "Customer not found",
    HISTORY_FETCHED: "Customer history fetched successfully",
  },

  // Repair
  REPAIR: {
    CREATED: "Repair job created successfully",
    UPDATED: "Repair job updated successfully",
    DELETED: "Repair job deleted successfully",
    FETCHED: "Repair jobs fetched successfully",
    FETCHED_ONE: "Repair job fetched successfully",
    NOT_FOUND: "Repair job not found",
    STATUS_UPDATED: "Repair status updated successfully",
    TIMELINE_FETCHED: "Repair timeline fetched successfully",
    IMAGE_UPLOADED: "Repair image uploaded successfully",
  },

  // Category
  CATEGORY: {
    CREATED: "Category created successfully",
    UPDATED: "Category updated successfully",
    DELETED: "Category deleted successfully",
    FETCHED: "Categories fetched successfully",
    NOT_FOUND: "Category not found",
  },

  // Product
  PRODUCT: {
    CREATED: "Product created successfully",
    UPDATED: "Product updated successfully",
    DELETED: "Product deleted successfully",
    FETCHED: "Products fetched successfully",
    FETCHED_ONE: "Product fetched successfully",
    NOT_FOUND: "Product not found",
    LOW_STOCK_FETCHED: "Low stock products fetched successfully",
  },

  // Stock
  STOCK: {
    MOVEMENT_CREATED: "Stock movement recorded successfully",
    MOVEMENTS_FETCHED: "Stock movements fetched successfully",
  },

  // Invoice
  INVOICE: {
    CREATED: "Invoice created successfully",
    UPDATED: "Invoice updated successfully",
    DELETED: "Invoice deleted successfully",
    FETCHED: "Invoices fetched successfully",
    FETCHED_ONE: "Invoice fetched successfully",
    NOT_FOUND: "Invoice not found",
    PDF_GENERATED: "Invoice PDF generated successfully",
  },

  // Payment
  PAYMENT: {
    CREATED: "Payment recorded successfully",
    FETCHED: "Payments fetched successfully",
    FETCHED_ONE: "Payment fetched successfully",
    NOT_FOUND: "Payment not found",
  },

  // Dashboard
  DASHBOARD: {
    SUMMARY_FETCHED: "Dashboard summary fetched successfully",
    RECENT_REPAIRS_FETCHED: "Recent repairs fetched successfully",
    RECENT_SALES_FETCHED: "Recent sales fetched successfully",
    LOW_STOCK_FETCHED: "Low stock items fetched successfully",
  },

  // Report
  REPORT: {
    SALES_FETCHED: "Sales report fetched successfully",
    REPAIRS_FETCHED: "Repair report fetched successfully",
    PRODUCTS_FETCHED: "Product report fetched successfully",
    PAYMENTS_FETCHED: "Payment report fetched successfully",
  },

  // Notification
  NOTIFICATION: {
    FETCHED: "Notifications fetched successfully",
    MARKED_READ: "Notification marked as read",
    NOT_FOUND: "Notification not found",
  },

  // Settings
  SETTING: {
    FETCHED: "Settings fetched successfully",
    UPDATED: "Settings updated successfully",
  },

  // Upload
  UPLOAD: {
    SUCCESS: "File uploaded successfully",
    DELETED: "File deleted successfully",
    NOT_FOUND: "File not found",
    INVALID_TYPE: "Invalid file type",
  },

  // General
  GENERAL: {
    INTERNAL_ERROR: "Internal server error",
    VALIDATION_ERROR: "Validation error",
    NOT_FOUND: "Resource not found",
    BAD_REQUEST: "Bad request",
  },
} as const;
