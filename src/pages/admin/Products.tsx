import React, { useState, useRef } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Check,
  X,
  Package,
  ArrowUpDown,
  ArrowUp,
  Image as ImageIcon,
} from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  itemCost: number;
  shippingCost: number;
  recommendedPrice: number;
  images: string[];
}

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  variants: ProductVariant[];
  createdAt: string;
  sales: number;
}

interface ProductFormModalProps {
  onClose: () => void;
  onSubmit: (product: Partial<Product>) => Promise<void>;
  product?: Product;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  onClose,
  onSubmit,
  product
}) => {
  const [formData, setFormData] = useState<Partial<Product>>(product || {
    name: '',
    description: '',
    category: '',
    variants: [{
      id: Date.now().toString(),
      name: 'Default',
      sku: '',
      itemCost: 0,
      shippingCost: 0,
      recommendedPrice: 0,
      images: []
    }]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'basic' | 'variants'>('basic');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(categoryDropdownRef, () => setShowCategoryDropdown(false));

  const categories = ['Electronics', 'Fashion', 'Home', 'Beauty'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.variants?.length) {
        throw new Error('At least one variant is required');
      }

      if (!formData.category?.trim()) {
        throw new Error('Category is required');
      }

      for (const variant of formData.variants) {
        if (!variant.name || !variant.sku) {
          throw new Error('All variants must have a name and SKU');
        }
        if (variant.itemCost <= 0 || variant.recommendedPrice <= 0) {
          throw new Error('Costs and prices must be greater than 0');
        }
      }

      await onSubmit({
        ...formData,
        category: formData.category.trim()
      });
      toast.success('Product saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const addVariant = () => {
    const currentLength = formData.variants?.length || 0;
    setFormData(prev => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          id: Date.now().toString(),
          name: `Variant ${currentLength + 1}`,
          sku: '',
          itemCost: 0,
          shippingCost: 0,
          recommendedPrice: 0,
          images: []
        }
      ]
    }));
    setActiveVariantIndex(currentLength);
  };

  const removeVariant = (index: number) => {
    if (formData.variants?.length === 1) {
      toast.error('At least one variant is required');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.filter((_, i) => i !== index)
    }));
    
    if (activeVariantIndex >= index) {
      setActiveVariantIndex(Math.max(0, activeVariantIndex - 1));
    }
  };

  const updateVariant = (index: number, updates: Partial<ProductVariant>) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.map((variant, i) => 
        i === index ? { ...variant, ...updates } : variant
      )
    }));
  };

  const addImage = (variantIndex: number, imageUrl: string) => {
    if (!imageUrl.startsWith('http')) {
      toast.error('Please enter a valid image URL');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.map((variant, i) => 
        i === variantIndex ? {
          ...variant,
          images: [...variant.images, imageUrl]
        } : variant
      )
    }));
  };

  const removeImage = (variantIndex: number, imageIndex: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.map((variant, i) => 
        i === variantIndex ? {
          ...variant,
          images: variant.images.filter((_, imgI) => imgI !== imageIndex)
        } : variant
      )
    }));
  };

  const activeVariant = formData.variants?.[activeVariantIndex];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      maxWidth="max-w-4xl"
    >
      <div className="mb-6 flex border border-gray-200 rounded-lg p-1 bg-gray-100">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
            activeTab === 'basic'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Basic Information
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('variants')}
          className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
            activeTab === 'variants'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Variants & Images
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 'basic' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative" ref={categoryDropdownRef}>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  onClick={() => setShowCategoryDropdown(true)}
                  className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                  placeholder="Select or enter category"
                />
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {showCategoryDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-64 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, category }));
                          setShowCategoryDropdown(false);
                        }}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                      >
                        <span>{category}</span>
                        {formData.category === category && (
                          <Check className="w-4 h-4 text-primary-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex space-x-4">
            <div className="w-48 space-y-2">
              {formData.variants?.map((variant, index) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setActiveVariantIndex(index)}
                  className={`w-full px-4 py-2 text-sm text-left rounded-lg transition-colors flex items-center justify-between group ${
                    activeVariantIndex === index
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="truncate">{variant.name || `Variant ${index + 1}`}</span>
                  {formData.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVariant(index);
                      }}
                      className={`p-1 rounded-lg transition-colors ${
                        activeVariantIndex === index
                          ? 'hover:bg-gray-800 text-white'
                          : 'hover:bg-gray-300 text-gray-500'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={addVariant}
                className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Variant
              </button>
            </div>

            {activeVariant && (
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variant Name
                    </label>
                    <input
                      type="text"
                      value={activeVariant.name}
                      onChange={(e) => updateVariant(activeVariantIndex, { name: e.target.value })}
                      className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                      placeholder="e.g., Small, Red, 128GB"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={activeVariant.sku}
                      onChange={(e) => updateVariant(activeVariantIndex, { sku: e.target.value })}
                      className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                      placeholder="Enter SKU"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pricing
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Item Cost</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={activeVariant.itemCost}
                          onChange={(e) => updateVariant(activeVariantIndex, { itemCost: parseFloat(e.target.value) })}
                          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Shipping Cost</label>
                      <div className="relative">
                        <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={activeVariant.shippingCost}
                          onChange={(e) => updateVariant(activeVariantIndex, { shippingCost: parseFloat(e.target.value) })}
                          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Recommended Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={activeVariant.recommendedPrice}
                          onChange={(e) => updateVariant(activeVariantIndex, { recommendedPrice: parseFloat(e.target.value) })}
                          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Images
                  </label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      {activeVariant.images.map((imageUrl, imageIndex) => (
                        <div 
                          key={imageIndex}
                          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
                        >
                          <img
                            src={imageUrl}
                            alt={`${activeVariant.name} ${imageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(activeVariantIndex, imageIndex)}
                            className="absolute top-1 right-1 p-1 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      ))}
                      {activeVariant.images.length < 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = window.prompt('Enter image URL:');
                            if (url) addImage(activeVariantIndex, url);
                          }}
                          className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Add up to 4 images for this variant. Images should be product photos with white background.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : (product ? 'Save Changes' : 'Add Product')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default function AdminProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>(['Electronics', 'Fashion', 'Home', 'Beauty']);
  
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(categoryDropdownRef, () => setShowCategoryDropdown(false));

  const categories = ['All Categories', ...availableCategories];

  const handleAddProduct = async (productData: Partial<Product>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProduct = {
        id: Date.now().toString(),
        ...productData,
        createdAt: new Date().toISOString(),
        sales: 0
      } as Product;
      
      // Update products
      setProducts(prev => [newProduct, ...prev]);

      // Add new category if it doesn't exist
      if (newProduct.category && !availableCategories.includes(newProduct.category)) {
        setAvailableCategories(prev => [...prev, newProduct.category]);
      }

      toast.success('Product added successfully');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 mb-2">
          Product Management
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500">
            Manage and create products for the marketplace
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative" ref={categoryDropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between min-w-[180px]"
            >
              <div className="flex items-center">
                <Filter className="w-4 h-4 text-gray-400 mr-2" />
                <span>{selectedCategory}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showCategoryDropdown && (
              <div className="absolute z-50 w-[180px] mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowCategoryDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>{category}</span>
                    {selectedCategory === category && (
                      <Check className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Add your first product to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            Add Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-200"
            >
              {/* Product card content */}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <ProductFormModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProduct}
        />
      )}
    </div>
  );
}