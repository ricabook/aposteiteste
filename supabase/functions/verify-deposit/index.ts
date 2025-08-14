import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    // Get request body
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Use service role to check and update deposit
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the deposit record
    const { data: deposit, error: depositError } = await supabaseService
      .from("deposits")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (depositError || !deposit) {
      throw new Error("Deposit record not found");
    }

    // If payment is successful and deposit hasn't been processed yet
    if (session.payment_status === "paid" && deposit.status === "pending") {
      // Update user wallet balance
      const { error: walletError } = await supabaseService.rpc(
        "execute_wallet_transaction",
        {
          _user_id: user.id,
          _amount: deposit.amount,
          _transaction_type: "deposit",
          _description: `Depósito via Stripe - ${session.payment_method_types?.join(", ")}`
        }
      );

      if (walletError) {
        throw new Error(`Failed to update wallet: ${walletError.message}`);
      }

      // Update deposit status
      await supabaseService
        .from("deposits")
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", deposit.id);

      return new Response(JSON.stringify({ 
        success: true, 
        amount: deposit.amount,
        status: "completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Return current status
    return new Response(JSON.stringify({ 
      success: false, 
      status: session.payment_status === "paid" ? deposit.status : session.payment_status 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in verify-deposit:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});