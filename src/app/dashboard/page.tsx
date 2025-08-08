import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import MainFeed from "@/components/feed/MainFeed";
import TalentaNavbar from "@/components/TalentaNavbar";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <>
      <TalentaNavbar />
      <MainFeed />
    </>
  );
}
