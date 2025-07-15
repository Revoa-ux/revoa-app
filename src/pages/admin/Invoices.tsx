import React, { useState, useRef, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Check,
  X,
  Upload,
  Send,
  FileText
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';
import Modal from '@/components/Modal';
import { read, utils } from 'xlsx';

interface Invoice {
  id: string;
  number: string;
  userId?: string;
  userName?: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
  processedAt?: string;
  file?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  storeUrl?: string;
}

interface AssignInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
  onAssign: (userId: string) => void;
}

const AssignInvoiceModal: React.FC<AssignInvoiceModalProps> = ({
  invoice,
  onClose,
  onAssign
}) => {
  const [searchTerm, setSearchTerm] = useState(''); // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false); // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'John Doe', email: 'john@example.com', storeUrl: 'store-1.myshopify.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', storeUrl: 'store-2.myshopify.com' }
  ]);

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.storeUrl && (
        user.storeUrl.toLowerCase().includes(searchLower) ||
        user.storeUrl.toLowerCase().replace('.myshopify.com', '').includes(searchLower)
      ))
    );
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Assign Invoice"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, email or store URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
          />
        </div>

        <div className="divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => onAssign(user.id)}
              className="w-full px-4 py-3 flex items-start hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                {user.storeUrl && (
                  <p className="text-xs text-gray-400 mt-0.5">{user.storeUrl}</p>
                )}
              </div>
            </button>
          ))}

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const AdminInvoices: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    
    try {
      for (const file of acceptedFiles) {
        // Read Excel file
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);

        // Create invoice records
        const newInvoices = jsonData.map((row: any, index) => ({
          id: `INV-${Date.now()}-${index}`,
          number: row.invoice_number || `INV-${Date.now()}-${index}`,
          amount: parseFloat(row.amount) || 0,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          file: URL.createObjectURL(file)
        }));

        setInvoices(prev => [...prev, ...newInvoices]);
      }

      toast.success(`Successfully processed ${acceptedFiles.length} invoice${acceptedFiles.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Error processing invoices:', error);
      toast.error('Failed to process invoices');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  const handleAssignInvoice = async (userId: string) => {
    if (!selectedInvoice) return;

    try {
      // Update invoice with user assignment
      const updatedInvoice = {
        ...selectedInvoice,
        userId,
        userName: 'John Doe', // This would come from the user data
        status: 'processing' as const
      };

      setInvoices(prev => 
        prev.map(inv => 
          inv.id === selectedInvoice.id ? updatedInvoice : inv
        )
      );

      // Send invoice email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove invoice from list after successful send
      setInvoices(prev => prev.filter(inv => inv.id !== selectedInvoice.id));
      
      toast.success('Invoice assigned and sent successfully');
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Error assigning invoice:', error);
      toast.error('Failed to assign invoice');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-[1050px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 mb-2">
          Bulk Invoices
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500">
            Upload and process invoices in bulk
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="max-w-xl mx-auto">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div>
                <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing invoices...</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? 'Drop the files here'
                    : 'Drag & drop invoice files here, or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports .xls and .xlsx files
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices..."
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

          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4 text-gray-400" />
              <span>Status: {statusFilter === 'all' ? 'All' : statusFilter}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute z-50 w-48 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {(['all', 'pending', 'processing', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>{status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    {statusFilter === status && <Check className="w-4 h-4 text-primary-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-[30%] px-6 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 first:rounded-tl-xl">Invoice</th>
                <th className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">Date</th>
                <th className="w-[15%] px-6 py-3 text-right text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">Amount</th>
                <th className="w-[15%] px-6 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">Status</th>
                <th className="w-[20%] px-6 py-3 text-right text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 last:rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {invoice.number}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      ${invoice.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'completed'
                        ? 'bg-green-50 text-green-700'
                        : invoice.status === 'processing'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Assign & Send
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <AssignInvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onAssign={handleAssignInvoice}
        />
      )}
    </div>
  );
};

export default AdminInvoices;