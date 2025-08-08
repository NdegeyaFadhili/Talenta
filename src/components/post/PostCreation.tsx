"use client";

import { useState, useRef } from "react";
import { createClient } from "../../../supabase/client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Camera, Video, Upload, X } from "lucide-react";
import { useToast } from "../ui/use-toast";

interface PostCreationProps {
  onPostCreated?: () => void;
  onClose?: () => void;
}

const SKILL_CATEGORIES = [
  "Cooking",
  "Photography",
  "Music",
  "Art & Design",
  "Fitness",
  "Technology",
  "Language",
  "Business",
  "Crafts",
  "Gaming",
  "Beauty",
  "Gardening",
];

export default function PostCreation({
  onPostCreated,
  onClose,
}: PostCreationProps) {
  const [content, setContent] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [privacySetting, setPrivacySetting] = useState("public");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/webm",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description:
          "Please select an image (JPEG, PNG, GIF) or video (MP4, WebM) file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to upload media.",
          variant: "destructive",
        });
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Upload failed",
          description:
            uploadError.message || "Failed to upload media. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading media:", error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !mediaFile) {
      toast({
        title: "Content required",
        description: "Please add some content or media to your post.",
        variant: "destructive",
      });
      return;
    }

    if (!skillCategory) {
      toast({
        title: "Skill category required",
        description: "Please select a skill category for your post.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to create a post.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Check if user profile exists, create if it doesn't
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error checking profile:", profileError);
        toast({
          title: "Profile Error",
          description: "Failed to verify user profile. Please try again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      if (!profile) {
        // Profile doesn't exist, create it
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || null,
            username:
              user.user_metadata?.username || user.email?.split("@")[0] || null,
          });

        if (createProfileError) {
          console.error("Error creating profile:", createProfileError);
          toast({
            title: "Profile Error",
            description: "Failed to create user profile. Please try again.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        mediaUrl = await uploadMedia(mediaFile);
        if (!mediaUrl) {
          setIsUploading(false);
          return; // Error already handled in uploadMedia
        }
        mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";
      }

      const postData = {
        user_id: user.id,
        content: content.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        skill_category: skillCategory,
        privacy_setting: privacySetting,
      };

      console.log("Creating post with data:", postData);

      const { data: newPost, error } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (error) {
        console.error("Error creating post:", error);
        toast({
          title: "Failed to create post",
          description:
            error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      console.log("Post created successfully:", newPost);

      toast({
        title: "Post created!",
        description: "Your post has been shared successfully.",
      });

      // Reset form
      setContent("");
      setSkillCategory("");
      setPrivacySetting("public");
      removeMedia();

      // Call callbacks
      if (onPostCreated) {
        onPostCreated();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create Post</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Media Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Media (Optional)</label>
              {!mediaPreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex space-x-2">
                      <Camera className="h-6 w-6 text-gray-400" />
                      <Video className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">
                      Upload a photo or video
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative">
                  {mediaFile?.type.startsWith("video/") ? (
                    <video
                      src={mediaPreview}
                      className="w-full h-48 object-cover rounded-lg"
                      controls
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeMedia}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Caption</label>
              <Textarea
                placeholder="Share your knowledge, tips, or experience..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>

            {/* Skill Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Skill Category *</label>
              <Select value={skillCategory} onValueChange={setSkillCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill category" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Privacy Setting */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Privacy</label>
              <Select value={privacySetting} onValueChange={setPrivacySetting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public - Anyone can see
                  </SelectItem>
                  <SelectItem value="followers">Followers only</SelectItem>
                  <SelectItem value="private">Private - Only you</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={
                isUploading || (!content.trim() && !mediaFile) || !skillCategory
              }
            >
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Post...</span>
                </div>
              ) : (
                "Share Post"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
