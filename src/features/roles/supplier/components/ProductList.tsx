// src/features/roles/supplier/components/ProductList.tsx
import React from "react";
import { Product } from "@types";

interface ProductListProps {
  products: Product[];
  onProductClick: (productId: number) => void; // Function to handle product click
}

const ProductList: React.FC<ProductListProps> = ({ products, onProductClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-xl hover:scale-105 transform transition-all duration-300 cursor-pointer"
          onClick={() => onProductClick(product.id)}
        >
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{product.name}</h2>
          
          {/* Description with fallback */}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {product.description || 'No description available'}
          </p>
          
          {/* Product type with fallback */}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            النوع: {product.type || 'N/A'}
          </p>
          
          {/* Price */}
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            {product.price} ريال
          </p>
          
          {/* Weight */}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            الوزن: {product.weight} جرام
          </p>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
