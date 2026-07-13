/** All user-facing routes on the target SaaS application */
export const PagePath = {
  login: '/login',
  purchaseOrder: '/purchase-order',
  purchaseOrderList: '/purchase-orders',
  customerClaim: '/customer-claim',
} as const;

export type PagePath = (typeof PagePath)[keyof typeof PagePath];
