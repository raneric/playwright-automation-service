import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database.js";

export class PurchaseOrder extends Model<
  InferAttributes<PurchaseOrder>,
  InferCreationAttributes<PurchaseOrder>
> {
  declare id: number;
  declare date: Date;
  declare document_number: string;
  declare status: string;
  declare product_name: string;
  declare item_code: string;
  declare lot_number: string;
  declare quantity_ordered: number;
  declare vendor_entity_id: number;
  declare vendor_name: string;
  declare vendor_id: number;
  declare quantity_billed: number;
  declare quantity_received: number;
  declare customer_name: string;
  declare customer_id: number;
  declare order_code: string;
}

PurchaseOrder.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    document_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    item_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    lot_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    quantity_ordered: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    vendor_entity_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    vendor_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    vendor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity_billed: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    order_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "PurchaseOrder",
    tableName: "purchase_orders",
    freezeTableName: true,
    timestamps: false,
  }
);