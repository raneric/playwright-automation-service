import {
  Op,
  type FindOptions,
  type WhereOptions,
  type Includeable,
} from 'sequelize';
import { PurchaseOrder, Vendor, Customer } from '../models/index.js';
import { PaginatedResult, QueryParams } from '../type/index.js';

export class PurchaseOrderRepository {
  private includes: Includeable[] = [
    { model: Vendor, as: 'vendor' },
    { model: Customer, as: 'customer' },
  ];

  private parseQueryParams(query: QueryParams): {
    where: WhereOptions;
    findOptions: FindOptions;
  } {
    const {
      page: _page,
      limit: _limit,
      sort,
      order,
      search,
      ...filters
    } = query;
    const where: WhereOptions = {};

    if (search) {
      where[Op.or as keyof WhereOptions] = [
        { document_number: { [Op.iLike]: `%${search}%` } },
        { order_code: { [Op.iLike]: `%${search}%` } },
        { product_name: { [Op.iLike]: `%${search}%` } },
        { item_code: { [Op.iLike]: `%${search}%` } },
        { lot_number: { [Op.iLike]: `%${search}%` } },
        { vendor_name: { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const filterableFields: Array<keyof typeof filters & string> = [
      'id',
      'status',
      'vendor_id',
      'customer_id',
      'document_number',
      'order_code',
    ];

    const searchableFilterFields = [
      'product_name',
      'vendor_name',
      'customer_name',
      'item_code',
      'lot_number',
    ];

    const numericFilterFields = ['vendor_id', 'customer_id'];

    for (const [key, value] of Object.entries(filters)) {
      if (
        value !== undefined &&
        value !== '' &&
        filterableFields.includes(key)
      ) {
        if (numericFilterFields.includes(key)) {
          (where as Record<string, unknown>)[key] = Number(value);
        } else if (searchableFilterFields.includes(key)) {
          (where as Record<string, unknown>)[key] = {
            [Op.iLike]: `%${value}%`,
          };
        } else if (key !== 'vendor_id' && key !== 'customer_id') {
          (where as Record<string, unknown>)[key] = value;
        }
      }
    }

    const allowedSortFields = [
      'id',
      'date',
      'document_number',
      'status',
      'vendor_name',
      'customer_name',
      'order_code',
    ];
    const sortField = allowedSortFields.includes(sort) ? sort : 'id';
    const sortOrder = order === 'DESC' ? 'DESC' : 'ASC';

    const findOptions: FindOptions = {
      where,
      order: [[sortField, sortOrder]],
      include: this.includes,
    };

    return { where, findOptions };
  }

  async findAll(query: QueryParams): Promise<PaginatedResult<PurchaseOrder>> {
    const { page = 1, limit = 25 } = query;
    const offset = (page - 1) * limit;

    const { findOptions } = this.parseQueryParams(query);

    const { rows, count } = await PurchaseOrder.findAndCountAll({
      ...findOptions,
      offset,
      limit,
      distinct: true,
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async findById(id: number): Promise<PurchaseOrder | null> {
    return PurchaseOrder.findByPk(id, {
      include: this.includes,
    });
  }

  findWhere(whereClause: Record<string, any>): Promise<PurchaseOrder[]> {
    return PurchaseOrder.findAll({
      where: whereClause,
      include: this.includes,
      order: [['id', 'ASC']],
    });
  }

  async findByOrderCode(orderCode: string): Promise<PurchaseOrder[]> {
    return PurchaseOrder.findAll({
      where: { order_code: orderCode },
      include: this.includes,
      order: [['id', 'ASC']],
    });
  }
}

export const purchaseOrderRepository = new PurchaseOrderRepository();
