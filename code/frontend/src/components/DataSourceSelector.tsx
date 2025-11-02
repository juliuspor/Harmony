import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DataSource {
  id: string;
  name: string;
  description: string;
  logo: string;
  requiresOAuth: boolean;
}

const dataSources: DataSource[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Monitor channels for new ideas and discussions",
    logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 127 127'%3E%3Cpath d='M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z' fill='%23E01E5A'/%3E%3Cpath d='M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z' fill='%2336C5F0'/%3E%3Cpath d='M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z' fill='%232EB67D'/%3E%3Cpath d='M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z' fill='%23ECB22E'/%3E%3C/svg%3E",
    requiresOAuth: true,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Monitor servers for new ideas and conversations",
    logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 127.14 96.36'%3E%3Cpath fill='%235865f2' d='M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z'/%3E%3C/svg%3E",
    requiresOAuth: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Monitor groups for new community input",
    logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%2325D366' d='M16 0C7.164 0 0 7.163 0 16c0 2.777.712 5.389 1.959 7.663L.049 31.32l7.896-2.05A15.926 15.926 0 0016 32c8.836 0 16-7.163 16-16S24.836 0 16 0z'/%3E%3Cpath fill='%23FFF' d='M25.367 22.473c-.358.977-1.772 1.789-2.898 2.04-.752.167-1.732.3-5.039-1.08-4.235-1.766-6.969-6.053-7.18-6.33-.208-.278-1.696-2.26-1.696-4.31s1.073-3.058 1.454-3.475c.38-.417.831-.522 1.108-.522.277 0 .554.003.797.015.256.013.598-.097.936.713.347.826 1.178 2.877 1.281 3.086.104.208.174.451.035.729-.139.278-.208.451-.416.695-.208.243-.437.543-.624.729-.208.208-.424.434-.182.85.243.416 1.078 1.778 2.314 2.88 1.59 1.418 2.929 1.858 3.345 2.066.416.208.66.174.903-.104.243-.278 1.04-1.214 1.318-1.631.278-.416.556-.347.937-.208.382.139 2.424 1.144 2.84 1.352.416.208.694.313.797.486.104.174.104 1.005-.254 1.981z'/%3E%3C/svg%3E",
    requiresOAuth: true,
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Monitor email conversations and team discussions",
    logo: "/images/Microsoft_Office_Outlook_Logo_512px.png",
    requiresOAuth: true,
  },
];

interface DataSourceSelectorProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
}

export function DataSourceSelector({ selectedSources, onSourcesChange }: DataSourceSelectorProps) {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check connection status for OAuth sources
    const checkStatus = async () => {
      for (const source of dataSources.filter((s) => s.requiresOAuth)) {
        try {
          const response = await fetch(`http://localhost:8000/oauth/status/${source.id}`);
          const data = await response.json();
          setConnectionStatus((prev) => ({ ...prev, [source.id]: data.connected }));
        } catch (error) {
          console.error(`Failed to check ${source.id} status:`, error);
        }
      }
    };
    checkStatus();

    // Poll for status updates every 2 seconds
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (sourceId: string, requiresOAuth: boolean) => {
    if (!requiresOAuth) {
      // For non-OAuth sources, just toggle selection
      handleToggle(sourceId);
      return;
    }

    // Check if already connected (e.g., via pre-configured bot token)
    if (connectionStatus[sourceId]) {
      // Already connected, just toggle selection
      const isCurrentlySelected = selectedSources.includes(sourceId);
      handleToggle(sourceId);

      // Show toast to confirm the connection is real and active
      if (!isCurrentlySelected) {
        toast.success(
          `${sourceId.charAt(0).toUpperCase() + sourceId.slice(1)} connected! Messages will be posted to your workspace.`,
          {
            description: "OAuth connection active",
          }
        );
      }
      return;
    }

    // For OAuth sources, open OAuth flow
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const oauthWindow = window.open(
      `http://localhost:8000/oauth/${sourceId}/initiate`,
      `${sourceId}_oauth`,
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!oauthWindow) {
      toast.error("Please allow popups to connect to " + sourceId);
      return;
    }

    // Check if window closed and update status
    const checkWindowClosed = setInterval(() => {
      if (oauthWindow.closed) {
        clearInterval(checkWindowClosed);
        // Wait a bit for the backend to update, then check status
        setTimeout(async () => {
          try {
            const response = await fetch(`http://localhost:8000/oauth/status/${sourceId}`);
            const data = await response.json();
            if (data.connected) {
              setConnectionStatus((prev) => ({ ...prev, [sourceId]: true }));
              handleToggle(sourceId);
              toast.success(
                `${sourceId.charAt(0).toUpperCase() + sourceId.slice(1)} connected successfully!`
              );
            }
          } catch (error) {
            console.error(`Failed to check ${sourceId} status:`, error);
          }
        }, 500);
      }
    }, 500);
  };

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
          className={`transition-all border-2 ${
            selectedSources.includes(source.id)
              ? "border-primary bg-primary/5"
              : "hover:border-primary/30"
          }`}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex-shrink-0">
                <img src={source.logo} alt={source.name} className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="font-semibold text-foreground">{source.name}</Label>
                <p className="text-sm text-muted-foreground">{source.description}</p>
              </div>
            </div>
            <Button
              onClick={() => handleConnect(source.id, source.requiresOAuth)}
              variant={selectedSources.includes(source.id) ? "default" : "outline"}
              className={`ml-4 transition-all ${
                selectedSources.includes(source.id)
                  ? ""
                  : "border-2 border-primary/50 text-primary hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white hover:border-0"
              }`}
            >
              {selectedSources.includes(source.id) ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Connected
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
