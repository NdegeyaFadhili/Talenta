import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import UserProfile from "@/components/profile/UserProfile";
import TalentaNavbar from "@/components/TalentaNavbar";
import Footer from "@/components/footer";

export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Fetch profile with optimized query - only essential fields for initial load
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      username,
      full_name,
      bio,
      avatar_url,
      skill_tags,
      followers_count,
      following_count,
      posts_count,
      learning_streak,
      hireable,
      created_at
    `,
    )
    .eq("id", params.id)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Pre-fetch follow status if viewing someone else's profile
  let initialFollowStatus = false;
  if (currentUser && currentUser.id !== params.id) {
    const { data: followData } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", params.id)
      .single();
    initialFollowStatus = !!followData;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TalentaNavbar />
      <div className="flex-1">
        <UserProfile
          userId={params.id}
          currentUserId={currentUser?.id}
          initialProfile={profile}
          initialFollowStatus={initialFollowStatus}
        />
      </div>
      <Footer />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, bio")
    .eq("id", params.id)
    .single();

  if (!profile) {
    return {
      title: "Profile Not Found",
      description: "The requested profile could not be found.",
    };
  }

  const displayName = profile.full_name || profile.username || "User";
  const description = profile.bio || `${displayName}'s profile on Talenta`;

  return {
    title: `${displayName} - Talenta`,
    description,
    openGraph: {
      title: `${displayName} - Talenta`,
      description,
      type: "profile",
    },
  };
}
