import { Vendor } from "./vendor.model.js";
import { Customer } from "./customer.model.js";
import { PurchaseOrder } from "./purchase-order.model.js";
import { Claim } from "./claim.model.js";

Vendor.hasMany(PurchaseOrder, {
  foreignKey: "vendor_id",
  sourceKey: "id",
  as: "purchaseOrders",
});

PurchaseOrder.belongsTo(Vendor, {
  foreignKey: "vendor_id",
  targetKey: "id",
  as: "vendor",
});

Customer.hasMany(PurchaseOrder, {
  foreignKey: "customer_id",
  sourceKey: "id",
  as: "purchaseOrders",
});

PurchaseOrder.belongsTo(Customer, {
  foreignKey: "customer_id",
  targetKey: "id",
  as: "customer",
});

export { Vendor, Customer, PurchaseOrder, Claim };
