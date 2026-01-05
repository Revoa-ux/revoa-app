import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AdminWithCount {
  id: string;
  assignment_count: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    console.log('Initializing chat for user:', userId);

    // Check if user already has an assignment and chat
    const { data: existingAssignment } = await supabase
      .from('user_assignments')
      .select('admin_id')
      .eq('user_id', userId)
      .maybeSingle();

    let adminId = existingAssignment?.admin_id;
    let isNewAssignment = false;

    // If no assignment exists, use round-robin to assign admin
    if (!adminId) {
      console.log('No existing assignment, performing round-robin assignment...');

      // Get all admins with their assignment counts (excluding super admins)
      const { data: admins, error: adminsError } = await supabase
        .from('user_profiles')
        .select('id, name, first_name, last_name')
        .eq('is_admin', true)
        .eq('is_super_admin', false);

      if (adminsError || !admins || admins.length === 0) {
        throw new Error('No admins available for assignment');
      }

      // Count assignments for each admin
      const { data: assignments } = await supabase
        .from('user_assignments')
        .select('admin_id');

      const assignmentCounts = new Map<string, number>();
      assignments?.forEach(a => {
        assignmentCounts.set(a.admin_id, (assignmentCounts.get(a.admin_id) || 0) + 1);
      });

      // Find admin with fewest assignments (round-robin)
      const adminsWithCounts: AdminWithCount[] = admins.map(admin => ({
        ...admin,
        assignment_count: assignmentCounts.get(admin.id) || 0
      }));

      // Sort by assignment count (ascending)
      adminsWithCounts.sort((a, b) => a.assignment_count - b.assignment_count);

      const selectedAdmin = adminsWithCounts[0];
      adminId = selectedAdmin.id;

      console.log(`Selected admin ${adminId} with ${selectedAdmin.assignment_count} current assignments`);

      // Create assignment
      const { error: assignError } = await supabase
        .from('user_assignments')
        .insert({
          user_id: userId,
          admin_id: adminId
        });

      if (assignError) {
        console.error('Error creating assignment:', assignError);
        throw new Error('Failed to assign admin');
      }

      isNewAssignment = true;
      console.log('Assignment created successfully');
    }

    // Get or create chat
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let chatId = existingChat?.id;
    let isNewChat = false;

    if (!chatId) {
      console.log('Creating new chat...');
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          admin_id: adminId
        })
        .select('id')
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        throw new Error('Failed to create chat');
      }

      chatId = newChat.id;
      isNewChat = true;
      console.log('Chat created successfully:', chatId);
    }

    // Send welcome message if this is a new assignment
    if (isNewAssignment && chatId) {
      console.log('Sending welcome message...');

      // Get admin name
      const { data: adminProfile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, name')
        .eq('id', adminId)
        .single();

      const adminName = [adminProfile?.first_name, adminProfile?.last_name]
        .filter(Boolean)
        .join(' ') || adminProfile?.name || 'Resolution Team';

      const welcomeMessage = `Welcome to the Revoa Resolution Center! 👋\n\nI'm ${adminName}, and I've been assigned as your dedicated agent to help you succeed.\n\n**How I Can Help:**\n• Answer questions about quotes\n• Answer questions about invoices\n• Handle damaged or defective items\n• Provide deeper order delivery details\n• Track returns going to our warehouse\n\n**Getting Started:**\nIf you need help with a specific order, you can create an issue thread by clicking the **#** button in the message box. This helps us organize conversations by order and allows our Revoa Resolution Bot to provide intelligent assistance.\n\nFeel free to ask me anything - I'm here to help make your experience as smooth as possible! 😊`;

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          content: welcomeMessage,
          type: 'text',
          sender: 'team',
          status: 'sent',
          metadata: {
            automated: true,
            welcome_message: true
          }
        });

      if (messageError) {
        console.error('Error sending welcome message:', messageError);
        // Don't fail the entire request if welcome message fails
      } else {
        console.log('Welcome message sent successfully');
      }
    }

    // Get full chat details
    const { data: chat, error: chatFetchError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (chatFetchError) {
      throw new Error('Failed to fetch chat details');
    }

    return new Response(
      JSON.stringify({
        success: true,
        chat,
        isNewAssignment,
        isNewChat
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in initialize-chat:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});