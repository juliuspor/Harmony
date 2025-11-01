/**
 * API service for backend communication.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface CreateDebateRequest {
  max_rounds?: number;
  max_messages?: number;
}

export interface CreateDebateResponse {
  debate_id: string;
  status: string;
  agents: Array<{
    agent_id: string;
    agent_name: string;
    cluster_id: number;
    persona_summary: string;
  }>;
  created_at: string;
}

export interface DebateResponse {
  debate_id: string;
  project_id: string;
  status: string;
  consensus_score?: number;
  error_message?: string;
  agents: Array<{
    agent_id: string;
    agent_name: string;
    cluster_id: number;
    persona_summary: string;
  }>;
  messages: Array<{
    message_id: string;
    content: string;
    agent_id: string;
    agent_name: string;
    round_number: number;
    message_type: string;
    timestamp: string;
  }>;
  interventions: Array<{
    intervention_id: string;
    intervention_type: string;
    reason: string;
    message: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ConsensusResponse {
  consensus_score: number;
  semantic_alignment: number;
  agreement_ratio: number;
  convergence_score: number;
  resolution_rate: number;
  sentiment: string;
  key_alignments: string[];
  key_insights: string[];
  pro_arguments: string[];
  con_arguments: string[];
  pairwise_alignment?: {
    agent_ids: string[];
    agent_names: string[];
    matrix: number[][];
  };
}

/**
 * Estimate debate duration based on parameters.
 * 
 * @param maxRounds - Maximum debate rounds
 * @param maxMessages - Maximum messages
 * @returns Estimated duration in seconds
 */
export function estimateDebateDuration(maxRounds?: number, maxMessages?: number): number {
  const rounds = maxRounds || 3;
  const messages = maxMessages || 15;
  const secondsPerMessage = 3.5;
  
  // Estimate: ~5 agents, so ~5 messages per round
  const estimatedMessages = Math.min(messages, rounds * 5);
  const estimatedSeconds = estimatedMessages * secondsPerMessage;
  
  // Add buffer for setup and analysis
  return Math.ceil(estimatedSeconds + 30);
}

/**
 * Create a debate from project clusters.
 * 
 * @param projectId - Project identifier
 * @param maxRounds - Maximum debate rounds
 * @param maxMessages - Maximum messages
 * @returns Debate creation response
 */
export async function createDebate(
  projectId: string,
  maxRounds?: number,
  maxMessages?: number
): Promise<CreateDebateResponse> {
  const requestBody: CreateDebateRequest = {};
  if (maxRounds !== undefined) requestBody.max_rounds = maxRounds;
  if (maxMessages !== undefined) requestBody.max_messages = maxMessages;

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/debates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create debate: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get debate status and details.
 * 
 * @param debateId - Debate identifier
 * @returns Debate response data
 */
export async function getDebateStatus(debateId: string): Promise<DebateResponse> {
  const response = await fetch(`${API_BASE_URL}/debates/${debateId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get debate status: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get consensus analysis for a completed debate.
 * 
 * @param debateId - Debate identifier
 * @returns Consensus analysis results
 */
export async function getConsensusResults(debateId: string): Promise<ConsensusResponse> {
  const response = await fetch(`${API_BASE_URL}/debates/${debateId}/consensus`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get consensus results: ${response.status} ${errorText}`);
  }

  return response.json();
}

