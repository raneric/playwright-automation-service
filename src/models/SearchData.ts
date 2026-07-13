export interface SearchData {
  customer: string;
  products: ProducInfo[];
}

export interface ProducInfo{
  item_code: string;
  product_name: string;
  order_codes: string;
}
