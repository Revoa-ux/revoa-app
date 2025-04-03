import React, { useState, useEffect } from 'react';
import { Import, FormInput, Check, Search, X, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

interface ProductSetupProps {
  onComplete: (completed: boolean) => void;
  storeConnected: boolean;
}

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  variants: number;
  selected: boolean;
}

const ProductSetup: React.FC<ProductSetupProps> = ({ onComplete, storeConnected }) => {
  const [option, setOption] = useState<'import' | 'new' | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);
  
  useEffect(() => {
    if (option === 'import' && storeConnected) {
      loadProducts();
    }
  }, [option, storeConnected]);
  
  useEffect(() => {
    setSelectedCount(products.filter(p => p.selected).length);
  }, [products]);
  
  const loadProducts = () => {
    setIsLoading(true);
    setTimeout(() => {
      const mockProducts: Product[] = Array.from({ length: 12 }, (_, i) => ({
        id: `product-${i}`,
        title: `Product ${i + 1}`,
        price: `$${(Math.random() * 100).toFixed(2)}`,
        image: `https://source.unsplash.com/random/200x200?product=${i}`,
        variants: Math.floor(Math.random() * 3) + 1,
        selected: false
      }));
      setProducts(mockProducts);
      setIsLoading(false);
    }, 1500);
  };
  
  const handleOptionSelect = (selectedOption: 'import' | 'new') => {
    setOption(selectedOption);
  };
  
  const handleToggleProduct = (productId: string) => {
    setProducts(prev => 
      prev.map(p => 
        p.id === productId 
          ? { ...p, selected: !p.selected } 
          : p
      )
    );
  };
  
  const handleSelectAll = () => {
    setProducts(prev => prev.map(p => ({ ...p, selected: true })));
  };
  
  const handleDeselectAll = () => {
    setProducts(prev => prev.map(p => ({ ...p, selected: false })));
  };
  
  const handleImportSelected = () => {
    if (selectedCount === 0) {
      toast.error('Please select at least one product');
      return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onComplete(true);
      toast.success(`${selectedCount} products imported successfully`);
    }, 1500);
  };
  
  const filteredProducts = searchTerm
    ? products.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 mb-4">
            <img 
              src="https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//REVOA%20Sync%20Products.png"
              alt="Revoa Product Sync"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900 mb-3">Set Up Your Products</h2>
          <p className="mt-1 text-gray-600">
            Choose how you want to set up your products in Revoa.
          </p>
        </div>
        
        <div className="space-y-3 mt-6">
          <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
            option === 'import' 
              ? 'border-gray-900 bg-gray-50/50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <button
              onClick={() => handleOptionSelect('import')}
              className={`w-full p-4 text-left transition-colors ${
                storeConnected 
                  ? '' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              disabled={!storeConnected}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Import className="w-5 h-5 text-gray-900" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900">Import Existing Products</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Import products from your connected Shopify store.
                  </p>
                  {!storeConnected && (
                    <p className="mt-1 text-xs text-red-600">
                      You need to connect your Shopify store first.
                    </p>
                  )}
                </div>
              </div>
            </button>

            {option === 'import' && (
              <div className="px-4 pb-4">
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {isLoading ? (
                    <div className="text-center py-10">
                      <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3"></div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Loading Products</h3>
                      <p className="text-sm text-gray-500">
                        Please wait while we fetch your products from Shopify.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="relative flex-1 max-w-xs">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
                            >
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSelectAll}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Select All
                          </button>
                          <button
                            onClick={handleDeselectAll}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>
                      
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No products found.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {filteredProducts.map((product) => (
                            <div
                              key={product.id}
                              className={`border rounded-lg overflow-hidden transition-colors cursor-pointer ${
                                product.selected 
                                  ? 'border-gray-900 bg-gray-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleToggleProduct(product.id)}
                            >
                              <div className="relative h-36 bg-gray-100">
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2">
                                  <input
                                    type="checkbox"
                                    checked={product.selected}
                                    onChange={() => handleToggleProduct(product.id)}
                                    className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="p-3">
                                <h3 className="text-sm font-medium text-gray-900 truncate">{product.title}</h3>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-sm text-gray-500">{product.price}</p>
                                  <p className="text-xs text-gray-400">{product.variants} variants</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-5 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {selectedCount} of {products.length} products selected
                        </div>
                        <button
                          onClick={handleImportSelected}
                          disabled={selectedCount === 0}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            selectedCount > 0
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Import Selected Products
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">or</span>
            </div>
          </div>
          
          <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
            option === 'new' 
              ? 'border-gray-900 bg-gray-50/50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <button
              onClick={() => handleOptionSelect('new')}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <FormInput className="w-5 h-5 text-gray-900" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium text-gray-900">No products yet? No problem!</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Chat with us to see if we can help you add a product that will sell and scale it for you!
                  </p>
                </div>
              </div>
            </button>

            {option === 'new' && (
              <div className="px-4 pb-4">
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Great choice!</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Please fill out the form below and we'll help you find the perfect product.
                    </p>
                  </div>

                  <div className="mt-4">
                    <a
                      href="https://revoa.app/form"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:scale-[1.02] transition-all duration-200 flex items-center justify-center"
                      onClick={() => onComplete(true)}
                    >
                      <span>Open Form</span>
                      <ArrowUpRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSetup;