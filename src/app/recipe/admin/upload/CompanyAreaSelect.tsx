"use client";

import { useState } from "react";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-slate-700";

type Company = { id: string; name: string };
type Area = { id: string; name: string; company_id: string };

// エリア選択がcompany_idで絞り込まれておらず、全社分のエリアが会社に関係なく一律で
// 表示されてしまっていた(同名エリアが会社ごとに別行として存在するため、実機確認で
// 他社の同名エリアを誤って選んでしまいうる状態だったことが判明)。会社選択に連動して
// エリア一覧をクライアント側で絞り込む。
export function CompanyAreaSelect({ companies, areas }: { companies: Company[]; areas: Area[] }) {
  const [companyId, setCompanyId] = useState("");
  const filteredAreas = companyId ? areas.filter((a) => a.company_id === companyId) : [];

  return (
    <>
      <div>
        <label htmlFor="company_id" className={LABEL_CLASS}>
          会社 <span className="text-red-600">*</span>
        </label>
        <select
          id="company_id"
          name="company_id"
          required
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="" disabled>選択してください</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="area_id" className={LABEL_CLASS}>エリア（任意・選択したファイル全件に適用）</label>
        <select id="area_id" name="area_id" defaultValue="" className={INPUT_CLASS} disabled={!companyId}>
          <option value="">未選択</option>
          {filteredAreas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {companyId && filteredAreas.length === 0 && (
          <p className="mt-1 text-xs text-slate-400">この会社に登録されているエリアがありません。</p>
        )}
      </div>
    </>
  );
}
