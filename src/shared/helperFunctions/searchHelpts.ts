import { ProductDTO } from '../../app/dto/ClaimDTO';
import { SearchTerm } from '../types/FakeUISaas';
import { stringValueProvided } from './valueCheck';

export function extractTerm(product: ProductDTO): SearchTerm {
  if (stringValueProvided(product.orderCode)) {
    return {
      type: 'order_code',
      value: product.orderCode,
    };
  }

  if (stringValueProvided(product.lotNumber)) {
    return {
      type: 'lot_number',
      value: product.lotNumber,
    };
  }

  if (stringValueProvided(product.itemCode)) {
    return {
      type: 'item_code',
      value: product.itemCode,
    };
  }

  return {
    type: 'product_name',
    value: product.productName,
  };
}
