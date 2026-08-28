export const APP_NAME = "Bodygraph Manager";

export const CURRENCY = "USD";
export const CURRENCY_LOCALE = "en-US";

export const DEFAULT_PAGE_SIZE = 10;

export const MEMBERSHIP_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "PENDING",
] as const;

export const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "UPI",
  "BANK_TRANSFER",
  "OTHER",
] as const;

export const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const;

export const ATTENDANCE_METHODS = ["QR", "MANUAL"] as const;

export const WORKOUT_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"] as const;

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export const NOTIFICATION_TYPES = [
  "MEMBERSHIP_EXPIRY",
  "MEMBERSHIP_RENEWAL",
  "PAYMENT_REMINDER",
  "PAYMENT_CONFIRMATION",
  "WORKOUT_ASSIGNED",
  "DIET_ASSIGNED",
  "ANNOUNCEMENT",
  "LOW_STOCK",
  "GENERAL",
] as const;

export const INVENTORY_TRANSACTION_TYPES = ["STOCK_IN", "STOCK_OUT"] as const;

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "CHECK_IN",
  "CHECK_OUT",
  "OTHER",
] as const;

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Number of days out from today a membership counts as "expiring soon". */
export const MEMBERSHIP_EXPIRY_WINDOW_DAYS = 7;

/** Inclusive threshold under which an inventory item is considered low stock. */
export const LOW_STOCK_DEFAULT_THRESHOLD = 5;
