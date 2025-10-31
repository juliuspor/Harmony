import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, Users, MessageCircle } from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const dataSources: DataSource[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Monitor channels for new ideas and discussions",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Watch team chats and conversations",
    icon: <Users className="h-6 w-6" />,
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Scan emails sent to specific addresses",
    icon: <Mail className="h-6 w-6" />,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Monitor servers for new ideas and conversations",
    icon: <MessageCircle className="h-6 w-6" />,
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
          className={`transition-all ${
            selectedSources.includes(source.id)
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          }`}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-start space-x-4 flex-1">
              <div className="text-primary">{source.icon}</div>
              <div className="flex-1 space-y-1">
                <Label className="font-semibold text-foreground">
                  {source.name}
                </Label>
                <p className="text-sm text-muted-foreground">{source.description}</p>
              </div>
            </div>
            <Button
              onClick={() => handleToggle(source.id)}
              variant={selectedSources.includes(source.id) ? "default" : "outline"}
              className="ml-4"
            >
              {selectedSources.includes(source.id) ? "Connected" : "Connect"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
