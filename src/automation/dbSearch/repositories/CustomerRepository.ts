import { Op, type FindOptions, type WhereOptions } from 'sequelize';
import { Customer } from '../models/index.js';
import { PaginatedResult, QueryParams } from '../type/index.js';

export class CustomerRepository {
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
        { name: { [Op.iLike]: `%${search}%` } },
        { organization: { [Op.iLike]: `%${search}%` } },
        { department: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const filterableFields: Array<keyof typeof filters & string> = [
      'id',
      'name',
      'organization',
      'department',
      'city',
      'state',
      'zip',
    ];
    for (const [key, value] of Object.entries(filters)) {
      if (
        value !== undefined &&
        value !== '' &&
        filterableFields.includes(key)
      ) {
        if (
          key === 'name' ||
          key === 'organization' ||
          key === 'department' ||
          key === 'city'
        ) {
          (where as Record<string, unknown>)[key] = {
            [Op.iLike]: `%${value}%`,
          };
        } else {
          (where as Record<string, unknown>)[key] = value;
        }
      }
    }

    const allowedSortFields = [
      'id',
      'name',
      'organization',
      'department',
      'city',
      'state',
      'zip',
    ];
    const sortField = allowedSortFields.includes(sort) ? sort : 'id';
    const sortOrder = order === 'DESC' ? 'DESC' : 'ASC';

    const findOptions: FindOptions = {
      where,
      order: [[sortField, sortOrder]],
    };

    return { where, findOptions };
  }

  async findAll(query: QueryParams): Promise<PaginatedResult<Customer>> {
    const { page = 1, limit = 25 } = query;
    const offset = (page - 1) * limit;

    const { findOptions } = this.parseQueryParams(query);

    const { rows, count } = await Customer.findAndCountAll({
      ...findOptions,
      offset,
      limit,
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

  async findById(id: number): Promise<Customer | null> {
    return Customer.findByPk(id);
  }
}

export const customerRepository = new CustomerRepository();
