import { notFound } from "next/navigation";

export default function CatchAllRoute() {
  // 未定義ルートはすべてnot-foundページにリダイレクト
  notFound();
}
