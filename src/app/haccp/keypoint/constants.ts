// HC-10 重要ポイント6項目の固定コードと表示ラベル(actions.ts / page.tsx 双方で参照する単一の定義)
export const KEYPOINT_ITEMS: { code: string; label: string }[] = [
  { code: "heat_room", label: "加熱(常温)" },
  { code: "heat_cold", label: "加熱(冷蔵)" },
  { code: "nonheat_room", label: "非加熱(常温)" },
  { code: "nonheat_cold", label: "非加熱(冷蔵)" },
  { code: "mixed_room", label: "混合(常温)加熱・非加熱" },
  { code: "mixed_cold", label: "混合(冷蔵)加熱・非加熱" },
];
