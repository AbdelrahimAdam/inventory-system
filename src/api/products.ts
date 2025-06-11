// src/api/products.ts
import { Product } from "../types";

export const fetchProducts = async (): Promise<Product[]> => {
  // Simulating an API call with some mock products
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          name: "زجاجة عطر فاخر",
          description: "زجاجة عطر فاخرة للتعبئة",
          type: "زجاجة",
          price: 50,
          weight: 200,
        },
        {
          id: 2,
          name: "غطاء عطر معدني",
          description: "غطاء معدني لزجاجات العطر",
          type: "غطاء",
          price: 10,
          weight: 50,
        },
      ]);
    }, 1000);
  });
};
