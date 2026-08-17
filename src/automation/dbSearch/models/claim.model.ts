import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from "sequelize";
import { sequelize } from "../config/database.js";

export class Claim extends Model<
  InferAttributes<Claim>,
  InferCreationAttributes<Claim>
> {
  declare id: CreationOptional<number>;
  declare issues: string | null;
  declare request_info: object;
  declare customer: object;
  declare products: object[] | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Claim.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    issues: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    request_info: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    customer: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    products: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Claim",
    tableName: "claims",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
