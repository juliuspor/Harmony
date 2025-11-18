import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Sparkles,
  Clock,
  MessageSquare,
  User,
  Bot,
  Brain,
  Lightbulb,
  Zap,
  Target,
  Shield,
  UserCircle,
  ChevronDown,
  Activity,
  Flame,
  Film,
  Radar,
  Gauge,
  Layers,
  Mic2,
  Orbit,
  Palette,
  BarChart3,
  TimerReset,
  Stars,
} from "lucide-react";
import type { DebateResponse } from "@/lib/api";
import { getDebateStatus } from "@/lib/api";

interface LiveDebateViewProps {
  debateId: string;
  onComplete?: (debateData: DebateResponse) => void;
  viewOnly?: boolean; // If true, don't call onComplete for already-completed debates
}

interface Message {
  message_id: string;
  content: string;
  agent_id: string;
  agent_name: string;
  round_number: number;
  message_type: string;
  timestamp: string;
}

// Generate consistent colors for agents based on their ID
const getAgentColor = (agentId: string): string => {
  const colors = [
    {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/30",
    },
    { bg: "bg-accent/10", text: "text-accent", border: "border-accent/30" },
    { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
    {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    { bg: "bg-primary/15", text: "text-primary", border: "border-primary/40" },
    { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  ];

  if (agentId === "orchestrator") {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  // Hash the agent_id to get consistent color
  const hash = agentId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % colors.length;
  return `${colors[colorIndex].bg} ${colors[colorIndex].text} ${colors[colorIndex].border}`;
};

// Get agent icon based on their ID
const getAgentIcon = (agentId: string) => {
  // Icons array for consistent assignment
  const icons = [Bot, Brain, Lightbulb, User, Zap, Target, UserCircle, Sparkles];

  // Orchestrator gets shield icon
  if (agentId === "orchestrator") {
    return Shield;
  }

  // Hash the agent_id to get consistent icon
  const hash = agentId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const iconIndex = hash % icons.length;
  return icons[iconIndex];
};

const getAgentDisplayName = (agentId: string, agentName: string): string => {
  if (agentId === "orchestrator") {
    return "Moderator";
  }
  return agentName;
};

const truncateText = (text: string, maxLength = 160): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
};

const stopWords = new Set([
  "the",
  "and",
  "that",
  "with",
  "from",
  "this",
  "have",
  "will",
  "your",
  "about",
  "into",
  "their",
  "which",
  "been",
  "they",
  "them",
  "then",
  "also",
  "each",
  "most",
  "more",
  "such",
  "than",
  "because",
  "while",
  "there",
  "where",
  "when",
  "what",
  "make",
  "made",
  "over",
  "some",
  "that",
]);

export function LiveDebateView({ debateId, onComplete, viewOnly = false }: LiveDebateViewProps) {
  const [debate, setDebate] = useState<DebateResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);

  const agentMap = useMemo(() => {
    const map = new Map<string, DebateResponse["agents"][number]>();
    debate?.agents?.forEach((agent) => {
      map.set(agent.agent_id, agent);
    });
    return map;
  }, [debate?.agents]);

  const groupedMessages = useMemo<Record<number, Message[]>>(() => {
    return messages.reduce<Record<number, Message[]>>((acc, message) => {
      if (!acc[message.round_number]) {
        acc[message.round_number] = [];
      }
      acc[message.round_number].push(message);
      return acc;
    }, {});
  }, [messages]);

  const rounds = useMemo(
    () =>
      Object.keys(groupedMessages)
        .map(Number)
        .sort((a, b) => a - b),
    [groupedMessages]
  );

  const activeRound = rounds.length > 0 ? rounds[rounds.length - 1] : 1;

  const timelineData = useMemo(
    () =>
      rounds.map((round) => {
        const roundMessages = groupedMessages[round] || [];
        const participants = Array.from(
          new Set(
            roundMessages.map((msg) => getAgentDisplayName(msg.agent_id, msg.agent_name))
          )
        );
        const highlightMessage =
          roundMessages.find((msg) => msg.agent_id === "orchestrator") ||
          roundMessages[roundMessages.length - 1];

        return {
          round,
          messageCount: roundMessages.length,
          participants,
          highlight: highlightMessage?.content ?? "",
        };
      }),
    [groupedMessages, rounds]
  );

  const spotlightMessages = useMemo(() => {
    if (messages.length === 0) return [];
    return [...messages.slice(-3)].reverse();
  }, [messages]);

  const agentPulse = useMemo(() => {
    if (!debate?.agents) return [];

    const stats = messages.reduce<Record<string, { count: number; lastRound: number }>>(
      (acc, message) => {
        if (!acc[message.agent_id]) {
          acc[message.agent_id] = { count: 0, lastRound: message.round_number };
        }
        acc[message.agent_id].count += 1;
        acc[message.agent_id].lastRound = Math.max(
          acc[message.agent_id].lastRound,
          message.round_number
        );
        return acc;
      },
      {}
    );

    return debate.agents.map((agent) => ({
      ...agent,
      messageCount: stats[agent.agent_id]?.count ?? 0,
      lastRound: stats[agent.agent_id]?.lastRound ?? null,
    }));
  }, [debate?.agents, messages]);

  const maxAgentMessages =
    agentPulse.reduce((max, agent) => Math.max(max, agent.messageCount), 0) || 1;

  const expectedRoundVolume = Math.max(1, (debate?.agents?.length || 1) * 2);

  const roundsPreview = useMemo(() => rounds.slice(-3), [rounds]);

  const pulseLeaders = useMemo(() => {
    return [...agentPulse]
      .filter((agent) => agent.messageCount > 0)
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 4);
  }, [agentPulse]);

  const avgMessageLength = useMemo(() => {
    if (messages.length === 0) return 0;
    const total = messages.reduce((sum, message) => sum + message.content.length, 0);
    return Math.round(total / messages.length);
  }, [messages]);

  const orchestratorHighlights = useMemo(() => {
    return messages.filter((msg) => msg.agent_id === "orchestrator").slice(-3).reverse();
  }, [messages]);

  const energyLevel = useMemo(() => {
    const capacity = Math.max(1, rounds.length * expectedRoundVolume);
    return Math.min(100, Math.round((messages.length / capacity) * 100));
  }, [messages.length, rounds.length, expectedRoundVolume]);

  const clusterBreakdown = useMemo(() => {
    if (!debate?.agents || debate.agents.length === 0) return [];
    const clusters = new Map<
      number,
      { clusterId: number; label: string; agents: string[]; messages: number }
    >();

    debate.agents.forEach((agent) => {
      const label = agent.persona_summary
        ? agent.persona_summary.split(".")[0]
        : `Cluster ${agent.cluster_id}`;
      clusters.set(agent.cluster_id, {
        clusterId: agent.cluster_id,
        label,
        agents: [],
        messages: 0,
      });
    });

    debate.agents.forEach((agent) => {
      const cluster = clusters.get(agent.cluster_id);
      if (cluster) {
        cluster.agents.push(getAgentDisplayName(agent.agent_id, agent.agent_name));
      }
    });

    messages.forEach((message) => {
      const agent = agentMap.get(message.agent_id);
      if (!agent) return;
      const cluster = clusters.get(agent.cluster_id);
      if (cluster) {
        cluster.messages += 1;
      }
    });

    return Array.from(clusters.values()).sort((a, b) => b.messages - a.messages);
  }, [agentMap, debate?.agents, messages]);

  const velocityTrend = useMemo(() => {
    if (rounds.length === 0) return [];
    const lastRounds = rounds.slice(-4);
    return lastRounds.map((round) => {
      const entry = timelineData.find((item) => item.round === round);
      return {
        round,
        messages: entry?.messageCount || 0,
        participants: entry?.participants.length || 0,
      };
    });
  }, [rounds, timelineData]);

  const messageTypeStats = useMemo(() => {
    if (messages.length === 0) return [];
    const stats = messages.reduce<Record<string, number>>((acc, message) => {
      const key = message.message_type || "message";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [messages]);

  const recentQuotes = useMemo(() => {
    return messages.slice(-4).reverse();
  }, [messages]);

  useEffect(() => {
    if (rounds.length === 0) return;
    const latestRound = rounds[rounds.length - 1];
    setExpandedRounds((prev) => {
      if (prev.includes(latestRound)) {
        return prev;
      }
      return [...prev, latestRound];
    });
  }, [rounds]);

  // Auto-scroll to bottom when new messages arrive (only within the container)
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      // Find the ScrollArea viewport element
      const scrollArea = scrollContainerRef.current;
      if (scrollArea) {
        // ScrollArea creates a viewport with data-radix-scroll-area-viewport attribute
        const viewport = scrollArea.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLDivElement;
        if (viewport) {
          // Scroll only the viewport, not the entire page
          setTimeout(() => {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: "smooth",
            });
          }, 100);
        }
      }
      lastMessageCountRef.current = messages.length;
    }
  }, [messages]);

  // Poll for debate updates
  useEffect(() => {
    let isMounted = true;

    const fetchDebateStatus = async () => {
      try {
        const data = await getDebateStatus(debateId);

        if (!isMounted) return;

        setDebate(data);
        setMessages(data.messages || []);
        setIsLoading(false);

        // If debate is complete, stop polling and call onComplete (unless in viewOnly mode)
        if (data.status === "completed" || data.status === "cancelled") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (data.status === "completed" && onComplete && !viewOnly) {
            onComplete(data);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch debate status:", err);
        setError(err instanceof Error ? err.message : "Failed to load debate");
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchDebateStatus();

    // Poll every 2 seconds while debate is running
    pollIntervalRef.current = setInterval(fetchDebateStatus, 2000);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [debateId, onComplete, viewOnly]);

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) =>
      prev.includes(round) ? prev.filter((entry) => entry !== round) : [...prev, round]
    );
  };

  if (isLoading && !debate) {
    return (
      <Card className="border-2 rounded-2xl">
        <CardContent className="pt-6 text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Sparkles className="h-12 w-12 text-primary" />
          </motion.div>
          <p className="mt-4 text-muted-foreground font-medium">Initializing debate...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-destructive rounded-2xl">
        <CardContent className="pt-6 text-center py-12">
          <p className="text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const isComplete = debate?.status === "completed";
  const isCancelled = debate?.status === "cancelled";
  const currentRound = messages.length > 0 ? Math.max(...messages.map((m) => m.round_number)) : 1;
  const latestUpdate = debate?.updated_at ? new Date(debate.updated_at).toLocaleTimeString() : null;
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastSpeaker = lastMessage
    ? getAgentDisplayName(lastMessage.agent_id, lastMessage.agent_name)
    : null;
  const statusCopy = isComplete
    ? "Consensus locked in"
    : isCancelled
    ? "Debate interrupted"
    : "Negotiation in progress";
  const nextCue = isComplete
    ? "Highlight the consensus metrics next."
    : isCancelled
    ? "Explain why the session stopped."
    : `Waiting for ${debate?.agents?.length || 0} agents to wrap round ${activeRound}.`;
  const hasMessages = messages.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="border-0 rounded-3xl bg-gradient-to-br from-background via-primary/10 to-accent/10 shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="tracking-wide uppercase">
                Debate {debateId.slice(-5).toUpperCase()}
              </Badge>
              {!isComplete && !isCancelled ? (
                <Badge className="bg-green-500 text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  Live
                </Badge>
              ) : (
                <Badge variant="secondary" className="capitalize">
                  {isComplete ? "Complete" : "Cancelled"}
                </Badge>
              )}
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr] items-center">
              <div className="space-y-4">
                <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                  Current Stage
                </p>
                <h2 className="text-3xl font-bold leading-tight text-foreground">{statusCopy}</h2>
                <p className="text-sm text-muted-foreground">
                  Round {currentRound} · {messages.length} exchanges · {debate?.agents?.length || 0} agents
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: "Agents", value: debate?.agents?.length || 0, icon: Users },
                  { label: "Exchanges", value: messages.length, icon: MessageSquare },
                  { label: "Round", value: currentRound, icon: Clock },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border/60 bg-background/60 p-3 flex flex-col gap-2"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-semibold">{item.value}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </span>
            </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-3xl h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Demo Prompter
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Script-ready cues for a tight 2 minute walkthrough
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border bg-muted/40 p-3 leading-relaxed">- {nextCue}</div>
            {lastSpeaker && (
              <div className="rounded-2xl border bg-muted/40 p-3 leading-relaxed">
                - {lastSpeaker} delivered the latest point.
                </div>
            )}
            {latestUpdate && (
              <div className="rounded-2xl border bg-muted/40 p-3 leading-relaxed">
                - Updated at {latestUpdate}.
              </div>
            )}
            {!hasMessages && (
              <div className="rounded-2xl border bg-muted/40 p-3 leading-relaxed">
                - Spotlight will populate once the first exchange lands.
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
        <div className="space-y-6">
          <Card className="border-2 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Round Timeline
          </CardTitle>
              <p className="text-sm text-muted-foreground">
                Follow the arc of the discussion round by round
              </p>
        </CardHeader>
        <CardContent>
              {timelineData.length > 0 ? (
                <div className="space-y-4">
                  {timelineData.map((roundInfo) => {
                    const progress = Math.min(
                      100,
                      (roundInfo.messageCount / expectedRoundVolume) * 100
                    );
                    return (
                      <motion.div
                        key={roundInfo.round}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`rounded-2xl border p-4 bg-background/80 ${
                          roundInfo.round === activeRound
                            ? "border-primary/70 shadow-lg shadow-primary/10"
                            : "border-border/60"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                          <span>Round {roundInfo.round}</span>
                          <span>
                            {roundInfo.participants.length} voices · {roundInfo.messageCount} exchanges
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-2 rounded-full bg-gradient-to-r from-primary via-accent to-primary"
                          />
                        </div>
                        {roundInfo.highlight && (
                          <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                            {truncateText(roundInfo.highlight, 140)}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Waiting for the first round to start.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Agent Pulseboard
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Show who is driving the conversation
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentPulse.length > 0 ? (
                agentPulse.map((agent) => {
                  const colorClasses = getAgentColor(agent.agent_id);
                  const AgentIcon = getAgentIcon(agent.agent_id);
                  const isOrchestrator = agent.agent_id === "orchestrator";
                  return (
                    <div
                      key={agent.agent_id}
                      className="rounded-2xl border bg-background/70 p-3 flex gap-3"
                    >
                      <Avatar className={`h-11 w-11 border ${colorClasses}`}>
                            {isOrchestrator && (
                              <AvatarImage src="/images/moderator-avatar.png" alt="Moderator" />
                            )}
                            <AvatarFallback className={colorClasses}>
                              <AgentIcon className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">
                              {getAgentDisplayName(agent.agent_id, agent.agent_name)}
                            </p>
                            {agent.persona_summary && (
                              <p className="text-xs text-muted-foreground">
                                {truncateText(agent.persona_summary, 120)}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                            {agent.messageCount} msg
                          </Badge>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.max(5, (agent.messageCount / maxAgentMessages) * 100)}%`,
                            }}
                            className="h-2 rounded-full bg-gradient-to-r from-primary via-accent to-primary"
                          />
                        </div>
                        {agent.lastRound && (
                          <p className="text-[11px] text-muted-foreground">
                            Last heard in round {agent.lastRound}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Agents will appear here as soon as the debate begins.
            </div>
          )}
        </CardContent>
      </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-0 bg-gradient-to-br from-primary/80 via-primary/70 to-accent/70 text-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Flame className="h-5 w-5" />
                Momentum Spotlight
          </CardTitle>
              <p className="text-sm text-white/80">
                Recap the freshest arguments before diving into details
              </p>
        </CardHeader>
            <CardContent className="space-y-4">
              {spotlightMessages.length > 0 ? (
                spotlightMessages.map((message, index) => (
                <motion.div
                    key={message.message_id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                      <span>{getAgentDisplayName(message.agent_id, message.agent_name)}</span>
                      <span>Round {message.round_number}</span>
                    </div>
                    <p className="mt-2 text-base font-semibold leading-snug">
                      {truncateText(message.content, 220)}
                    </p>
                </motion.div>
                ))
              ) : (
                <p className="text-sm text-white/80">
                  Spotlight tiles unlock once the first arguments land.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Discussion Flow
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Expand a round to narrate the beats in your demo
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]" ref={scrollContainerRef}>
                <div className="divide-y">
                  {rounds.length > 0 ? (
                    rounds.map((round) => {
                      const messagesForRound = groupedMessages[round] || [];
                      const timelineEntry = timelineData.find((entry) => entry.round === round);
                      const participantsCount = timelineEntry?.participants.length || 0;
                      const highlight = timelineEntry?.highlight ?? "";
                      const isExpanded = expandedRounds.includes(round);
                      return (
                        <div key={round} className="px-6 py-5">
                          <button
                            type="button"
                            onClick={() => toggleRound(round)}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="text-xs">
                                  Round {round}
                                </Badge>
                                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                  {participantsCount} voices · {messagesForRound.length} exchanges
                                </span>
                              </div>
                              {highlight && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {truncateText(highlight, 160)}
                                </p>
                              )}
                            </div>
                            <motion.span
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              className="text-muted-foreground"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </motion.span>
                          </button>
              <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                <div className="mt-4 space-y-3">
                                  {messagesForRound.map((message, index) => {
                  const isOrchestrator = message.agent_id === "orchestrator";
                  const colorClasses = getAgentColor(message.agent_id);
                  const AgentIcon = getAgentIcon(message.agent_id);
                  return (
                                      <div
                      key={message.message_id || index}
                                        className="flex gap-3 rounded-2xl border bg-background/80 p-3"
                    >
                                        <Avatar className={`h-10 w-10 border ${colorClasses}`}>
                        {isOrchestrator && (
                                            <AvatarImage
                                              src="/images/moderator-avatar.png"
                                              alt="Moderator"
                                            />
                        )}
                        <AvatarFallback className={colorClasses}>
                                            <AgentIcon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                                        <div className="flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-sm">
                                              {getAgentDisplayName(message.agent_id, message.agent_name)}
                                            </span>
                          {isOrchestrator && (
                                              <Badge
                                                variant="outline"
                                                className="text-[11px] uppercase tracking-wide bg-slate-100 text-slate-900 border border-slate-200"
                                              >
                              Moderator
                            </Badge>
                          )}
                                            <Badge variant="secondary" className="text-[11px]">
                                              Round {message.round_number}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-foreground/90 leading-relaxed mt-1">
                                            {message.content}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground mt-1">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Transcript will appear once the debate begins.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
                        </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-[0.3em]">
              Concept Lab
            </p>
            <h3 className="text-xl font-semibold">Alternate visual directions to compare live</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            Prototype shelf
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-3xl border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Film className="h-4 w-4" />
                Cinematic Storystrip
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Use marquee beats per round to narrate a hero storyline.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {roundsPreview.length > 0 ? (
                roundsPreview.map((round) => {
                  const entry = timelineData.find((item) => item.round === round);
                  return (
                    <div
                      key={round}
                      className="rounded-2xl border border-primary/30 bg-white/60 dark:bg-background/40 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-primary">
                        <span>Beat {round}</span>
                        <span>{entry?.participants.length || 0} voices</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {entry?.highlight ? truncateText(entry.highlight, 110) : "Awaiting signature quote"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Will auto-populate once two rounds are in the books.
                </p>
              )}
                          </CardContent>
                        </Card>

          <Card className="rounded-3xl border-2 border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent-foreground">
                <Orbit className="h-4 w-4" />
                Agent Orbit
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Spotlight the loudest agents around a common orbit.
              </p>
            </CardHeader>
            <CardContent>
              {pulseLeaders.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {pulseLeaders.map((agent) => {
                    const colorClasses = getAgentColor(agent.agent_id);
                    return (
                      <div
                        key={agent.agent_id}
                        className={`flex flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center ${colorClasses}`}
                      >
                        <span className="text-xs uppercase tracking-wide">
                          {getAgentDisplayName(agent.agent_id, agent.agent_name)}
                        </span>
                        <span className="text-2xl font-bold">{agent.messageCount}</span>
                        <span className="text-[11px] opacity-80">exchanges</span>
                      </div>
                  );
                })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Crowd these chips as soon as agents take the floor.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-200">
                <Gauge className="h-4 w-4" />
                Consensus Meter
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Measure energy vs. capacity for a control-room feel.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Energy Level</span>
                  <span>{energyLevel}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-emerald-200/50 dark:bg-emerald-900/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${energyLevel}%` }}
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-primary to-emerald-600"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 bg-white/70 dark:bg-transparent p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg. utterance</p>
                <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-100">
                  {avgMessageLength} chars
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {(messages.length || 0).toLocaleString()} messages sampled
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-violet-300/60 bg-violet-50 dark:bg-violet-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-100">
                <Mic2 className="h-4 w-4" />
                Moderator Lens
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Curate only orchestrator interventions as an executive feed.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {orchestratorHighlights.length > 0 ? (
                orchestratorHighlights.map((message) => (
                  <div key={message.message_id} className="rounded-2xl border border-violet-200/70 dark:border-violet-800/60 bg-white/80 dark:bg-transparent p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Layers className="h-3 w-3" />
                      Round {message.round_number}
                    </div>
                    <p className="mt-1 text-sm text-foreground leading-relaxed">
                      {truncateText(message.content, 140)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Moderator snippets appear here as soon as interventions happen.
                </p>
              )}
        </CardContent>
      </Card>

          <Card className="rounded-3xl border-2 border-sky-300/60 bg-sky-50 dark:bg-sky-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sky-700 dark:text-sky-100">
                <Radar className="h-4 w-4" />
                Debate Radar
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare thematic clusters by how loud they currently are.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {clusterBreakdown.length > 0 ? (
                clusterBreakdown.slice(0, 4).map((cluster) => (
                  <div
                    key={cluster.clusterId}
                    className="rounded-2xl border border-sky-200/70 dark:border-sky-800/60 bg-white/70 dark:bg-transparent p-3"
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      <span>Cluster {cluster.clusterId}</span>
                      <span>{cluster.messages} exchanges</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {truncateText(cluster.label, 120)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {cluster.agents.slice(0, 3).join(", ")}
                      {cluster.agents.length > 3 ? "…" : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Populate automatically when clusters start debating.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-orange-300/60 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-100">
                <Zap className="h-4 w-4" />
                Tempo Track
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Show message velocity over the last few rounds.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {velocityTrend.length > 0 ? (
                velocityTrend.map((entry) => (
                  <div key={entry.round}>
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                      <span>Round {entry.round}</span>
                      <span>{entry.messages} msgs</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-orange-200/60 dark:bg-orange-900/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, (entry.messages / expectedRoundVolume) * 100)}%`,
                        }}
                        className="h-2 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-600"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {entry.participants} active voices
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  The sparkline wakes up once round two begins.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-slate-300/60 bg-slate-50 dark:bg-slate-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-100">
                <Layers className="h-4 w-4" />
                Message Mix
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Balance different message types to show structure.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {messageTypeStats.length > 0 ? (
                messageTypeStats.slice(0, 4).map((stat) => (
                  <div key={stat.type} className="flex items-center justify-between rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-transparent px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold capitalize">{stat.type.replace(/_/g, " ")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(stat.count / messages.length * 100).toFixed(0)}% of traffic
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stat.count}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Message composition will display once the debate starts.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-2 border-rose-300/60 bg-rose-50 dark:bg-rose-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-100">
                <Mic2 className="h-4 w-4" />
                Soundstage
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Queue up quotable snippets for live narration.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((message) => (
                  <div key={message.message_id} className="rounded-2xl border border-rose-200/70 dark:border-rose-800/60 bg-white/80 dark:bg-transparent p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {getAgentDisplayName(message.agent_id, message.agent_name)} · Round{" "}
                      {message.round_number}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {truncateText(message.content, 120)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  This rail fills with quotes as soon as messages flow.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
