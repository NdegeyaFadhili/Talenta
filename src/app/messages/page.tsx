import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import TalentaNavbar from "@/components/TalentaNavbar";
import ChatInterface from "@/components/chat/ChatInterface";

export default async function MessagesPage() {
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
      <ChatInterface />
    </>
  );
}
