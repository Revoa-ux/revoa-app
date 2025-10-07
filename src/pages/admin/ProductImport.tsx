import React, { useState } from 'react';
import { Upload, Package, Image, Film, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  supplier_price: string;
  recommended_retail_price: string;
  external_id: string;
  main_image?: File;
  lifestyle_images: File[];
  gifs: File[];
  demo_video?: File;
  instagram_urls: string[];
}

const CATEGORIES = [
  'Lighting',
  'Home',
  'Fitness',
  'Beauty',
  'Kitchen',
  'Garden',
  'Electronics',
  'Pets',
  'Kids',
  'Sports'
];

export default function ProductImport() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: '',
    supplier_price: '',
    recommended_retail_price: '',
    external_id: '',
    lifestyle_images: [],
    gifs: [],
    instagram_urls: ['']
  });

  const handleFileChange = (field: keyof ProductFormData, files: FileList | null) => {
    if (!files) return;

    if (field === 'lifestyle_images' || field === 'gifs') {
      setFormData(prev => ({ ...prev, [field]: Array.from(files) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: files[0] }));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('product-assets')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('product-assets')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const externalId = formData.external_id || `manual:${slug}:${Date.now()}`;

      const images = [];
      const media = [];
      const creatives = [];

      if (formData.main_image) {
        const url = await uploadFile(
          formData.main_image,
          `${formData.category.toLowerCase()}/${slug}/main.jpg`
        );
        images.push({ url, type: 'main', display_order: 0 });
      }

      for (let i = 0; i < formData.lifestyle_images.length; i++) {
        const url = await uploadFile(
          formData.lifestyle_images[i],
          `${formData.category.toLowerCase()}/${slug}/lifestyle-${i + 1}.jpg`
        );
        images.push({ url, type: 'lifestyle', display_order: i + 1 });
      }

      for (let i = 0; i < formData.gifs.length; i++) {
        const url = await uploadFile(
          formData.gifs[i],
          `${formData.category.toLowerCase()}/${slug}/gif-${i + 1}.gif`
        );
        creatives.push({
          type: 'ad',
          url,
          platform: 'meta',
          is_inspiration: false
        });
      }

      if (formData.demo_video) {
        const url = await uploadFile(
          formData.demo_video,
          `${formData.category.toLowerCase()}/${slug}/demo.mp4`
        );
        media.push({ url, type: 'video', description: 'Product demo' });
      }

      formData.instagram_urls.filter(url => url.trim()).forEach(url => {
        creatives.push({
          type: 'reel',
          url: url.trim(),
          platform: 'instagram',
          is_inspiration: true
        });
      });

      const payload = {
        source: 'manual_import',
        mode: 'upsert',
        products: [{
          external_id: externalId,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          supplier_price: parseFloat(formData.supplier_price),
          recommended_retail_price: parseFloat(formData.recommended_retail_price),
          images,
          media,
          creatives,
          metadata: {
            imported_at: new Date().toISOString()
          }
        }]
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await response.json();

      if (result.successful > 0) {
        toast.success(`Product imported successfully! Review in Product Approvals.`);
        setFormData({
          name: '',
          description: '',
          category: '',
          supplier_price: '',
          recommended_retail_price: '',
          external_id: '',
          lifestyle_images: [],
          gifs: [],
          instagram_urls: ['']
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import product');
    } finally {
      setLoading(false);
    }
  };

  const addInstagramUrl = () => {
    setFormData(prev => ({
      ...prev,
      instagram_urls: [...prev.instagram_urls, '']
    }));
  };

  const updateInstagramUrl = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      instagram_urls: prev.instagram_urls.map((url, i) => i === index ? value : url)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Products</h1>
          <p className="text-gray-600">Add new products with images, GIFs, and Instagram inspiration</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">GIF Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Minimum 3 GIFs per product</li>
                  <li>1-5 seconds duration, looping</li>
                  <li>NO text overlays or watermarks</li>
                  <li>High-res, smooth motion</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Solar Step Lights"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Benefit-led description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                External ID (optional)
              </label>
              <input
                type="text"
                value={formData.external_id}
                onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ig:POST_ID:product-slug"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.supplier_price}
                onChange={(e) => setFormData({ ...formData, supplier_price: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="9.80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommended Retail Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.recommended_retail_price}
                onChange={(e) => setFormData({ ...formData, recommended_retail_price: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="29.40"
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Product Assets
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Image (1080×1080, light grey background)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('main_image', e.target.files)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lifestyle Images (optional, multiple)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange('lifestyle_images', e.target.files)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.lifestyle_images.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">{formData.lifestyle_images.length} file(s) selected</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GIFs (minimum 3, no text!)
              </label>
              <input
                type="file"
                accept="image/gif"
                multiple
                onChange={(e) => handleFileChange('gifs', e.target.files)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.gifs.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">{formData.gifs.length} GIF(s) selected</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demo Video (optional)
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange('demo_video', e.target.files)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Instagram Inspiration Reels
              </h3>
              <button
                type="button"
                onClick={addInstagramUrl}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add URL
              </button>
            </div>

            {formData.instagram_urls.map((url, index) => (
              <input
                key={index}
                type="url"
                value={url}
                onChange={(e) => updateInstagramUrl(index, e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://www.instagram.com/reel/..."
              />
            ))}
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
