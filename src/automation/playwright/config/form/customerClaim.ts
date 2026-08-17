import { FormConfig } from './types';

export const customerClaimConfig: FormConfig = {
  prefix: 'cc',
  fields: [
    {
      key: 'request',
      children: [
        { key: 'date_of_request', path: 'request.date_of_request' },
        { key: 'requestor', path: 'request.requestor' },
      ],
    },
    {
      key: 'vendor',
      children: [
        { key: 'name', path: 'vendor.name' },
        { key: 'email', path: 'vendor.email' },
        { key: 'phone', path: 'vendor.phone' },
        { key: 'street', path: 'vendor.street' },
        { key: 'city', path: 'vendor.city' },
        { key: 'state', path: 'vendor.state' },
        { key: 'zip', path: 'vendor.zip' },
      ],
    },
    {
      key: 'customer',
      children: [
        { key: 'organization', path: 'customer.organization' },
        { key: 'department', path: 'customer.department' },
        { key: 'name', path: 'customer.name' },
        { key: 'email', path: 'customer.email' },
        { key: 'phone', path: 'customer.phone' },
        { key: 'street', path: 'customer.street' },
        { key: 'city', path: 'customer.city' },
        { key: 'state', path: 'customer.state' },
        { key: 'zip', path: 'customer.zip' },
      ],
    },
    { key: 'issues', path: 'issues' },
  ],
  items: {
    addButtonTestId: 'cc-add-item-btn',
    rowFields: [
      { key: 'item_code' },
      { key: 'quantity' },
      { key: 'product_name' },
      { key: 'order_code' },
      { key: 'lot_number' },
      { key: 'vendor_name' },
      { key: 'order_date' },
    ],
  },
  serverErrorTestId: 'server-error',
  formValidationErrorTestId: 'validation-error',
  submitTestId: 'submit-btn',
  successTestId: 'success-message',
};
