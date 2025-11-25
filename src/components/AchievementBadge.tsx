import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
}

export const AchievementBadge = ({ achievement }: AchievementBadgeProps) => {
  return (
    <Card className="p-4 hover:shadow-glow transition-all bg-gradient-to-br from-card to-card/50 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="text-4xl">{achievement.icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{achievement.title}</h4>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Earned {new Date(achievement.earned_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Card>
  );
};