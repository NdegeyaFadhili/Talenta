"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { MessageCircle, Send, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Conversation {
  user_id: string;
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message: Message | null;
  unread_count: number;
}

export default function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchConversations = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get all messages where user is sender or receiver
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          receiver:profiles!messages_receiver_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      messagesData?.forEach((message) => {
        const partnerId =
          message.sender_id === currentUser.id
            ? message.receiver_id
            : message.sender_id;

        const partner =
          message.sender_id === currentUser.id
            ? message.receiver
            : message.sender;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            user_id: partnerId,
            user: partner,
            last_message: message,
            unread_count: 0,
          });
        }

        // Count unread messages from this partner
        if (message.receiver_id === currentUser.id && !message.read) {
          const conv = conversationMap.get(partnerId)!;
          conv.unread_count += 1;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Error in fetchConversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (partnerId: string) => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`,
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", partnerId)
        .eq("receiver_id", currentUser.id)
        .eq("read", false);
    } catch (error) {
      console.error("Error in fetchMessages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser || sending)
      return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUser.id,
        receiver_id: selectedConversation,
        content: newMessage.trim(),
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }

      setNewMessage("");
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (error) {
      console.error("Error in sendMessage:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen bg-white flex">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search conversations..." className="pl-10" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-2">No chats yet</p>
              <p className="text-sm text-gray-400">
                Find people and start connecting to see your conversations here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <div
                  key={conversation.user_id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.user_id
                      ? "bg-purple-50 border-r-2 border-r-purple-600"
                      : ""
                  }`}
                  onClick={() => setSelectedConversation(conversation.user_id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={
                          conversation.user.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.user.id}`
                        }
                        alt={conversation.user.full_name || "User"}
                      />
                      <AvatarFallback>
                        {(conversation.user.full_name ||
                          conversation.user.username ||
                          "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.user.full_name ||
                            conversation.user.username ||
                            "Anonymous"}
                        </h3>
                        {conversation.last_message && (
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(
                              new Date(conversation.last_message.created_at),
                              { addSuffix: true },
                            )}
                          </span>
                        )}
                      </div>
                      {conversation.last_message && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.last_message.sender_id ===
                          currentUser?.id
                            ? "You: "
                            : ""}
                          {conversation.last_message.content}
                        </p>
                      )}
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              {(() => {
                const conversation = conversations.find(
                  (c) => c.user_id === selectedConversation,
                );
                return conversation ? (
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          conversation.user.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.user.id}`
                        }
                        alt={conversation.user.full_name || "User"}
                      />
                      <AvatarFallback>
                        {(conversation.user.full_name ||
                          conversation.user.username ||
                          "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {conversation.user.full_name ||
                          conversation.user.username ||
                          "Anonymous"}
                      </h3>
                      {conversation.user.username &&
                        conversation.user.full_name && (
                          <p className="text-sm text-gray-500">
                            @{conversation.user.username}
                          </p>
                        )}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === currentUser?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === currentUser?.id
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === currentUser?.id
                            ? "text-purple-100"
                            : "text-gray-500"
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a conversation from the sidebar to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
