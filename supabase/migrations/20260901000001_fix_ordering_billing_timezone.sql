-- issue_invoiceの期間集計が、orders.created_at(timestamptz)をDBセッションのタイムゾーン
-- (Supabaseの既定はUTC)でdateへキャストしていたため、日本時間の深夜0時台に発生した注文が
-- 誤って前日の期間に計上される不具合を修正する(実データで確認済み: '2026-09-01T00:00'::timestamptz
-- はUTC 0時=JST 9時と解釈され、JST 0時台の注文はUTC上ではまだ前日扱いになる)。
-- Asia/Tokyoへ明示的に変換したうえでdateへキャストする。

begin;

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

  select id into v_prior_invoice_id
  from invoices
  where store_id = p_store_id and period_start = p_period_start and period_end = p_period_end and status = 'issued';

  select coalesce(sum(o.total_amount), 0) into v_subtotal
  from orders o
  where o.store_id = p_store_id
    and o.status <> 'cancelled'
    and (o.created_at at time zone 'Asia/Tokyo')::date between p_period_start and p_period_end
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
    and (created_at at time zone 'Asia/Tokyo')::date between p_period_start and p_period_end
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
