-- Historical scoped transport grant attempt. Hosted pg_net tables belong to
-- supabase_admin, so its PUBLIC grants cannot be revoked by postgres. The next
-- migration moves private mail headers and recipients entirely out of pg_net.
begin;
grant select,insert,update,delete on net.http_request_queue,net._http_response to postgres;
grant usage,select on sequence net.http_request_queue_id_seq to postgres;
revoke select,insert,update,delete,truncate,references,trigger on net.http_request_queue,net._http_response from public,anon,authenticated;
revoke usage,select,update on sequence net.http_request_queue_id_seq from public,anon,authenticated;
commit;
