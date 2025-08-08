"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../supabase/client";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";

interface SkillCategory {
  id: string;
  name: string;
  posts_count: number;
}

export default function SuggestedSkills() {
  const [skills, setSkills] = useState<SkillCategory[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchSuggestedSkills();
  }, []);

  const fetchSuggestedSkills = async () => {
    try {
      const { data, error } = await supabase
        .from("skill_categories")
        .select("*")
        .order("posts_count", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching skills:", error);
        return;
      }

      setSkills(data || []);
    } catch (error) {
      console.error("Error in fetchSuggestedSkills:", error);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">
        Suggested Skills
      </h3>
      <ScrollArea className="w-full">
        <div className="flex space-x-2 pb-2">
          {skills.map((skill) => (
            <Badge
              key={skill.id}
              variant="secondary"
              className="whitespace-nowrap cursor-pointer hover:bg-purple-100 transition-colors"
            >
              {skill.name} ({skill.posts_count})
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
