import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BettingTicket } from "@/lib/ticket-generator";

export interface SavedTicket {
  id: string;
  name: string;
  type: string;
  selections: any[];
  total_odd: number;
  confidence: number;
  suggested_stake: string | null;
  potential_return: string | null;
  result: "pending" | "green" | "red";
  notes: string | null;
  created_at: string;
  created_by: string;
}

export function useSavedTickets() {
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["saved-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedTicket[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (ticket: BettingTicket) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("saved_tickets").insert({
        name: ticket.name,
        type: ticket.type,
        selections: ticket.selections as any,
        total_odd: ticket.totalOdd,
        confidence: ticket.confidence,
        suggested_stake: ticket.suggestedStake ?? null,
        potential_return: ticket.potentialReturn ?? null,
        result: "pending",
        created_by: user?.id ?? "anon",
      });
      if (error) {
        console.error("Save ticket error:", error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-tickets"] }),
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({ id, result }: { id: string; result: "pending" | "green" | "red" }) => {
      const { error } = await supabase
        .from("saved_tickets")
        .update({ result })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-tickets"] }),
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string | null }) => {
      const { error } = await supabase
        .from("saved_tickets")
        .update({ notes: notes || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-tickets"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saved_tickets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-tickets"] }),
  });

  const deleteByResultMutation = useMutation({
    mutationFn: async (results: ("pending" | "green" | "red")[]) => {
      const { error, count } = await supabase
        .from("saved_tickets")
        .delete({ count: "exact" })
        .in("result", results);
      if (error) throw error;
      return count ?? 0;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-tickets"] }),
  });

  const stats = {
    total: tickets.length,
    green: tickets.filter((t) => t.result === "green").length,
    red: tickets.filter((t) => t.result === "red").length,
    pending: tickets.filter((t) => t.result === "pending").length,
    winRate: tickets.filter((t) => t.result !== "pending").length > 0
      ? Math.round(
          (tickets.filter((t) => t.result === "green").length /
            tickets.filter((t) => t.result !== "pending").length) *
            100
        )
      : 0,
  };

  return {
    tickets,
    isLoading,
    stats,
    saveTicket: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    updateResult: updateResultMutation.mutateAsync,
    updateNotes: updateNotesMutation.mutateAsync,
    deleteTicket: deleteMutation.mutateAsync,
    deleteByResult: deleteByResultMutation.mutateAsync,
    isDeletingByResult: deleteByResultMutation.isPending,
  };
}
