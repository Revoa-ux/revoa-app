import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../Modal';
import Button from '../Button';
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
  const [result, setResult] = useState<ImportResult | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
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

      // Parse tracking data with flexible column mapping
      const trackingData: TrackingRow[] = jsonData.map((row: any) => {
        // Try to find order number (flexible column names)
        const orderNumber =
          row['Order Number'] ||
          row['OrderNumber'] ||
          row['Order'] ||
          row['订单号'] ||
          row['Order No'] ||
          '';

        // Try to find tracking number
        const trackingNumber =
          row['Tracking Number'] ||
          row['TrackingNumber'] ||
          row['Tracking'] ||
          row['Track Number'] ||
          row['物流单号'] ||
          row['Tracking No'] ||
          '';

        // Try to find carrier
        const carrier =
          row['Carrier'] ||
          row['Shipping Company'] ||
          row['ShippingCompany'] ||
          row['物流公司'] ||
          row['Logistics Company'] ||
          'Unknown';

        // Try to find ship date
        const shipDate =
          row['Ship Date'] ||
          row['ShipDate'] ||
          row['Shipped At'] ||
          row['发货日期'] ||
          '';

        // Try to find status
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
    if (!file || !user?.id) return;

    setImporting(true);

    try {
      // Re-parse the full file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const trackingData: TrackingRow[] = jsonData.map((row: any) => ({
        orderNumber: String(row['Order Number'] || row['OrderNumber'] || row['Order'] || row['订单号'] || row['Order No'] || '').trim(),
        trackingNumber: String(row['Tracking Number'] || row['TrackingNumber'] || row['Tracking'] || row['Track Number'] || row['物流单号'] || row['Tracking No'] || '').trim(),
        carrier: String(row['Carrier'] || row['Shipping Company'] || row['ShippingCompany'] || row['物流公司'] || row['Logistics Company'] || 'Unknown').trim(),
        shipDate: row['Ship Date'] || row['ShipDate'] || row['Shipped At'] || row['发货日期'] || undefined,
        status: row['Status'] || row['Shipment Status'] || row['状态'] || undefined
      })).filter(row => row.orderNumber && row.trackingNumber);

      const success: TrackingRow[] = [];
      const failed: Array<TrackingRow & { reason: string }> = [];
      const duplicates: TrackingRow[] = [];

      for (const track of trackingData) {
        try {
          // Find the order by order number
          const { data: order, error: orderError } = await supabase
            .from('shopify_orders')
            .select('id, shopify_order_id, user_id')
            .eq('order_number', track.orderNumber)
            .maybeSingle();

          if (orderError || !order) {
            failed.push({ ...track, reason: 'Order not found' });
            continue;
          }

          // Check if fulfillment already exists
          const { data: existingFulfillment } = await supabase
            .from('shopify_order_fulfillments')
            .select('id')
            .eq('order_id', order.id)
            .maybeSingle();

          if (existingFulfillment) {
            duplicates.push(track);
            // Update existing fulfillment
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
            // Create new fulfillment
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

          // Update order status
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

      // Auto-sync to Shopify if enabled
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

  return (
    <Modal isOpen={true} onClose={handleClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Import Tracking from Mabang
        </h2>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {!result ? (
        <>
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              File Requirements
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• Excel (.xlsx, .xls) or CSV format</p>
              <p>• Required columns: "Order Number" and "Tracking Number"</p>
              <p>• Optional columns: "Carrier", "Ship Date", "Status"</p>
              <p>• Supports both English and Chinese column names</p>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Tracking File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={uploading || importing}
                className="block w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400 dark:hover:file:bg-blue-900/30"
              />
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Preview (First 5 Rows)
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Order #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Tracking Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                        Carrier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-gray-900 dark:text-white">
                          {row.orderNumber}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {row.trackingNumber}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
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
          {file && (
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Automatically sync to Shopify after import
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              onClick={handleClose}
              variant="secondary"
              disabled={uploading || importing}
            >
              Cancel
            </Button>

            <Button
              onClick={handleImport}
              disabled={!file || uploading || importing}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {importing ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Tracking
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Import Results */}
          <div className="space-y-4 mb-6">
            {/* Success */}
            {result.success.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                      Successfully Imported ({result.success.length})
                    </h3>
                    <p className="text-xs text-green-800 dark:text-green-200">
                      {result.success.length} tracking {result.success.length === 1 ? 'number' : 'numbers'} imported and ready to sync
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Duplicates */}
            {result.duplicates.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                      Updated Existing ({result.duplicates.length})
                    </h3>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      These orders already had tracking - updated with new data
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Failed */}
            {result.failed.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                      Failed to Import ({result.failed.length})
                    </h3>
                    <div className="text-xs text-red-800 dark:text-red-200 space-y-1 max-h-32 overflow-y-auto">
                      {result.failed.slice(0, 5).map((fail, idx) => (
                        <p key={idx}>• Order {fail.orderNumber}: {fail.reason}</p>
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

          {/* Close Button */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            Done
          </Button>
        </>
      )}
    </Modal>
  );
}
