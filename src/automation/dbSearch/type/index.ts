export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryParams {
  page: number;
  limit: number;
  sort: string;
  order: 'ASC' | 'DESC';
  search?: string | undefined;
  [key: string]: string | number | undefined;
}
