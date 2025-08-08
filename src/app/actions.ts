"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";
import { Database } from "@/types/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Reference = Database["public"]["Tables"]["references"]["Row"];

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect("/sign-in?message=Could not authenticate user");
  }

  return redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const username = formData.get("username") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      },
    },
  });

  if (error) {
    console.error("Error signing up:", error);
    return redirect("/sign-up?message=Error creating account");
  }

  if (data.user) {
    // Create user profile using service role client
    const serviceSupabase = await createClient();
    const { error: profileError } = await serviceSupabase.from("users").insert({
      id: data.user.id,
      email: data.user.email!,
      full_name: fullName,
      username: username,
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Error updating user profile:", profileError);
    }

    // Also create a profile entry
    const { error: profilesError } = await serviceSupabase
      .from("profiles")
      .insert({
        id: data.user.id,
        full_name: fullName,
        username: username,
        email: data.user.email!,
        created_at: new Date().toISOString(),
      });

    if (profilesError) {
      console.error("Error creating profile:", profilesError);
    }
  }

  return redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const fullName = formData.get("fullName") as string;
  const username = formData.get("username") as string;
  const bio = formData.get("bio") as string;
  const location = formData.get("location") as string;
  const website = formData.get("website") as string;
  const skills = formData.get("skills") as string;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      username: username,
      bio: bio,
      location: location,
      website: website,
      skills: skills ? skills.split(",").map((s) => s.trim()) : [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }

  revalidatePath(`/profile/${user.id}`);
  return { success: true };
}

export async function updateHireableStatusAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const hireable = formData.get("hireable") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({
      hireable: hireable,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating hireable status:", error);
    return { error: "Failed to update hireable status" };
  }

  revalidatePath(`/profile/${user.id}`);
  return { success: true };
}

export async function addReferenceAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const type = formData.get("type") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const url = formData.get("url") as string;
  const file = formData.get("file") as File;

  let filePath = null;
  let fileName = null;
  let fileSize = null;

  // Handle file upload for documents
  if (type === "document" && file && file.size > 0) {
    try {
      const fileExt = file.name.split(".").pop();
      const uploadFileName = `references/${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("media")
        .upload(uploadFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return { error: `Failed to upload file: ${uploadError.message}` };
      }

      filePath = uploadData.path;
      fileName = file.name;
      fileSize = file.size;
    } catch (error) {
      console.error("Error in file upload:", error);
      return { error: "Failed to process file upload" };
    }
  }

  const { error } = await supabase.from("references").insert({
    user_id: user.id,
    type: type,
    title: title,
    description: description || null,
    url: type === "link" ? url : null,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error adding reference:", error);
    return { error: `Failed to add reference: ${error.message}` };
  }

  revalidatePath(`/profile/${user.id}`);
  return { success: true };
}

export async function deleteReferenceAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const referenceId = formData.get("referenceId") as string;

  // First get the reference to check if it has a file to delete
  const { data: reference } = await supabase
    .from("references")
    .select("file_path")
    .eq("id", referenceId)
    .eq("user_id", user.id)
    .single();

  // Delete the file from storage if it exists
  if (reference?.file_path) {
    await supabase.storage.from("media").remove([reference.file_path]);
  }

  const { error } = await supabase
    .from("references")
    .delete()
    .eq("id", referenceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting reference:", error);
    return { error: "Failed to delete reference" };
  }

  revalidatePath(`/profile/${user.id}`);
  return { success: true };
}

export async function createPostAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const content = formData.get("content") as string;
  const skillCategory = formData.get("skillCategory") as string;
  const mediaUrl = formData.get("mediaUrl") as string;

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    content: content,
    skill_category: skillCategory,
    media_url: mediaUrl || null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating post:", error);
    return { error: "Failed to create post" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function likePostAction(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if already liked
  const { data: existingLike } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .single();

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (error) {
      console.error("Error unliking post:", error);
      return { error: "Failed to unlike post" };
    }
  } else {
    // Like
    const { error } = await supabase.from("likes").insert({
      user_id: user.id,
      post_id: postId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error liking post:", error);
      return { error: "Failed to like post" };
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function addCommentAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const postId = formData.get("postId") as string;
  const content = formData.get("content") as string;

  const { error } = await supabase.from("comments").insert({
    user_id: user.id,
    post_id: postId,
    content: content,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error adding comment:", error);
    return { error: "Failed to add comment" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function followUserAction(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if already following
  const { data: existingFollow } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", userId)
    .single();

  if (existingFollow) {
    // Unfollow
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", userId);

    if (error) {
      console.error("Error unfollowing user:", error);
      return { error: "Failed to unfollow user" };
    }
  } else {
    // Follow
    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: userId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error following user:", error);
      return { error: "Failed to follow user" };
    }
  }

  revalidatePath(`/profile/${userId}`);
  return { success: true };
}

export async function searchUsersAction(query: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, bio, avatar_url")
    .or(
      `full_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`,
    )
    .limit(20);

  if (error) {
    console.error("Error searching users:", error);
    return { error: "Failed to search users" };
  }

  return { data };
}

export async function searchPostsAction(query: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles!posts_user_id_fkey(
        id,
        full_name,
        username,
        avatar_url
      ),
      likes(count),
      comments(count)
    `,
    )
    .or(`content.ilike.%${query}%,skill_category.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error searching posts:", error);
    return { error: "Failed to search posts" };
  }

  return { data };
}

export async function getTrendingSkillsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("skill_category")
    .not("skill_category", "is", null)
    .gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting trending skills:", error);
    return { error: "Failed to get trending skills" };
  }

  // Count occurrences and get top skills
  const skillCounts: { [key: string]: number } = {};
  data?.forEach((post) => {
    if (post.skill_category) {
      skillCounts[post.skill_category] =
        (skillCounts[post.skill_category] || 0) + 1;
    }
  });

  const trendingSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  return { data: trendingSkills };
}

export async function getPopularCreatorsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      username,
      bio,
      avatar_url,
      posts(count),
      followers:follows!follows_following_id_fkey(count)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error getting popular creators:", error);
    return { error: "Failed to get popular creators" };
  }

  return { data };
}

export async function sendMessageAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const recipientId = formData.get("recipientId") as string;
  const content = formData.get("content") as string;

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    recipient_id: recipientId,
    content: content,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error sending message:", error);
    return { error: "Failed to send message" };
  }

  revalidatePath("/messages");
  return { success: true };
}

export async function sendHireMessageAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const recipientId = formData.get("recipientId") as string;
  const content = formData.get("content") as string;

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    recipient_id: recipientId,
    content: content,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error sending hire message:", error);
    return { error: "Failed to send hire message" };
  }

  revalidatePath("/messages");
  return { success: true };
}
