import type { ReactNode } from "react";
import { CartProvider } from "./CartContext";

export default function OrderingLayout({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
