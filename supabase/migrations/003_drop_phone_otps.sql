-- Remove OTP storage from projects that applied 002_phone_otps.sql

drop function if exists public.count_recent_otp_requests(text, int);
drop function if exists public.get_auth_user_id_by_phone(text);
drop table if exists public.phone_otps;
