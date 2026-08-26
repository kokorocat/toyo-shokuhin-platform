import { createClient } from "@/lib/supabase/server";
import { todayInTokyo } from "@/lib/date";

export type PortalContext = {
  userId: string;
  displayName: string;
  company: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  store: { id: string; name: string; storeCode: string } | null;
  roleCode: string | null;
  unreadNoticeCount: number;
  systems: { code: string; name: string; base_url: string | null; status: string }[];
};

export async function getPortalContext(): Promise<PortalContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // このユーザーの全アクセススコープを取得。store_idを持つ行があれば店舗コンテキストに使う。
  // super_adminはstore_idを持たない行のみのため、店舗コンテキストがなくてもroleCodeは取得できるようにする。
  // 互いに依存しないクエリのため、Promise.allで並列実行する(直列awaitは過去に実際の
  // パフォーマンス問題として指摘され全体を修正した経緯があり、ここも同様に修正)。
  const [{ data: profile }, { data: scopes }, { data: systems }, { count: unreadCount }, { count: readCount }] =
    await Promise.all([
      supabase.from("user_profiles").select("display_name").eq("id", user.id).single(),
      supabase
        .from("user_access_scopes")
        .select(
          "role_id, roles(code), store_id, stores(id, name, store_code, area_id, company_id, areas(id, name), companies(id, name))"
        )
        .eq("user_id", user.id)
        // RLSヘルパー(private.is_super_admin()等)と同じく、期限切れのスコープ行(ended_onが過去)
        // を除外する。以前はこのフィルタが無く、期限切れのスコープが誤って選択されうる不具合があった。
        .or(`ended_on.is.null,ended_on.gte.${todayInTokyo()}`),
      supabase
        .from("system_applications")
        .select("code, name, base_url, status")
        .in("code", ["haccp", "ordering", "recipe", "hr", "store_master"]),
      supabase.from("portal_notices").select("id", { count: "exact", head: true }),
      supabase.from("notice_reads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeScope = (scopes as any[])?.find((s) => s.store_id) ?? null;
  const scope = storeScope ?? scopes?.[0] ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = storeScope?.stores as any;

  return {
    userId: user.id,
    displayName: profile?.display_name ?? user.email ?? "",
    company: store?.companies ? { id: store.companies.id, name: store.companies.name } : null,
    area: store?.areas ? { id: store.areas.id, name: store.areas.name } : null,
    store: store ? { id: store.id, name: store.name, storeCode: store.store_code } : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roleCode: (scope?.roles as any)?.code ?? null,
    unreadNoticeCount: Math.max(0, (unreadCount ?? 0) - (readCount ?? 0)),
    systems: systems ?? [],
  };
}
