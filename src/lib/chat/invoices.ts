import { supabase } from '../supabase';
import { Message } from '@/types/chat';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const uploadInvoice = async (file: File): Promise<string> => {
  try {
    const timestamp = Date.now();
    const safeFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `invoices/${safeFileName}`;

    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('invoices')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading invoice:', error);
    throw error;
  }
};

export const createInvoice = async (
  fileUrl: string,
  amount: number,
  dueDate: string,
  userId: string
): Promise<Invoice> => {
  try {
    // Start a transaction
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        amount,
        due_date: dueDate,
        status: 'pending',
        file_url: fileUrl,
        user_id: userId
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Add to user's invoice history
    const { error: historyError } = await supabase
      .from('user_invoice_history')
      .insert({
        user_id: userId,
        invoice_id: invoice.id,
        amount: amount,
        status: 'pending',
        due_date: dueDate,
        file_url: fileUrl
      });

    if (historyError) throw historyError;

    // Update user's invoice count
    const { error: userError } = await supabase
      .from('user_profiles')
      .update({
        invoice_count: supabase.sql`invoice_count + 1`
      })
      .eq('user_id', userId);

    if (userError) throw userError;

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

export const updateInvoiceStatus = async (
  invoiceId: string,
  status: Invoice['status']
): Promise<void> => {
  try {
    // Update invoice status
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', invoiceId);

    if (invoiceError) throw invoiceError;

    // Update status in user's invoice history
    const { error: historyError } = await supabase
      .from('user_invoice_history')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('invoice_id', invoiceId);

    if (historyError) throw historyError;

    // Send email notification
    await sendInvoiceStatusEmail(invoiceId, status);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    throw error;
  }
};

export const sendInvoiceStatusEmail = async (
  invoiceId: string,
  status: Invoice['status']
): Promise<void> => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, users!inner(*)')
      .eq('id', invoiceId)
      .single();

    if (error) throw error;

    const { data: emailResult, error: emailError } = await supabase
      .functions.invoke('send-invoice-email', {
        body: {
          invoiceId,
          status,
          userEmail: invoice.users.email,
          amount: invoice.amount,
          dueDate: invoice.due_date
        }
      });

    if (emailError) throw emailError;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    toast.error('Failed to send invoice notification');
  }
};

export const createInvoiceMessage = (invoice: Invoice): Message => {
  return {
    id: invoice.id,
    content: invoice.fileUrl,
    type: 'invoice',
    sender: 'team',
    timestamp: new Date(),
    metadata: {
      fileName: invoice.fileName,
      fileSize: invoice.fileSize,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status
    }
  };
};

export const getUserInvoiceHistory = async (userId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('user_invoice_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user invoice history:', error);
    throw error;
  }
};