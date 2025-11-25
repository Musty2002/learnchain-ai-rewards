import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  value: number;
  label?: string;
}

export const ProgressBar = ({ value, label }: ProgressBarProps) => {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-foreground">{value}%</span>
        </div>
      )}
      <Progress value={value} className="h-2" />
    </div>
  );
};