"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../../supabase/client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { X, Camera, Plus } from "lucide-react";
import { useToast } from "../ui/use-toast";

interface ProfileEditProps {
  userId: string;
  onSave?: () => void;
  onClose?: () => void;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  skill_tags: string[] | null;
}

const SUGGESTED_SKILLS = [
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
  "Writing",
  "Dancing",
  "Marketing",
];

export default function ProfileEdit({
  userId,
  onSave,
  onClose,
}: ProfileEditProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfile(data);
      setUsername(data.username || "");
      setFullName(data.full_name || "");
      setBio(data.bio || "");
      setSkillTags(data.skill_tags || []);
      setAvatarPreview(data.avatar_url);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      return null;
    }
  };

  const addSkillTag = (skill: string) => {
    if (skill && !skillTags.includes(skill) && skillTags.length < 10) {
      setSkillTags([...skillTags, skill]);
      setNewSkill("");
    }
  };

  const removeSkillTag = (skillToRemove: string) => {
    setSkillTags(skillTags.filter((skill) => skill !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          toast({
            title: "Avatar upload failed",
            description:
              "Failed to upload avatar. Profile will be saved without avatar change.",
            variant: "destructive",
          });
        }
      }

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        skill_tags: skillTags.length > 0 ? skillTags : null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error updating profile:", error);
        toast({
          title: "Failed to update profile",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Profile updated!",
        description: "Your profile has been saved successfully.",
      });

      onSave?.();
      onClose?.();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Profile</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={
                      avatarPreview ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
                    }
                    alt="Profile"
                  />
                  <AvatarFallback>
                    {(fullName || username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  placeholder="@username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea
                placeholder="Tell others about yourself and your skills..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500">
                {bio.length}/200 characters
              </p>
            </div>

            {/* Skill Tags */}
            <div className="space-y-4">
              <label className="text-sm font-medium">Skills & Interests</label>

              {/* Current Skills */}
              {skillTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillTags.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkillTag(skill)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add New Skill */}
              {skillTags.length < 10 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), addSkillTag(newSkill))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addSkillTag(newSkill)}
                    disabled={!newSkill.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Suggested Skills */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Suggested skills:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_SKILLS.filter(
                    (skill) => !skillTags.includes(skill),
                  )
                    .slice(0, 8)
                    .map((skill) => (
                      <Button
                        key={skill}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSkillTag(skill)}
                        disabled={skillTags.length >= 10}
                      >
                        {skill}
                      </Button>
                    ))}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {skillTags.length}/10 skills added
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
