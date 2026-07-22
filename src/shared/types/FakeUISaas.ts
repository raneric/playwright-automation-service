export type TicketSubmissionResult = {
  ticketCreated: boolean;
  ticketId?: number;
  error?: string | null;
};

type Claim = {
  id: number;
  created_at: string;
  updated_at: string;
};

export type TicketCreationOutput = {
  success: boolean;
  data: Claim;
};
