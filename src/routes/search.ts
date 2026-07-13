import { searchProduct } from "../services/searchProduct";
import { credentials } from "../utils/const";
import { createPostRoute } from "../utils/routeFactory";
import { SearchData } from "../models/SearchData";

export const searchRouter = createPostRoute<SearchData>(
  "Product search",
  (products) => searchProduct(products, credentials),
);
