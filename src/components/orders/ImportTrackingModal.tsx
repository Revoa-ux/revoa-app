import React, { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronLeft, UploadCloud, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Modal';
import { CustomCheckbox } from '../CustomCheckbox';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportTrackingModalProps {
  onClose: () => void;
  onSuccess: () => void;
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

export default function ImportTrackingModal({ onClose, onSuccess }: ImportTrackingModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<TrackingRow[]>([]);
  const [fullData, setFullData] = useState<TrackingRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

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
    if (!file || !user?.id || fullData.length === 0) return;

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
            .maybeSingle();

          if (orderError || !order) {
            failed.push({ ...track, reason: 'Order not found' });
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

      if (autoSync && success.length > 0) {
        try {
          await supabase.functions.invoke('shopify-sync-fulfillments');
          toast.success(`Imported ${success.length} tracking numbers and synced to Shopify`);
        } catch (syncError) {
          console.error('Auto-sync error:', syncError);
          toast.success(`Imported ${success.length} tracking numbers (sync pending)`);
        }
      } else {
        toast.success(`Successfully imported ${success.length} tracking numbers`);
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
      onSuccess();
    } else {
      onClose();
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview([]);
    setFullData([]);
  };

  return (
    <Modal isOpen={true} onClose={handleClose} maxWidth="max-w-3xl">
      <div className="-m-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Import Tracking from Mabang
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload your tracking file to update orders
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!result ? (
          <>
            <div className="px-6 py-4 space-y-4">
              {/* File Requirements */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
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
              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isDragging
                      ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/50'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-full transition-colors ${
                      isDragging
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <UploadCloud className={`w-8 h-8 transition-colors ${
                        isDragging
                          ? 'text-gray-600 dark:text-gray-300'
                          : 'text-gray-400 dark:text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        or click to browse
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Supports: .xlsx, .xls, .csv
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
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
              )}

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Preview (First 5 Rows)
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
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
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
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

              {/* Auto-sync Option */}
              {file && fullData.length > 0 && (
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <CustomCheckbox
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Auto-sync to Shopify
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Automatically update Shopify fulfillment status after import
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleClose}
                  disabled={uploading || importing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  onClick={handleImport}
                  disabled={!file || uploading || importing || fullData.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white dark:border-gray-900 border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {fullData.length} Entries
                    </>
                  )}
                </button>
              </div>
            </div>
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
                        tracking {result.success.length === 1 ? 'number' : 'numbers'} imported and {autoSync ? 'synced to Shopify' : 'ready to sync'}
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
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 py-4">
              <button
                onClick={handleClose}
                className="w-full px-5 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
