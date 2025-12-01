import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "ORM docs moved · Nael Platform",
  description: "This page now lives under the dedicated ORM section.",
};

export default function LegacyOrmTechniquesPage() {
  redirect("/docs/orm/overview");
}
