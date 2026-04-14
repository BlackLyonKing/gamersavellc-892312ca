
CREATE TABLE public.payment_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT 'admin' CHECK (recipient_type IN ('company', 'admin')),
  recipient_id UUID,
  percentage NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payment splits"
  ON public.payment_splits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payment splits"
  ON public.payment_splits FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment splits"
  ON public.payment_splits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment splits"
  ON public.payment_splits FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view splits for own contracts"
  ON public.payment_splits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = payment_splits.contract_id
    AND contracts.client_id = auth.uid()
  ));
