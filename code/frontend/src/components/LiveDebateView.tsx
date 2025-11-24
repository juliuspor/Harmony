import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
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

const QUEUE_JOIN_INTERVAL_MS = 160;

export function LiveDebateView({ debateId, onComplete, viewOnly = false }: LiveDebateViewProps) {
  const [debate, setDebate] = useState<DebateResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);
  const [expandedRounds, setExpandedRounds] = useState<number[]>([]);
  const [joinedAgentIds, setJoinedAgentIds] = useState<string[]>([]);
  const prevDebateIdRef = useRef<string | null>(null);

  const agentAvatars = useMemo(() => {
    if (!debate?.agents) return [];
    return [...debate.agents].sort((a, b) => a.agent_id.localeCompare(b.agent_id));
  }, [debate?.agents]);
  const totalAgents = agentAvatars.length;
  const shouldSkipQueueAnimation =
    viewOnly || debate?.status === "completed" || debate?.status === "cancelled";
  const visibleAgents = useMemo(() => {
    if (shouldSkipQueueAnimation) {
      return agentAvatars;
    }
    return agentAvatars.filter((agent) => joinedAgentIds.includes(agent.agent_id));
  }, [agentAvatars, joinedAgentIds, shouldSkipQueueAnimation]);
  const pendingCount = Math.max(totalAgents - visibleAgents.length, 0);
  const isQueueReady = totalAgents === 0 || pendingCount === 0;

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

  useEffect(() => {
    if (prevDebateIdRef.current !== debateId) {
      setJoinedAgentIds([]);
      prevDebateIdRef.current = debateId;
    }
  }, [debateId]);

  useEffect(() => {
    if (shouldSkipQueueAnimation) {
      setJoinedAgentIds(agentAvatars.map((agent) => agent.agent_id));
      return;
    }
    if (totalAgents === 0) {
      setJoinedAgentIds([]);
      return;
    }

    const unseenAgents = agentAvatars
      .map((agent) => agent.agent_id)
      .filter((agentId) => !joinedAgentIds.includes(agentId));

    if (unseenAgents.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      setJoinedAgentIds((prev) => [...prev, unseenAgents[0]]);
    }, QUEUE_JOIN_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [agentAvatars, joinedAgentIds, shouldSkipQueueAnimation, totalAgents]);

  const expectedRoundVolume = Math.max(1, (debate?.agents?.length || 1) * 2);

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

  const discussionFlowSection = (
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
        {totalAgents > 0 && (
          <div className="px-6 py-4 border-b bg-muted/30 space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>{isQueueReady ? "All participants ready" : "Participants are queuing up"}</span>
              {!isQueueReady && (
                <span>
                  {visibleAgents.length}/{totalAgents} ready
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {visibleAgents.map((agent, index) => {
                const colorClasses = getAgentColor(agent.agent_id);
                const AgentIcon = getAgentIcon(agent.agent_id);
                const isOrchestrator = agent.agent_id === "orchestrator";
                return (
                  <motion.div
                    key={agent.agent_id}
                    initial={shouldSkipQueueAnimation ? false : { opacity: 0, y: 6 }}
                    animate={shouldSkipQueueAnimation ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                    transition={{ delay: shouldSkipQueueAnimation ? 0 : index * 0.05 }}
                    className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-3 py-1.5"
                  >
                    <Avatar className={`h-9 w-9 border ${colorClasses}`}>
                      {isOrchestrator && (
                        <AvatarImage src="/images/moderator-avatar.png" alt="Moderator" />
                      )}
                      <AvatarFallback className={colorClasses}>
                        <AgentIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {getAgentDisplayName(agent.agent_id, agent.agent_name)}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {isOrchestrator ? "Moderator" : "Debater"}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              {!isQueueReady && pendingCount > 0 && (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                  +{pendingCount} on deck
                </div>
              )}
            </div>
          </div>
        )}
        {isQueueReady ? (
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
                      <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} className="text-muted-foreground">
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
                                      <AvatarImage src="/images/moderator-avatar.png" alt="Moderator" />
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
            ) : null}
                </div>
              </ScrollArea>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Conversation goes live once everyone checks in.
          </div>
              )}
            </CardContent>
          </Card>
  );

                    return (
    <div className="space-y-6">
      {discussionFlowSection}
    </div>
  );
}
