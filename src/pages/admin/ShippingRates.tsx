import React, { useState, useEffect } from 'react';
import {
  Ship,
  Plus,
  Upload,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Download,
  AlertCircle,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import {
  getAllShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  bulkImportShippingRates,
  COMMON_COUNTRIES,
  ShippingRate,
  BulkShippingRateImport,
} from '@/lib/shippingRatesService';
import { supabase } from '@/lib/supabase';
import { read, utils } from 'xlsx';

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
}

export default function ShippingRates() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ratesData, variantsData] = await Promise.all([
        getAllShippingRates(),
        fetchVariants(),
      ]);
      setRates(ratesData);
      setVariants(variantsData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load shipping rates');
    } finally {
      setLoading(false);
    }
  };

  const fetchVariants = async (): Promise<ProductVariant[]> => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, product_id, sku, name')
      .order('sku');

    if (error) throw error;
    return data || [];
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipping rate?')) {
      return;
    }

    try {
      await deleteShippingRate(id);
      toast.success('Shipping rate deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete shipping rate');
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      { sku: 'EXAMPLE-SKU-001', country_code: 'US', shipping_cost: 5.99, notes: 'Standard shipping' },
      { sku: 'EXAMPLE-SKU-001', country_code: 'CA', shipping_cost: 7.99, notes: 'International' },
      { sku: 'EXAMPLE-SKU-002', country_code: 'US', shipping_cost: 4.99, notes: '' },
    ];

    const ws = utils.json_to_sheet(template);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Shipping Rates');

    // Generate buffer and download
    const buf = utils.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipping-rates-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRates = rates.filter((rate) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      rate.sku.toLowerCase().includes(searchLower) ||
      rate.country_code.toLowerCase().includes(searchLower) ||
      COMMON_COUNTRIES.find((c) => c.code === rate.country_code)
        ?.name.toLowerCase()
        .includes(searchLower)
    );
  });

  const groupedRates = filteredRates.reduce((acc, rate) => {
    if (!acc[rate.sku]) {
      acc[rate.sku] = [];
    }
    acc[rate.sku].push(rate);
    return acc;
  }, {} as Record<string, ShippingRate[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Shipping Rates Management
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage shipping costs by SKU and destination country
          </p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by SKU or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Rate
          </button>
        </div>
      </div>

      {/* Rates Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : Object.keys(groupedRates).length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Ship className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No shipping rates defined
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add shipping rates for your products to enable accurate invoicing
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Rate
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {Object.entries(groupedRates).map(([sku, skuRates]) => (
            <div
              key={sku}
              className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              {/* SKU Header */}
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{sku}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {skuRates.length} {skuRates.length === 1 ? 'country' : 'countries'}
                  </span>
                </div>
              </div>

              {/* Country Rates */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {skuRates.map((rate) => {
                  const country = COMMON_COUNTRIES.find((c) => c.code === rate.country_code);
                  return (
                    <div
                      key={rate.id}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {rate.country_code}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {country?.name || rate.country_code}
                            </p>
                            {rate.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {rate.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                              ${rate.shipping_cost.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {rate.currency}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedRate(rate);
                                setShowEditModal(true);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rate.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Rate Modal */}
      <AddRateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        variants={variants}
        onSuccess={fetchData}
      />

      {/* Edit Rate Modal */}
      {selectedRate && (
        <EditRateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRate(null);
          }}
          rate={selectedRate}
          onSuccess={fetchData}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

// Add Rate Modal Component
function AddRateModal({
  isOpen,
  onClose,
  variants,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  variants: ProductVariant[];
  onSuccess: () => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const variant = variants.find((v) => v.id === selectedVariantId);
    if (!variant) {
      toast.error('Please select a valid SKU');
      return;
    }

    if (!countryCode) {
      toast.error('Please select a country');
      return;
    }

    const cost = parseFloat(shippingCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('Please enter a valid shipping cost');
      return;
    }

    setIsSubmitting(true);

    try {
      await createShippingRate({
        productId: variant.product_id,
        variantId: variant.id,
        sku: variant.sku,
        countryCode: countryCode,
        shippingCost: cost,
        notes: notes || undefined,
      });

      toast.success('Shipping rate added successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('A shipping rate already exists for this SKU and country');
      } else {
        toast.error(error.message || 'Failed to add shipping rate');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedVariantId('');
    setCountryCode('');
    setShippingCost('');
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Shipping Rate">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SKU Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            SKU *
          </label>
          <select
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          >
            <option value="">Select SKU...</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.sku} - {variant.name}
              </option>
            ))}
          </select>
        </div>

        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Country *
          </label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          >
            <option value="">Select country...</option>
            {COMMON_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </div>

        {/* Shipping Cost */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Shipping Cost (USD) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            placeholder="0.00"
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Standard shipping, Express delivery, etc."
            rows={2}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Adding...' : 'Add Rate'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Edit Rate Modal Component
function EditRateModal({
  isOpen,
  onClose,
  rate,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  rate: ShippingRate;
  onSuccess: () => void;
}) {
  const [shippingCost, setShippingCost] = useState(rate.shipping_cost.toString());
  const [notes, setNotes] = useState(rate.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cost = parseFloat(shippingCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('Please enter a valid shipping cost');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateShippingRate(rate.id, {
        shippingCost: cost,
        notes: notes || undefined,
      });

      toast.success('Shipping rate updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update shipping rate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const country = COMMON_COUNTRIES.find((c) => c.code === rate.country_code);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Shipping Rate">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">SKU</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">{rate.sku}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Country</p>
              <p className="font-medium text-gray-900 dark:text-white mt-1">
                {country?.name || rate.country_code}
              </p>
            </div>
          </div>
        </div>

        {/* Shipping Cost */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Shipping Cost (USD) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            required
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Updating...' : 'Update Rate'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Import Modal Component
function ImportModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = utils.sheet_to_json(worksheet) as any[];

      const rates: BulkShippingRateImport[] = json.map((row) => ({
        sku: row.sku || row.SKU,
        country_code: row.country_code || row.country || row.COUNTRY_CODE,
        shipping_cost: parseFloat(row.shipping_cost || row.cost || row.SHIPPING_COST),
        notes: row.notes || row.NOTES || undefined,
      }));

      const results = await bulkImportShippingRates(rates);
      setImportResults(results);

      if (results.errors.length === 0) {
        toast.success(`Successfully imported ${results.success} shipping rates`);
        onSuccess();
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        toast.warning(`Imported ${results.success} rates with ${results.errors.length} errors`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResults(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Shipping Rates">
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">CSV/Excel Format Required</p>
              <p className="text-xs">
                Your file must contain columns: sku, country_code, shipping_cost, notes (optional)
              </p>
            </div>
          </div>
        </div>

        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Upload File
          </label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            disabled={isImporting}
            className="w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white dark:file:bg-gray-100 dark:file:text-gray-900 hover:file:bg-gray-800 dark:hover:file:bg-gray-200 file:cursor-pointer"
          />
          {file && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Selected: {file.name}
            </p>
          )}
        </div>

        {/* Import Results */}
        {importResults && (
          <div className="space-y-2">
            {importResults.success > 0 && (
              <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span>Successfully imported {importResults.success} rates</span>
              </div>
            )}

            {importResults.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  {importResults.errors.length} errors:
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importResults.errors.map((error, i) => (
                    <p key={i} className="text-xs text-red-700 dark:text-red-300">
                      • {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {importResults ? 'Close' : 'Cancel'}
          </button>
          {!importResults && (
            <button
              onClick={handleImport}
              disabled={!file || isImporting}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isImporting ? 'Importing...' : 'Import'}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
