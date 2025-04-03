import { read, utils } from 'xlsx';
import { supabase } from '../supabase';
import { ValidationError } from '../errors';

interface InvoiceData {
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
}

export const processInvoiceFile = async (file: File): Promise<InvoiceData> => {
  try {
    // Read the Excel file
    const data = await file.arrayBuffer();
    const workbook = read(data);
    
    // Get first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON
    const jsonData = utils.sheet_to_json(worksheet, { raw: false });

    if (!jsonData.length) {
      throw new ValidationError('No data found in invoice file');
    }

    // Get first row
    const invoice = jsonData[0] as Record<string, string>;

    // Parse and validate amount
    const amount = parseFloat(invoice.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Invalid amount value', 'amount');
    }

    // Parse and validate due date
    const dueDate = new Date(invoice.due_date);
    if (isNaN(dueDate.getTime())) {
      throw new ValidationError('Invalid due date format', 'due_date');
    }

    // Determine status based on due date
    const status = dueDate < new Date() ? 'overdue' : 'pending';

    return {
      amount,
      dueDate: dueDate.toISOString(),
      status
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      'Failed to process invoice file: ' + (error instanceof Error ? error.message : 'Unknown error'),
      'invoice'
    );
  }
};

export const saveInvoiceToDatabase = async (
  fileUrl: string,
  invoiceData: InvoiceData,
  userId: string
): Promise<void> => {
  try {
    // Start a transaction
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        file_url: fileUrl,
        amount: invoiceData.amount,
        due_date: invoiceData.dueDate,
        user_id: userId,
        status: invoiceData.status
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
        amount: invoiceData.amount,
        status: invoiceData.status,
        due_date: invoiceData.dueDate,
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
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw new ValidationError(
      'Failed to save invoice: ' + (error instanceof Error ? error.message : 'Unknown error'),
      'invoice'
    );
  }
};