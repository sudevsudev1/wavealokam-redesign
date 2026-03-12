-- Add completion/tracking columns to purchase order items for the Purchase List model
ALTER TABLE public.ops_purchase_order_items 
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN completed_by uuid,
  ADD COLUMN added_by uuid;

-- Drop existing restrictive policies on ops_purchase_order_items
DROP POLICY IF EXISTS "Admins can delete order items" ON public.ops_purchase_order_items;
DROP POLICY IF EXISTS "Same-branch users can manage order items" ON public.ops_purchase_order_items;
DROP POLICY IF EXISTS "Same-branch users can read order items" ON public.ops_purchase_order_items;

-- Single permissive policy: any same-branch authenticated user can do everything
CREATE POLICY "Same-branch users full access purchase list items"
  ON public.ops_purchase_order_items
  FOR ALL
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Update purchase orders: allow any same-branch user to create (remove requested_by = auth.uid() restriction)
DROP POLICY IF EXISTS "Same-branch users can create orders" ON public.ops_purchase_orders;
CREATE POLICY "Same-branch users can create orders"
  ON public.ops_purchase_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Allow same-branch users to delete orders
CREATE POLICY "Same-branch users can delete orders"
  ON public.ops_purchase_orders
  FOR DELETE
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));