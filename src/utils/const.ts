import { LoginCredentials } from "../services/login";

export const FAKE_UI_BASE_URL = "http://localhost:5173";

export const PagePath = {
  purchaseOrder: "/purchase-order",
  purchaseOrderList: "/purchase-orders",
  customerClaim: "/customer-claim",
};

export const credentials: LoginCredentials = {
  username: "admin",
  password: "password123",
  loginUrl: `${FAKE_UI_BASE_URL}/login`,
};
