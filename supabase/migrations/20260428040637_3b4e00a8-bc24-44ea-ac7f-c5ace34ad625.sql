UPDATE public.portfolio_projects SET sort_order = sort_order + 1;

INSERT INTO public.portfolio_projects (name, description, tech_stack, category, screenshot, sort_order)
VALUES (
  'Pura Vida Mae',
  'Peer-to-peer car rental marketplace connecting travelers with local hosts. Browse unique vehicles by category, book by date with transparent pricing, and manage trips through a clean, conversion-focused interface.',
  ARRAY['React','TypeScript','Tailwind','Supabase','Stripe'],
  'Marketplace',
  '/screenshots/pura-vida-mae.png',
  0
);