-- Confirmação de pagamento e código de rastreio por e-mail.
alter table orders add column if not exists tracking_code text;
alter table orders add column if not exists tracking_sent_at timestamptz;
alter table orders add column if not exists confirmation_email_sent_at timestamptz;
