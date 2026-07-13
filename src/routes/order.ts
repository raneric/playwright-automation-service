import { createPostRoute } from "../utils/routeFactory";
import { createOrder } from "../services/createOrder";
import { credentials } from "../utils/const";
import { Order } from "../models/order";

export const orderRouter = createPostRoute<Order>("order creation", (order) =>
  createOrder(order, credentials),
);
