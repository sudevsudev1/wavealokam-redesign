
CREATE POLICY "Admins can delete order items"
ON public.ops_purchase_order_items
FOR DELETE
TO authenticated
USING (
  branch_id = ops_user_branch_id(auth.uid())
  AND ops_has_role(auth.uid(), 'admin'::ops_role)
);
