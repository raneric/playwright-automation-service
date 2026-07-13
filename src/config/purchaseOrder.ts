import { FormConfig } from "./types";

export const purchaseOrderConfig: FormConfig = {
  prefix: "po",
  fields: [
    { key: "document_number" },
    { key: "order_code" },
    { key: "date" },
    { key: "status" },
    { key: "vendor_id" },
    { key: "vendor_name" },
    { key: "vendor_entity_id" },
    { key: "customer_id" },
    { key: "customer_name" },
    { key: "product_name" },
    { key: "item_code" },
    { key: "lot_number" },
    { key: "quantity_ordered" },
    { key: "quantity_billed" },
    { key: "quantity_received" },
  ],
};