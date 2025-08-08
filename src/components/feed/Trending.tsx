"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../supabase/client";
import { TrendingUp } from "lucide-react";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";

interface TrendingSkill {
  skill_category: string;
  post_count: number;
}

export default function Trending() {
  const [trendingSkills, setTrendingSkills] = useState<TrendingSkill[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchTrendingSkills();
  }, []);

  const fetchTrendingSkills = async () => {
    try {
      // Get trending skills based on recent posts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("posts")
        .select("skill_category")
        .gte("created_at", sevenDaysAgo.toISOString())
        .eq("privacy_setting", "public");

      if (error) {
        console.error("Error fetching trending:", error);
        return;
      }

      // Count posts by skill category
      const skillCounts: { [key: string]: number } = {};
      data?.forEach((post) => {
        skillCounts[post.skill_category] =
          (skillCounts[post.skill_category] || 0) + 1;
      });

      // Convert to array and sort
      const trending = Object.entries(skillCounts)
        .map(([skill_category, post_count]) => ({ skill_category, post_count }))
        .sort((a, b) => b.post_count - a.post_count)
        .slice(0, 5);

      setTrendingSkills(trending);
    } catch (error) {
      console.error("Error in fetchTrendingSkills:", error);
    }
  };

  if (trendingSkills.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center space-x-2 mb-2">
        <TrendingUp className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-gray-800">Trending Now</h3>
      </div>
      <ScrollArea className="w-full">
        <div className="flex space-x-2 pb-2">
          {trendingSkills.map((skill, index) => (
            <Badge
              key={skill.skill_category}
              className="whitespace-nowrap bg-gradient-to-r from-purple-600 to-pink-600 text-white cursor-pointer hover:from-purple-700 hover:to-pink-700 transition-colors"
            >
              #{index + 1} {skill.skill_category} ({skill.post_count})
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
