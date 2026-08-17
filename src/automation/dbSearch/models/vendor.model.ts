import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database.js";

export class Vendor extends Model<InferAttributes<Vendor>, InferCreationAttributes<Vendor>> {
  declare id: number;
  declare street: string;
  declare city: string;
  declare state: string;
  declare zip: string;
  declare name: string;
  declare phone: string;
  declare email: string;
}

Vendor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false,
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(2),
      allowNull: false,
    },
    zip: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Vendor",
    tableName: "vendors",
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ["name"],
      },
    ],
  }
);