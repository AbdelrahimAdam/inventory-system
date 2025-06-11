// src/features/roles/supplier/pages/ProductsPage.tsx
import React, { useEffect, useState } from "react";
import ProductList from "../components/ProductList";

interface Product {
  id: number;
  name: string;
  description: string;
  type: string;
  price: number;
  weight: number;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sort products by name, price, etc.
  const sortProducts = (products: Product[], sortBy: string) => {
    switch (sortBy) {
      case "name":
        return products.sort((a, b) => a.name.localeCompare(b.name));
      case "price":
        return products.sort((a, b) => a.price - b.price);
      case "type":
        return products.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return products;
    }
  };

  // Fetch products when component mounts
  useEffect(() => {
    const getProducts = async () => {
      try {
        const fetchedProducts = await fetchProducts(); // Replace with your API call
        setProducts(fetchedProducts);
      } catch (err) {
        setError("فشل تحميل المنتجات. حاول مرة أخرى لاحقاً.");
      } finally {
        setLoading(false);
      }
    };

    getProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-t-4 border-blue-600 rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-200">جاري تحميل المنتجات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
        قائمة المنتجات
      </h1>
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setProducts(sortProducts([...products], "name"))}
          className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ترتيب حسب الاسم
        </button>
        <button
          onClick={() => setProducts(sortProducts([...products], "price"))}
          className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ترتيب حسب السعر
        </button>
        <button
          onClick={() => setProducts(sortProducts([...products], "type"))}
          className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ترتيب حسب النوع
        </button>
      </div>

      <ProductList
        products={products}
        onProductClick={(id) => alert(`Product ID: ${id}`)} // Handle click (e.g., navigate to product detail)
      />
    </div>
  );
};

export default ProductsPage;
