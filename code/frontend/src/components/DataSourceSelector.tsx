import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, Mic, FileText, Users } from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const dataSources: DataSource[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Monitor channels for new ideas and discussions",
    icon: <MessageSquare className="h-6 w-6" />,
    comingSoon: true,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Watch team chats and conversations",
    icon: <Users className="h-6 w-6" />,
    comingSoon: true,
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Scan emails sent to specific addresses",
    icon: <Mail className="h-6 w-6" />,
    comingSoon: true,
  },
  {
    id: "audio",
    name: "Meeting Audio",
    description: "Live transcription from meetings",
    icon: <Mic className="h-6 w-6" />,
    comingSoon: true,
  },
  {
    id: "documents",
    name: "Documents",
    description: "Upload PDFs, TXTs, or CSVs",
    icon: <FileText className="h-6 w-6" />,
  },
];

interface DataSourceSelectorProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
}

export function DataSourceSelector({ selectedSources, onSourcesChange }: DataSourceSelectorProps) {
  const handleToggle = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      onSourcesChange(selectedSources.filter((id) => id !== sourceId));
    } else {
      onSourcesChange([...selectedSources, sourceId]);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {dataSources.map((source) => (
        <Card
          key={source.id}
          className={`cursor-pointer transition-all ${
            selectedSources.includes(source.id)
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          } ${source.comingSoon ? "opacity-60" : ""}`}
          onClick={() => !source.comingSoon && handleToggle(source.id)}
        >
          <CardContent className="flex items-start space-x-4 p-6">
            <div className="text-primary">{source.icon}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={source.id}
                  className="cursor-pointer font-semibold text-foreground"
                >
                  {source.name}
                </Label>
                <Checkbox
                  id={source.id}
                  checked={selectedSources.includes(source.id)}
                  disabled={source.comingSoon}
                  onCheckedChange={() => !source.comingSoon && handleToggle(source.id)}
                />
              </div>
              <p className="text-sm text-muted-foreground">{source.description}</p>
              {source.comingSoon && (
                <p className="text-xs font-medium text-warning">Coming Soon</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
