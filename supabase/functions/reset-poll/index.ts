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

    // Get shares to refund
    const { data: shares } = await supabase
      .from('shares')
      .select('user_id, total_cost')
      .eq('poll_id', pollId);

    // Get bets to refund  
    const { data: bets } = await supabase
      .from('bets')
      .select('user_id, amount')
      .eq('poll_id', pollId)
      .eq('is_closed', false);

    let totalRefunded = 0;
    let refundedUsers = 0;

    // Process shares refunds
    if (shares && shares.length > 0) {
      const userRefunds = new Map();
      shares.forEach(share => {
        const current = userRefunds.get(share.user_id) || 0;
        userRefunds.set(share.user_id, current + Number(share.total_cost));
      });

      // Process refunds using wallet transaction function
      for (const [userId, amount] of userRefunds.entries()) {
        await supabase.rpc('execute_wallet_transaction', {
          _user_id: userId,
          _amount: amount,
          _transaction_type: 'poll_refund',
          _description: `Reembolso da enquete reiniciada: ${poll.title}`
        });
        
        totalRefunded += amount;
      }
      refundedUsers += userRefunds.size;
    }

    // Process bets refunds
    if (bets && bets.length > 0) {
      const userBetRefunds = new Map();
      bets.forEach(bet => {
        const current = userBetRefunds.get(bet.user_id) || 0;
        userBetRefunds.set(bet.user_id, current + Number(bet.amount));
      });

      // Process bet refunds using wallet transaction function
      for (const [userId, amount] of userBetRefunds.entries()) {
        // Only refund if user didn't already get refunded from shares
        if (!shares?.some(share => share.user_id === userId)) {
          await supabase.rpc('execute_wallet_transaction', {
            _user_id: userId,
            _amount: amount,
            _transaction_type: 'poll_refund',
            _description: `Reembolso da enquete reiniciada: ${poll.title}`
          });
          
          totalRefunded += amount;
          refundedUsers += 1;
        }
      }
    }

    // Delete all poll-related data to reset it
    await supabase.from('shares').delete().eq('poll_id', pollId);
    await supabase.from('trades').delete().eq('poll_id', pollId);
    await supabase.from('bets').delete().eq('poll_id', pollId);
    await supabase.from('odds_history').delete().eq('poll_id', pollId);

    // Reset poll to initial state
    await supabase
      .from('polls')
      .update({ 
        is_resolved: false, 
        winning_option: null,
        is_active: true
      })
      .eq('id', pollId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Poll reset successfully',
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