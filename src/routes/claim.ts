import { createPostRoute } from "../utils/routeFactory";
import { createCustomerClaim } from "../services/createCustomerClaim";
import { credentials } from "../utils/const";
import { ClaimInput, transformClaimInput } from "../models/customerClaim";

export const claimRouter = createPostRoute<ClaimInput>(
  "customer claim creation",
  async (input) => {
    const formClaim = transformClaimInput(input);
    const result = await createCustomerClaim(formClaim, credentials);
    return result;
  },
);