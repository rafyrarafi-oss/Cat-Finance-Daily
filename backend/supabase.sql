-- ============================================================
-- Finance Daily QRIS — Setup Database Supabase
-- Jalankan seluruh isi file ini di: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- Ekstensi untuk uuid
create extension if not exists "pgcrypto";

-- ---------- USERS ----------
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  username   text unique not null,
  password   text not null,
  name       text,
  role       text default 'admin',
  created_at timestamptz default now()
);

-- ---------- TRANSACTIONS ----------
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  time        text,
  type        text not null,           -- 'income' | 'expense'
  category    text not null,
  subcategory text,
  description text,
  method      text,
  amount      numeric not null,
  currency    text default 'IDR',      -- IDR | USD | KHR
  reference   text,
  status      text default 'Sukses',   -- 'Sukses' | 'Pending'
  attachment  text,
  note        text,
  created_at  timestamptz default now()
);

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id   uuid primary key default gen_random_uuid(),
  type text not null,                  -- 'income' | 'expense'
  name text not null
);

-- ---------- SETTINGS (key/value) ----------
create table if not exists settings (
  key   text primary key,
  value text
);

-- ---------- EXCHANGE RATE ----------
create table if not exists exchange_rate (
  currency   text primary key,         -- IDR | USD | KHR
  rate       numeric not null,         -- 1 unit mata uang = ? IDR
  updated_at timestamptz default now()
);

-- ============================================================
-- DATA AWAL
-- ============================================================
insert into users (username, password, name, role)
values ('owner', '123456', 'Owner', 'admin')
on conflict (username) do nothing;

insert into categories (type, name) values
  ('income','Penjualan'),('income','Bonus'),('income','Refund'),('income','Lainnya'),
  ('expense','Makan'),('expense','Transport'),('expense','Belanja'),('expense','Operasional'),
  ('expense','Internet'),('expense','Gaji'),('expense','Listrik'),('expense','Air'),
  ('expense','Sewa'),('expense','Pajak'),('expense','Investasi'),('expense','Hiburan'),
  ('expense','Peralatan'),('expense','Lainnya')
on conflict do nothing;

insert into settings (key, value) values
  ('businessName','Warung Sari Rasa'),
  ('ownerName','Owner'),
  ('defaultCurrency','IDR'),
  ('theme','light'),
  ('logo','')
on conflict (key) do nothing;

insert into exchange_rate (currency, rate) values
  ('IDR', 1), ('USD', 16250), ('KHR', 4)
on conflict (currency) do nothing;

-- (opsional) contoh transaksi hari ini
insert into transactions (date, time, type, category, subcategory, description, method, amount, currency, reference, status)
values
  (current_date, '09:24', 'income',  'Penjualan',   'Menu makanan', 'Order meja 4', 'QRIS',  25000,  'IDR', 'TRX-001', 'Sukses'),
  (current_date, '09:02', 'expense', 'Belanja',     'Bahan baku',   'Sayur & ayam', 'Tunai', 120000, 'IDR', 'TRX-002', 'Sukses'),
  (current_date, '08:30', 'expense', 'Operasional', 'Kemasan',      'Box & plastik','Transfer', 85000,'IDR', 'TRX-003', 'Pending');

-- ============================================================
-- ROW LEVEL SECURITY
-- Aplikasi ini pakai anon key dari browser. Untuk pemakaian sederhana,
-- kita izinkan akses penuh via anon (setara level keamanan Google Sheets publik).
-- CATATAN KEAMANAN: password tersimpan plaintext & anon bisa baca/tulis.
-- Untuk produksi nyata, pertimbangkan Supabase Auth + policy yang ketat.
-- ============================================================
alter table users         enable row level security;
alter table transactions  enable row level security;
alter table categories    enable row level security;
alter table settings      enable row level security;
alter table exchange_rate enable row level security;

-- Hapus policy lama bila ada, lalu buat policy "allow all" untuk anon+authenticated
do $$
declare t text;
begin
  foreach t in array array['users','transactions','categories','settings','exchange_rate'] loop
    execute format('drop policy if exists "fdq_all" on %I;', t);
    execute format('create policy "fdq_all" on %I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;
