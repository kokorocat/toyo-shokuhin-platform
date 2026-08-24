insert into haccp_hygiene_items (company_id, store_id, name, display_order)
select s.company_id, s.id, hi.name, hi.display_order
from stores s
cross join (
  values
    ('手洗い・消毒の実施確認', 1),
    ('調理器具・まな板の洗浄消毒', 2),
    ('ゴミ箱の管理・清掃', 3),
    ('従業員の健康状態確認(発熱・下痢等)', 4),
    ('食材の賞味期限・消費期限の確認', 5)
) as hi(name, display_order)
where s.status = 'active';
