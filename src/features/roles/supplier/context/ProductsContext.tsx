import React, { createContext, useContext, useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  lastOrdered: string;
}

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  updateStock: (productId: string, newStock: number) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | null>(null);

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setProducts([
          { id: '1', name: 'Widget A', sku: 'WA-100', price: 12.99, stock: 150, lastOrdered: '2023-05-15' },
          { id: '2', name: 'Gadget B', sku: 'GB-200', price: 24.50, stock: 75, lastOrdered: '2023-05-18' }
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to fetch products');
      setLoading(false);
    }
  };

  const updateStock = async (productId: string, newStock: number) => {
    setProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, stock: newStock } : p)
    );
  };

  return (
    <ProductsContext.Provider value={{ products, loading, error, fetchProducts, updateStock }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};