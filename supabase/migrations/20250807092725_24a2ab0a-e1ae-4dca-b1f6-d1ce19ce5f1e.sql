-- Insert test shares for the current user to test portfolio functionality
INSERT INTO public.shares (user_id, poll_id, option_chosen, quantity, price_paid, total_cost)
VALUES 
  ('56d2ce74-8524-417a-8f2e-fc61a1ffa11b', 'b437777a-173f-460f-bee8-27f57480db1d', 'A', 100, 0.50, 50.00),
  ('56d2ce74-8524-417a-8f2e-fc61a1ffa11b', 'b437777a-173f-460f-bee8-27f57480db1d', 'B', 50, 0.45, 22.50);