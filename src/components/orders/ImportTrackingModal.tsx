import React, { useState, useCallback } from 'react';
import { X, FileSpreadsheet, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, UploadCloud, Trash2, Users, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Modal';
import { toast } from '../../lib/toast';
import * as XLSX from 'xlsx';

interface Merchant {
  id: string;
  name: string;
  orderCount: number;
}

export interface SyncFailureInfo {
  failedCount: number;
  errorMessage: string;
  merchantId: string;
}

interface ImportTrackingModalProps {
  filteredUserId?: string;
  merchants?: Merchant[];
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSuccess: (syncFailure?: SyncFailureInfo) => void;
}

interface TrackingRow {
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  shipDate?: string;
  status?: string;
}

interface ImportResult {
  success: TrackingRow[];
  failed: Array<TrackingRow & { reason: string }>;
  duplicates: TrackingRow[];
}

type Step = 'upload' | 'merchant' | 'preview';

export default function ImportTrackingModal({ filteredUserId, merchants = [], isSuperAdmin = false, onClose, onSuccess }: ImportTrackingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(filteredUserId ? 'upload' : 'merchant');
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(filteredUserId || null);
  const [merchantSearchTerm, setMerchantSearchTerm] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<TrackingRow[]>([]);
  const [fullData, setFullData] = useState<TrackingRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [syncFailure, setSyncFailure] = useState<SyncFailureInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx?|csv)$/i)) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setFile(selectedFile);
    await parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('The file appears to be empty');
        setFile(null);
        return;
      }

      const trackingData: TrackingRow[] = jsonData.map((row: any) => {
        const orderNumber =
          row['Order Number'] ||
          row['OrderNumber'] ||
          row['Order'] ||
          row['订单号'] ||
          row['Order No'] ||
          '';

        const trackingNumber =
          row['Tracking Number'] ||
          row['TrackingNumber'] ||
          row['Tracking'] ||
          row['Track Number'] ||
          row['物流单号'] ||
          row['Tracking No'] ||
          '';

        const carrier =
          row['Carrier'] ||
          row['Shipping Company'] ||
          row['ShippingCompany'] ||
          row['物流公司'] ||
          row['Logistics Company'] ||
          'Unknown';

        const shipDate =
          row['Ship Date'] ||
          row['ShipDate'] ||
          row['Shipped At'] ||
          row['发货日期'] ||
          '';

        const status =
          row['Status'] ||
          row['Shipment Status'] ||
          row['状态'] ||
          '';

        return {
          orderNumber: String(orderNumber).trim(),
          trackingNumber: String(trackingNumber).trim(),
          carrier: String(carrier).trim(),
          shipDate: shipDate ? String(shipDate).trim() : undefined,
          status: status ? String(status).trim() : undefined
        };
      }).filter(row => row.orderNumber && row.trackingNumber);

      if (trackingData.length === 0) {
        toast.error('No valid tracking data found. Please ensure the file has "Order Number" and "Tracking Number" columns.');
        setFile(null);
        return;
      }

      setFullData(trackingData);
      setPreview(trackingData.slice(0, 5));
      setStep('preview');
      toast.success(`Found ${trackingData.length} tracking entries`);
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file: ' + error.message);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !user?.id || fullData.length === 0 || !selectedMerchantId) return;

    setImporting(true);

    try {
      const success: TrackingRow[] = [];
      const failed: Array<TrackingRow & { reason: string }> = [];
      const duplicates: TrackingRow[] = [];

      for (const track of fullData) {
        try {
          const { data: order, error: orderError } = await supabase
            .from('shopify_orders')
            .select('id, shopify_order_id, user_id')
            .eq('order_number', track.orderNumber)
            .eq('user_id', selectedMerchantId)
            .maybeSingle();

          if (orderError || !order) {
            failed.push({ ...track, reason: 'Order not found for this merchant' });
            continue;
          }

          const { data: existingFulfillment } = await supabase
            .from('shopify_order_fulfillments')
            .select('id')
            .eq('order_id', order.id)
            .maybeSingle();

          if (existingFulfillment) {
            duplicates.push(track);
            await supabase
              .from('shopify_order_fulfillments')
              .update({
                tracking_number: track.trackingNumber,
                tracking_company: track.carrier,
                imported_from_file: file.name,
                import_timestamp: new Date().toISOString(),
                synced_to_shopify: false,
              })
              .eq('id', existingFulfillment.id);
          } else {
            const { error: fulfillmentError } = await supabase
              .from('shopify_order_fulfillments')
              .insert({
                user_id: order.user_id,
                order_id: order.id,
                shopify_order_id: order.shopify_order_id,
                tracking_number: track.trackingNumber,
                tracking_company: track.carrier,
                shipment_status: track.status || 'in_transit',
                shipped_at: track.shipDate ? new Date(track.shipDate).toISOString() : new Date().toISOString(),
                imported_from_file: file.name,
                import_timestamp: new Date().toISOString(),
                synced_to_shopify: false,
              });

            if (fulfillmentError) throw fulfillmentError;
          }

          await supabase
            .from('shopify_orders')
            .update({
              fulfillment_status: 'FULFILLED',
              tracking_imported: true,
              tracking_imported_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          success.push(track);
        } catch (error: any) {
          console.error(`Error processing ${track.orderNumber}:`, error);
          failed.push({ ...track, reason: error.message });
        }
      }

      setResult({ success, failed, duplicates });

      if (success.length > 0) {
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('shopify-sync-fulfillments', {
            body: { userId: selectedMerchantId }
          });

          if (syncError) throw syncError;

          if (syncResult?.failed > 0) {
            setSyncFailure({
              failedCount: syncResult.failed,
              errorMessage: syncResult.message || 'Some fulfillments failed to sync',
              merchantId: selectedMerchantId!
            });
            toast.success(`Imported ${success.length} tracking numbers`);
          } else {
            toast.success(`Imported ${success.length} tracking numbers and synced to Shopify`);
          }
        } catch (syncError: any) {
          console.error('Auto-sync error:', syncError);
          setSyncFailure({
            failedCount: success.length,
            errorMessage: syncError.message || 'Failed to sync to Shopify',
            merchantId: selectedMerchantId!
          });
          toast.success(`Imported ${success.length} tracking numbers`);
        }
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} entries failed to import`);
      }

    } catch (error: any) {
      console.error('Error importing tracking:', error);
      toast.error(error.message || 'Failed to import tracking data');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (result && result.success.length > 0) {
      onSuccess(syncFailure || undefined);
    } else {
      onClose();
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview([]);
    setFullData([]);
    setStep('upload');
  };

  const handleMerchantSelect = (merchantId: string) => {
    setSelectedMerchantId(merchantId);
  };

  const handleMerchantContinue = () => {
    if (selectedMerchantId) {
      setStep('upload');
    }
  };

  const filteredMerchants = merchants.filter(m =>
    m.name.toLowerCase().includes(merchantSearchTerm.toLowerCase())
  );

  const getStepNumber = () => {
    if (filteredUserId) {
      return step === 'upload' ? 1 : 2;
    }
    return step === 'merchant' ? 1 : step === 'upload' ? 2 : 3;
  };

  const getTotalSteps = () => filteredUserId ? 2 : 3;

  return (
    <Modal isOpen={true} onClose={handleClose} maxWidth="max-w-3xl">
      <div className="-m-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Import Tracking from Mabang
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Step {getStepNumber()} of {getTotalSteps()}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!result ? (
          <>
            {/* Step: Merchant Selection */}
            {step === 'merchant' && (
              <>
                <div className="px-6 py-4 space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-dark/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Select Merchant
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose the merchant whose orders this tracking file belongs to.
                    </p>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={merchantSearchTerm}
                      onChange={(e) => setMerchantSearchTerm(e.target.value)}
                      placeholder="Search merchants..."
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                    />
                  </div>

                  {/* Merchant List */}
                  <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {filteredMerchants.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No merchants found
                        </div>
                      ) : (
                        filteredMerchants.map((merchant) => (
                          <button
                            key={merchant.id}
                            onClick={() => handleMerchantSelect(merchant.id)}
                            className={`flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 border-b border-gray-200 dark:border-[#3a3a3a] last:border-b-0 ${
                              selectedMerchantId === merchant.id ? 'bg-gray-50 dark:bg-[#3a3a3a]/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 dark:bg-[#3a3a3a] rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {merchant.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {merchant.orderCount} orders ready
                                </p>
                              </div>
                            </div>
                            {selectedMerchantId === merchant.id && (
                              <div className="w-5 h-5 bg-dark dark:bg-white rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white dark:text-gray-900" />
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4">
                  <div className="flex space-x-3">
                    <button
                      onClick={handleClose}
                      className="btn btn-secondary flex-1"
                    >
                      <ArrowLeft className="btn-icon btn-icon-back" />
                      Cancel
                    </button>

                    <button
                      onClick={handleMerchantContinue}
                      disabled={!selectedMerchantId}
                      className="btn btn-primary flex-1"
                    >
                      Continue
                      <ArrowRight className="btn-icon btn-icon-arrow" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step: File Upload */}
            {step === 'upload' && (
              <>
                <div className="px-6 py-4 space-y-4">
                  {/* Selected Merchant Tag or Search */}
                  {selectedMerchant ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Merchant:</span>
                      <div className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-gray-100 dark:bg-[#3a3a3a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-gray-900 dark:text-white">
                        <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span>{selectedMerchant.name}</span>
                        {!filteredUserId && (
                          <button
                            type="button"
                            onClick={() => setSelectedMerchantId(null)}
                            className="p-1 ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded transition-colors"
                            title="Remove selection"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={merchantSearchTerm}
                          onChange={(e) => setMerchantSearchTerm(e.target.value)}
                          placeholder="Search and select a merchant..."
                          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                        />
                      </div>
                      <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          {filteredMerchants.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                              No merchants found
                            </div>
                          ) : (
                            filteredMerchants.map((merchant) => (
                              <button
                                key={merchant.id}
                                onClick={() => {
                                  setSelectedMerchantId(merchant.id);
                                  setMerchantSearchTerm('');
                                }}
                                className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 border-b border-gray-200 dark:border-[#3a3a3a] last:border-b-0"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 bg-gray-100 dark:bg-[#3a3a3a] rounded-full flex items-center justify-center">
                                    <Users className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {merchant.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {merchant.orderCount} orders
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File Requirements */}
                  <div className="p-4 bg-gray-50 dark:bg-dark/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      File Requirements
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Excel (.xlsx, .xls) or CSV format</p>
                      <p>Required columns: "Order Number" and "Tracking Number"</p>
                      <p>Optional columns: "Carrier", "Ship Date", "Status"</p>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={selectedMerchantId ? handleDragOver : undefined}
                    onDragLeave={selectedMerchantId ? handleDragLeave : undefined}
                    onDrop={selectedMerchantId ? handleDrop : undefined}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      !selectedMerchantId
                        ? 'border-gray-200 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-dark/30 opacity-60'
                        : isDragging
                        ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-dark/50'
                        : 'border-gray-300 dark:border-[#3a3a3a] hover:border-gray-400 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      disabled={uploading || !selectedMerchantId}
                      className={`absolute inset-0 w-full h-full opacity-0 ${selectedMerchantId ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className={`p-3 rounded-full transition-colors ${
                        isDragging
                          ? 'bg-gray-200 dark:bg-[#3a3a3a]'
                          : 'bg-gray-100 dark:bg-dark'
                      }`}>
                        <UploadCloud className={`w-8 h-8 transition-colors ${
                          isDragging
                            ? 'text-gray-600 dark:text-gray-300'
                            : 'text-gray-400 dark:text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {!selectedMerchantId
                            ? 'Select a merchant first'
                            : isDragging
                            ? 'Drop your file here'
                            : 'Drag and drop your file here'}
                        </p>
                        {selectedMerchantId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            or click to browse
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Supports: .xlsx, .xls, .csv
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => filteredUserId ? handleClose() : setStep('merchant')}
                      disabled={uploading}
                      className="btn btn-secondary flex-1"
                    >
                      <ArrowLeft className="btn-icon btn-icon-back" />
                      {filteredUserId ? 'Cancel' : 'Back'}
                    </button>

                    <button
                      disabled={true}
                      className="btn btn-secondary flex-1 cursor-not-allowed"
                    >
                      {!selectedMerchantId ? 'Select merchant first' : 'Upload file to continue'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step: Preview & Import */}
            {step === 'preview' && file && (
              <>
                <div className="px-6 py-4 space-y-4">
                  {/* Selected Merchant Tag */}
                  {selectedMerchant && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Importing for:</span>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-medium">
                        <span>{selectedMerchant.name}</span>
                      </div>
                    </div>
                  )}

                  {/* File Info */}
                  <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-dark rounded-lg">
                          <FileSpreadsheet className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {fullData.length} tracking entries found
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearFile}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  {preview.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Preview (First 5 Rows)
                      </h3>
                      <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-[#3a3a3a]/50 border-b border-gray-200 dark:border-[#3a3a3a]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Order #
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Tracking Number
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Carrier
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark">
                            {preview.map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                  {row.orderNumber}
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                  {row.trackingNumber}
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                  {row.carrier}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Auto-sync Info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark/50 rounded-lg">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Auto-sync to Shopify
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tracking will automatically sync to Shopify after import
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setStep('upload')}
                      disabled={uploading || importing}
                      className="btn btn-secondary flex-1"
                    >
                      <ArrowLeft className="btn-icon btn-icon-back" />
                      Back
                    </button>

                    <button
                      onClick={handleImport}
                      disabled={!file || uploading || importing || fullData.length === 0}
                      className="btn btn-primary flex-1"
                    >
                      {importing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Import {fullData.length} Entries
                          <ArrowRight className="btn-icon btn-icon-arrow" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="px-6 py-4 space-y-4">
              {/* Success */}
              {result.success.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                        Successfully Imported
                      </h3>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {result.success.length}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        tracking {result.success.length === 1 ? 'number' : 'numbers'} imported{syncFailure ? '' : ' and synced to Shopify'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {result.duplicates.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                        Updated Existing
                      </h3>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                        {result.duplicates.length}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        orders already had tracking - updated with new data
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed */}
              {result.failed.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                        Failed to Import ({result.failed.length})
                      </h3>
                      <div className="text-xs text-red-700 dark:text-red-300 space-y-1 max-h-32 overflow-y-auto">
                        {result.failed.slice(0, 5).map((fail, idx) => (
                          <p key={idx}>Order {fail.orderNumber}: {fail.reason}</p>
                        ))}
                        {result.failed.length > 5 && (
                          <p className="font-medium">...and {result.failed.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50 px-4 sm:px-6 py-4">
              <button
                onClick={handleClose}
                className="btn btn-primary w-full"
              >
                Done
                <ArrowRight className="btn-icon btn-icon-arrow" />
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
