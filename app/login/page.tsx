import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/session";
import LoginForm from "./LoginForm";

export const metadata = { title: "تسجيل الدخول · إدارة المشاريع" };

export default async function LoginPage() {
  if (await currentViewer()) redirect("/");
  return <LoginForm />;
}
