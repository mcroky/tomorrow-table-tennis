begin;
-- Explicit deny policy documents the intentional private inbox.
create policy feedback_no_client_access on ttk_private.feedback as restrictive
 for all to anon,authenticated using(false) with check(false);
create index feedback_created_at on ttk_private.feedback(created_at desc);
commit;
