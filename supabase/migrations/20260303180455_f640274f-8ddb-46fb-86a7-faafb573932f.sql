
-- Fix ops_config_registry: change PK from (key) to (key, branch_id) for branch-scoped config
ALTER TABLE public.ops_config_registry DROP CONSTRAINT ops_config_registry_pkey;
ALTER TABLE public.ops_config_registry ADD PRIMARY KEY (key, branch_id);
