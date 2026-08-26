export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "新規",
  in_production: "制作中",
  preparing_shipment: "出荷準備中",
  shipped: "郵送完了",
  cancelled: "キャンセル",
};

export const ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_production: "bg-blue-100 text-blue-700",
  preparing_shipment: "bg-amber-100 text-amber-700",
  shipped: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export const ORDER_STATUS_KEYS = Object.keys(ORDER_STATUS_LABELS);
