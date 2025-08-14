import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pollId } = await req.json();
    
    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get poll info first
    const { data: poll } = await supabase
      .from('polls')
      .select('id, title, is_resolved')
      .eq('id', pollId)
      .single();

    if (!poll) {
      return new Response(
        JSON.stringify({ success: false, error: 'Poll not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (poll.is_resolved) {
      return new Response(
        JSON.stringify({ success: false, error: 'Poll already resolved' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get shares to refund
    const { data: shares } = await supabase
      .from('shares')
      .select('user_id, total_cost')
      .eq('poll_id', pollId);

    let totalRefunded = 0;
    let refundedUsers = 0;

    if (shares && shares.length > 0) {
      // Calculate refunds per user
      const userRefunds = new Map();
      shares.forEach(share => {
        const current = userRefunds.get(share.user_id) || 0;
        userRefunds.set(share.user_id, current + Number(share.total_cost));
      });

      // Process refunds using raw SQL to bypass any RLS issues
      for (const [userId, amount] of userRefunds.entries()) {
        // Update wallet directly
        await supabase.rpc('execute_wallet_transaction', {
          _user_id: userId,
          _amount: amount,
          _transaction_type: 'poll_refund',
          _description: `Reembolso da enquete cancelada: ${poll.title}`
        });
        
        totalRefunded += amount;
      }
      refundedUsers = userRefunds.size;

      // Delete shares
      await supabase
        .from('shares')
        .delete()
        .eq('poll_id', pollId);

      // Delete trades
      await supabase
        .from('trades')
        .delete()
        .eq('poll_id', pollId);
    }

    // Update poll status
    await supabase
      .from('polls')
      .update({ 
        is_resolved: true, 
        winning_option: 'cancelled'
      })
      .eq('id', pollId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Poll cancelled successfully',
        refundedUsers: refundedUsers,
        totalRefunded: totalRefunded
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});