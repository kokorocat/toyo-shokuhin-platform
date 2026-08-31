-- 受発注システムの請求書発行(2026-08-31)。仕様書v1.0の「開発者への最終指示」で
-- 「請求発行は初期DB設計に含める。後付け列で対応しない」と明記されていたにもかかわらず、
-- スキーマ・コードとも未着手だった。半月・月次単位で、期間内の未請求注文をまとめて
-- 請求書として発行する(再発行時は旧請求書をsupersededとし、金額の二重計上を防ぐ)。

begin;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  period_type text not null check (period_type in ('half_month', 'monthly')),
  period_start date not null,
  period_end date not null,
  subtotal integer not null,
  tax_amount integer not null,
  total_amount integer not null,
  status text not null default 'issued' check (status in ('issued', 'superseded')),
  superseded_by uuid references invoices(id),
  issued_by uuid not null references user_profiles(id),
  issued_at timestamptz not null default now()
);

alter table orders add column invoice_id uuid references invoices(id);

create index invoices_store_id_idx on invoices(store_id);
create index invoices_company_id_idx on invoices(company_id);
create index orders_invoice_id_idx on orders(invoice_id);

alter table invoices enable row level security;

-- orders_select/orders_updateと同じ境界: 自店舗(店舗アカウント)+ 受発注管理者(会社/エリア)。
create policy invoices_select on invoices
  for select using (
    private.is_super_admin()
    or store_id in (select private.user_store_ids())
    or private.is_ordering_admin_for_company(company_id)
  );

-- 発行・再発行はRPC(issue_invoice, security definer)のみが行う。直接INSERT/UPDATEは許可しない
-- (在庫金額の二重計上・不整合を防ぐため、集計とorders.invoice_id更新を必ず一体で行う)。
create policy invoices_no_direct_write on invoices
  for all using (false) with check (false);

-- issue_invoice: 対象店舗・期間の未請求注文(invoice_id is null, status<>'cancelled')を集計し、
-- 請求書を発行する。既に同一店舗・同一期間の発行済み請求書がある場合は再発行として扱い、
-- 旧請求書をsupersededにしたうえで、旧請求書に含まれていた注文も合わせて新請求書へ引き継ぐ
-- (対象注文が二重に請求されたり、再発行時に取りこぼされたりしないようにするため)。
create or replace function public.issue_invoice(
  p_company_id uuid,
  p_store_id uuid,
  p_period_type text,
  p_period_start date,
  p_period_end date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_authorized boolean;
  v_prior_invoice_id uuid;
  v_subtotal integer;
  v_tax integer;
  v_total integer;
  v_invoice_id uuid;
  v_seq integer;
  v_invoice_number text;
  v_store_code text;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;
  if p_period_type not in ('half_month', 'monthly') then
    raise exception '不正な請求期間区分です';
  end if;
  if p_period_start is null or p_period_end is null or p_period_start > p_period_end then
    raise exception '請求期間が不正です';
  end if;

  v_caller_authorized := private.is_super_admin()
    or private.is_ordering_admin_for_company(p_company_id)
    or exists (select 1 from stores s where s.id = p_store_id and s.id in (select private.user_store_ids()));
  if not v_caller_authorized then
    raise exception 'この操作を行う権限がありません';
  end if;

  select store_code into v_store_code from stores where id = p_store_id and company_id = p_company_id;
  if v_store_code is null then
    raise exception '不正な店舗です';
  end if;

  -- 再発行判定: 同一店舗・同一期間で有効な請求書が既にあれば旧行をsupersededにする
  select id into v_prior_invoice_id
  from invoices
  where store_id = p_store_id and period_start = p_period_start and period_end = p_period_end and status = 'issued';

  select coalesce(sum(o.total_amount), 0) into v_subtotal
  from orders o
  where o.store_id = p_store_id
    and o.status <> 'cancelled'
    and o.created_at::date between p_period_start and p_period_end
    and (o.invoice_id is null or o.invoice_id = v_prior_invoice_id);

  v_tax := round(v_subtotal * 0.1);
  v_total := v_subtotal + v_tax;

  select count(*) + 1 into v_seq from invoices where store_id = p_store_id;
  v_invoice_number := 'INV-' || coalesce(v_store_code, 'XXX') || '-' || to_char(p_period_start, 'YYYYMMDD') || '-' || v_seq;

  insert into invoices (
    invoice_number, company_id, store_id, period_type, period_start, period_end,
    subtotal, tax_amount, total_amount, issued_by
  ) values (
    v_invoice_number, p_company_id, p_store_id, p_period_type, p_period_start, p_period_end,
    v_subtotal, v_tax, v_total, auth.uid()
  ) returning id into v_invoice_id;

  update orders
  set invoice_id = v_invoice_id
  where store_id = p_store_id
    and status <> 'cancelled'
    and created_at::date between p_period_start and p_period_end
    and (invoice_id is null or invoice_id = v_prior_invoice_id);

  if v_prior_invoice_id is not null then
    update invoices set status = 'superseded', superseded_by = v_invoice_id where id = v_prior_invoice_id;
  end if;

  insert into audit_logs (actor_id, system_code, action, target_table, target_id, after_data)
  values (
    auth.uid(), 'ordering', case when v_prior_invoice_id is null then 'issue_invoice' else 'reissue_invoice' end,
    'invoices', v_invoice_id,
    jsonb_build_object('store_id', p_store_id, 'period_start', p_period_start, 'period_end', p_period_end, 'total_amount', v_total)
  );

  return v_invoice_id;
end;
$$;

revoke all on function public.issue_invoice(uuid, uuid, text, date, date) from public;
grant execute on function public.issue_invoice(uuid, uuid, text, date, date) to authenticated;

commit;
