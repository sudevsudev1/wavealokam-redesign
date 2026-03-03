
-- Inventory items master table
CREATE TABLE public.ops_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  name_en text NOT NULL,
  name_ml text,
  category text NOT NULL DEFAULT 'Consumables',
  unit text NOT NULL DEFAULT 'pcs',
  par_level integer NOT NULL DEFAULT 5,
  current_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 2,
  expiry_warn_days integer, -- NULL means no expiry tracking
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inventory items" ON public.ops_inventory_items
  FOR ALL USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can read inventory" ON public.ops_inventory_items
  FOR SELECT USING (branch_id = ops_user_branch_id(auth.uid()));

-- Room refill templates
CREATE TABLE public.ops_room_refill_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  room_type text NOT NULL,
  item_id uuid NOT NULL REFERENCES public.ops_inventory_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_room_refill_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage refill templates" ON public.ops_room_refill_templates
  FOR ALL USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can read refill templates" ON public.ops_room_refill_templates
  FOR SELECT USING (branch_id = ops_user_branch_id(auth.uid()));

-- Inventory stock transactions (in/out/adjust/expire)
CREATE TABLE public.ops_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  item_id uuid NOT NULL REFERENCES public.ops_inventory_items(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'adjust', -- in, out, adjust, expire, refill
  quantity integer NOT NULL,
  notes text,
  performed_by uuid NOT NULL,
  related_order_id uuid, -- FK added after purchase_orders table
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read transactions" ON public.ops_inventory_transactions
  FOR SELECT USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can insert transactions" ON public.ops_inventory_transactions
  FOR INSERT WITH CHECK (branch_id = ops_user_branch_id(auth.uid()) AND performed_by = auth.uid());

-- Purchase orders
CREATE TABLE public.ops_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  status text NOT NULL DEFAULT 'Draft', -- Draft, Requested, Approved, Ordered, Received, Cancelled
  requested_by uuid NOT NULL,
  approved_by uuid,
  ordered_at timestamptz,
  received_at timestamptz,
  receive_proof_url text, -- proof photo on receive
  receive_notes text,
  vendor text,
  total_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read orders" ON public.ops_purchase_orders
  FOR SELECT USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can create orders" ON public.ops_purchase_orders
  FOR INSERT WITH CHECK (branch_id = ops_user_branch_id(auth.uid()) AND requested_by = auth.uid());

CREATE POLICY "Same-branch users can update orders" ON public.ops_purchase_orders
  FOR UPDATE USING (branch_id = ops_user_branch_id(auth.uid()));

-- Purchase order line items
CREATE TABLE public.ops_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ops_purchase_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.ops_inventory_items(id),
  quantity integer NOT NULL DEFAULT 1,
  received_quantity integer,
  unit_price numeric,
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id)
);

ALTER TABLE public.ops_purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read order items" ON public.ops_purchase_order_items
  FOR SELECT USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can manage order items" ON public.ops_purchase_order_items
  FOR ALL USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Add FK from transactions to orders
ALTER TABLE public.ops_inventory_transactions
  ADD CONSTRAINT ops_inventory_transactions_order_fkey
  FOREIGN KEY (related_order_id) REFERENCES public.ops_purchase_orders(id);

-- Inventory expiry tracking
CREATE TABLE public.ops_inventory_expiry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  item_id uuid NOT NULL REFERENCES public.ops_inventory_items(id) ON DELETE CASCADE,
  batch_label text,
  quantity integer NOT NULL DEFAULT 1,
  expiry_date date NOT NULL,
  is_disposed boolean NOT NULL DEFAULT false,
  disposed_at timestamptz,
  disposed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_inventory_expiry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read expiry" ON public.ops_inventory_expiry
  FOR SELECT USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can manage expiry" ON public.ops_inventory_expiry
  FOR ALL USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Enable realtime for inventory tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_purchase_orders;
