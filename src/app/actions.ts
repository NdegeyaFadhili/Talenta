"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const supabase = await createClient();
  const origin = headers().get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        email: email,
      },
    },
  });

  console.log("After signUp", error);

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (user) {
    try {
      // Create user profile using service role to bypass RLS
      const { createClient } = await import("../../supabase/server");
      const serviceSupabase = await createClient();

      const { error: updateError } = await serviceSupabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name: fullName,
          username: null,
          bio: null,
          avatar_url: null,
          skill_tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        console.error("Error creating user profile:", updateError);
      } else {
        // Create welcome notification
        await serviceSupabase.from("notifications").insert({
          user_id: user.id,
          type: "welcome",
          title: "Welcome to Talenta!",
          message: "Start exploring skills and connecting with creators",
        });
      }
    } catch (err) {
      console.error("Error in user profile creation:", err);
    }
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = headers().get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const updateHireableStatusAction = async (formData: FormData) => {
  const hireable = formData.get("hireable") === "true";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/sign-in", "Authentication required");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ hireable })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating hireable status:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const sendHireMessageAction = async (formData: FormData) => {
  const receiverId = formData.get("receiverId")?.toString();
  const message = formData.get("message")?.toString();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return encodedRedirect("error", "/sign-in", "Authentication required");
  }

  if (!receiverId || !message) {
    return { success: false, error: "Receiver and message are required" };
  }

  // Send the hire message
  const { error: messageError } = await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content: message,
  });

  if (messageError) {
    console.error("Error sending hire message:", messageError);
    return { success: false, error: messageError.message };
  }

  // Create a notification for the receiver
  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: receiverId,
      type: "message",
      title: "New Hire Inquiry",
      message: "Someone is interested in hiring you!",
      related_user_id: user.id,
    });

  if (notificationError) {
    console.error("Error creating notification:", notificationError);
  }

  return { success: true };
};

export const addReferenceAction = async (formData: FormData) => {
  const type = formData.get("type")?.toString();
  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const url = formData.get("url")?.toString();
  const file = formData.get("file") as File;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  if (!type || !title) {
    return { success: false, error: "Type and title are required" };
  }

  let filePath = null;
  let fileName = null;
  let fileSize = null;

  // Handle file upload for documents
  if (type === "document" && file && file.size > 0) {
    const fileExt = file.name.split(".").pop();
    const uniqueFileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(uniqueFileName, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return { success: false, error: "Failed to upload file" };
    }

    filePath = uniqueFileName;
    fileName = file.name;
    fileSize = file.size;
  }

  // Insert reference into database
  const { error } = await supabase.from("references").insert({
    user_id: user.id,
    type,
    title,
    description,
    url: type === "link" ? url : null,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
  });

  if (error) {
    console.error("Error adding reference:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const deleteReferenceAction = async (formData: FormData) => {
  const referenceId = formData.get("referenceId")?.toString();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  if (!referenceId) {
    return { success: false, error: "Reference ID is required" };
  }

  // Get reference details to check ownership and delete file if needed
  const { data: reference, error: fetchError } = await supabase
    .from("references")
    .select("*")
    .eq("id", referenceId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !reference) {
    return { success: false, error: "Reference not found" };
  }

  // Delete file from storage if it exists
  if (reference.file_path) {
    const { error: deleteFileError } = await supabase.storage
      .from("media")
      .remove([reference.file_path]);

    if (deleteFileError) {
      console.error("Error deleting file:", deleteFileError);
    }
  }

  // Delete reference from database
  const { error } = await supabase
    .from("references")
    .delete()
    .eq("id", referenceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting reference:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};
