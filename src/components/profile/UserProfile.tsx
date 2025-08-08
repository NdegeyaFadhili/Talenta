"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Users,
  Heart,
  MessageCircle,
  Calendar,
  Award,
  Flame,
  Briefcase,
  Send,
  FileText,
  Link,
  Upload,
  Trash2,
  Download,
  ExternalLink,
  Plus,
} from "lucide-react";
import { useToast } from "../ui/use-toast";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  updateHireableStatusAction,
  sendHireMessageAction,
  addReferenceAction,
  deleteReferenceAction,
} from "../../app/actions";

interface UserProfileProps {
  userId: string;
  currentUserId?: string;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  skill_tags: string[] | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  learning_streak: number;
  hireable: boolean;
  created_at: string;
}

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  skill_category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface Reference {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

export default function UserProfile({
  userId,
  currentUserId,
}: UserProfileProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [hireMessage, setHireMessage] = useState("");
  const [sendingHireMessage, setSendingHireMessage] = useState(false);
  const [isHireDialogOpen, setIsHireDialogOpen] = useState(false);
  const [isAddReferenceDialogOpen, setIsAddReferenceDialogOpen] =
    useState(false);
  const [referenceType, setReferenceType] = useState("document");
  const [referenceTitle, setReferenceTitle] = useState("");
  const [referenceDescription, setReferenceDescription] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [addingReference, setAddingReference] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchReferences();
    if (currentUserId && currentUserId !== userId) {
      checkFollowStatus();
    }
  }, [userId, currentUserId]);

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
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const handleAddReference = async () => {
    if (!currentUserId || currentUserId !== userId) return;
    if (!referenceTitle.trim()) return;
    if (referenceType === "link" && !referenceUrl.trim()) return;
    if (referenceType === "document" && !referenceFile) return;

    setAddingReference(true);
    try {
      const formData = new FormData();
      formData.append("type", referenceType);
      formData.append("title", referenceTitle.trim());
      formData.append("description", referenceDescription.trim());

      if (referenceType === "link") {
        formData.append("url", referenceUrl.trim());
      } else if (referenceFile) {
        formData.append("file", referenceFile);
      }

      const result = await addReferenceAction(formData);

      if (result.success) {
        toast({
          title: "Reference added",
          description: "Your reference has been added successfully.",
        });

        // Reset form
        setReferenceTitle("");
        setReferenceDescription("");
        setReferenceUrl("");
        setReferenceFile(null);
        setIsAddReferenceDialogOpen(false);

        // Refresh references
        fetchReferences();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add reference",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding reference:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingReference(false);
    }
  };

  const handleDeleteReference = async (referenceId: string) => {
    if (!currentUserId || currentUserId !== userId) return;

    try {
      const formData = new FormData();
      formData.append("referenceId", referenceId);

      const result = await deleteReferenceAction(formData);

      if (result.success) {
        toast({
          title: "Reference deleted",
          description: "Your reference has been deleted successfully.",
        });

        // Refresh references
        fetchReferences();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete reference",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting reference:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from("media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleHireableToggle = async (checked: boolean) => {
    if (!currentUserId || currentUserId !== userId) return;

    try {
      const formData = new FormData();
      formData.append("hireable", checked.toString());

      const result = await updateHireableStatusAction(formData);

      if (result.success) {
        setProfile((prev) => (prev ? { ...prev, hireable: checked } : null));
        toast({
          title: checked ? "Available for hire" : "Not available for hire",
          description: checked
            ? "Others can now send you hire requests"
            : "You won't receive hire requests",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update hire status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating hireable status:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendHireMessage = async () => {
    if (!currentUserId || !hireMessage.trim()) return;

    setSendingHireMessage(true);
    try {
      const formData = new FormData();
      formData.append("receiverId", userId);
      formData.append(
        "message",
        `Hi! I'm interested in hiring you for your services. ${hireMessage.trim()}`,
      );

      const result = await sendHireMessageAction(formData);

      if (result.success) {
        toast({
          title: "Message sent!",
          description:
            "Your hire inquiry has been sent. They'll receive a notification.",
        });
        setHireMessage("");
        setIsHireDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending hire message:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingHireMessage(false);
    }
  };

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // If viewing someone else's profile, only show public posts
      if (currentUserId !== userId) {
        query = query.eq("privacy_setting", "public");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
        return;
      }

      setPosts(data || []);
    } catch (error) {
      console.error("Error in fetchPosts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferences = async () => {
    try {
      const { data, error } = await supabase
        .from("references")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching references:", error);
        return;
      }

      setReferences(data || []);
    } catch (error) {
      console.error("Error in fetchReferences:", error);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)
        .single();

      setIsFollowing(!!data);
    } catch (error) {
      // No follow relationship exists
      setIsFollowing(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to follow users.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", userId);
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: userId,
        });

        // Create notification
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "follow",
          title: "New Follower",
          message: `${profile?.full_name || "Someone"} started following you`,
          related_user_id: currentUserId,
        });
      }

      setIsFollowing(!isFollowing);

      // Update local follower count
      if (profile) {
        setProfile({
          ...profile,
          followers_count: isFollowing
            ? profile.followers_count - 1
            : profile.followers_count + 1,
        });
      }

      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing
          ? `You unfollowed ${profile?.full_name || "this user"}`
          : `You are now following ${profile?.full_name || "this user"}`,
      });
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 border-4 border-white">
              <AvatarImage
                src={
                  profile.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`
                }
                alt={profile.full_name || "User"}
              />
              <AvatarFallback className="text-2xl">
                {(profile.full_name ||
                  profile.username ||
                  "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {profile.full_name || profile.username || "Anonymous User"}
              </h1>
              {profile.username && profile.full_name && (
                <p className="text-purple-100">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="mt-2 text-purple-100">{profile.bio}</p>
              )}

              {/* Skill Tags */}
              {profile.skill_tags && profile.skill_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {profile.skill_tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-white/20 text-white"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-3">
              {/* Hireable Toggle - Only for profile owner */}
              {currentUserId && currentUserId === userId && (
                <div className="flex items-center space-x-3 bg-white/20 rounded-lg px-4 py-2">
                  <Briefcase className="h-5 w-5 text-white" />
                  <Label
                    htmlFor="hireable-toggle"
                    className="text-white font-medium"
                  >
                    Available for hire
                  </Label>
                  <Switch
                    id="hireable-toggle"
                    checked={profile.hireable || false}
                    onCheckedChange={handleHireableToggle}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {/* Follow Button */}
                {currentUserId && currentUserId !== userId && (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className={
                      isFollowing
                        ? "border-white text-white hover:bg-white hover:text-purple-600"
                        : "bg-white text-purple-600 hover:bg-purple-50"
                    }
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}

                {/* Hire Me Button - Only show if profile is hireable and not own profile */}
                {currentUserId &&
                  currentUserId !== userId &&
                  profile.hireable && (
                    <Dialog
                      open={isHireDialogOpen}
                      onOpenChange={setIsHireDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Hire Me
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Send Hire Inquiry</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            Send a message to{" "}
                            {profile.full_name ||
                              profile.username ||
                              "this user"}{" "}
                            about your hiring needs.
                          </p>
                          <Textarea
                            placeholder="Tell them about your project or what you need help with..."
                            value={hireMessage}
                            onChange={(e) => setHireMessage(e.target.value)}
                            rows={4}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsHireDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSendHireMessage}
                              disabled={
                                !hireMessage.trim() || sendingHireMessage
                              }
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {sendingHireMessage ? (
                                "Sending..."
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Inquiry
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {profile.posts_count}
              </div>
              <div className="text-sm text-gray-500">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {profile.followers_count}
              </div>
              <div className="text-sm text-gray-500">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {profile.following_count}
              </div>
              <div className="text-sm text-gray-500">Following</div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="flex items-center space-x-1">
                <Flame className="h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold text-gray-900">
                  {profile.learning_streak}
                </div>
              </div>
              <div className="text-sm text-gray-500">Day Streak</div>
            </div>
            {profile.hireable && (
              <div className="text-center flex flex-col items-center">
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-5 w-5 text-green-500" />
                  <div className="text-sm font-semibold text-green-600">
                    Available
                  </div>
                </div>
                <div className="text-sm text-gray-500">For Hire</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="liked">Liked</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="references">References</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    {post.media_url && (
                      <div className="aspect-square bg-gray-100">
                        {post.media_type === "video" ? (
                          <video
                            src={post.media_url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={post.media_url}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}
                    <CardContent className="p-4">
                      <Badge className="mb-2 bg-gradient-to-r from-purple-600 to-pink-600">
                        {post.skill_category}
                      </Badge>
                      {post.content && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {post.content}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3" />
                            <span>{post.likes_count}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{post.comments_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <div className="text-center py-12">
              <p className="text-gray-500">Liked posts feature coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Content Creator</h3>
                  <p className="text-sm text-gray-600">
                    Posted {profile.posts_count} times
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Flame className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Learning Streak</h3>
                  <p className="text-sm text-gray-600">
                    {profile.learning_streak} days in a row
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Community Builder</h3>
                  <p className="text-sm text-gray-600">
                    {profile.followers_count} followers
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="references" className="mt-6">
            <div className="space-y-4">
              {/* Add Reference Button - Only for profile owner */}
              {currentUserId && currentUserId === userId && (
                <div className="flex justify-end">
                  <Dialog
                    open={isAddReferenceDialogOpen}
                    onOpenChange={setIsAddReferenceDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Reference
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Reference</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Reference Type */}
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="document"
                                checked={referenceType === "document"}
                                onChange={(e) =>
                                  setReferenceType(e.target.value)
                                }
                                className="text-purple-600"
                              />
                              <span className="text-sm">Document</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="link"
                                checked={referenceType === "link"}
                                onChange={(e) =>
                                  setReferenceType(e.target.value)
                                }
                                className="text-purple-600"
                              />
                              <span className="text-sm">Link</span>
                            </label>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                          <Label htmlFor="reference-title">Title *</Label>
                          <Input
                            id="reference-title"
                            placeholder="e.g., CV, LinkedIn Profile, Certificate"
                            value={referenceTitle}
                            onChange={(e) => setReferenceTitle(e.target.value)}
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label htmlFor="reference-description">
                            Description
                          </Label>
                          <Textarea
                            id="reference-description"
                            placeholder="Brief description of this reference"
                            value={referenceDescription}
                            onChange={(e) =>
                              setReferenceDescription(e.target.value)
                            }
                            rows={3}
                          />
                        </div>

                        {/* URL for links */}
                        {referenceType === "link" && (
                          <div className="space-y-2">
                            <Label htmlFor="reference-url">URL *</Label>
                            <Input
                              id="reference-url"
                              type="url"
                              placeholder="https://linkedin.com/in/yourprofile"
                              value={referenceUrl}
                              onChange={(e) => setReferenceUrl(e.target.value)}
                            />
                          </div>
                        )}

                        {/* File upload for documents */}
                        {referenceType === "document" && (
                          <div className="space-y-2">
                            <Label htmlFor="reference-file">File *</Label>
                            <Input
                              id="reference-file"
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                setReferenceFile(e.target.files?.[0] || null)
                              }
                            />
                            <p className="text-xs text-gray-500">
                              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max
                              10MB)
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsAddReferenceDialogOpen(false);
                              setReferenceTitle("");
                              setReferenceDescription("");
                              setReferenceUrl("");
                              setReferenceFile(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddReference}
                            disabled={addingReference || !referenceTitle.trim()}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {addingReference ? "Adding..." : "Add Reference"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* References List */}
              {references.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {currentUserId === userId
                      ? "No references added yet. Add your first reference!"
                      : "No references available"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {references.map((reference) => (
                    <Card
                      key={reference.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0">
                              {reference.type === "document" ? (
                                <FileText className="h-8 w-8 text-blue-600" />
                              ) : (
                                <Link className="h-8 w-8 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {reference.title}
                              </h4>
                              {reference.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {reference.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {reference.type === "document"
                                    ? "Document"
                                    : "Link"}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    reference.created_at,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-2">
                            {/* View/Download Button */}
                            {reference.type === "document" &&
                            reference.file_path ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  window.open(
                                    getFileUrl(reference.file_path!),
                                    "_blank",
                                  )
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : reference.type === "link" && reference.url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  window.open(reference.url!, "_blank")
                                }
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            ) : null}

                            {/* Delete Button - Only for profile owner */}
                            {currentUserId && currentUserId === userId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDeleteReference(reference.id)
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
