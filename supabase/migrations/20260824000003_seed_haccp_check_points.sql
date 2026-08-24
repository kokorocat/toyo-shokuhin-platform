insert into haccp_check_points (company_id, store_id, name, category, unit, min_value, max_value, display_order)
select s.company_id, s.id, cp.name, cp.category, '℃', cp.min_value, cp.max_value, cp.display_order
from stores s
cross join (
  values
    ('冷蔵ショーケース', 'refrigerator', 0::numeric, 10::numeric, 1),
    ('冷凍庫', 'freezer', -25::numeric, -15::numeric, 2),
    ('調理後の中心温度', 'cooking', 75::numeric, null::numeric, 3)
) as cp(name, category, min_value, max_value, display_order)
where s.status = 'active';
