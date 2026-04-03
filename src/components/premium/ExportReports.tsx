import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Table, Calendar, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

export function ExportReports() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportCSV = async (type: "tickets" | "history" | "goals") => {
    if (!user) return toast.error("Faça login para exportar");
    setExporting(type);

    try {
      let data: any[] = [];
      let headers: string[] = [];
      let filename = "";

      if (type === "tickets") {
        const { data: tickets } = await supabase.from("saved_tickets").select("*").order("created_at", { ascending: false });
        data = tickets || [];
        headers = ["Nome", "Tipo", "Odd Total", "Confiança", "Resultado", "Stake Sugerido", "Retorno Potencial", "Data"];
        filename = `bilhetes_${format(new Date(), "yyyy-MM-dd")}.csv`;
        data = data.map(t => [t.name, t.type, t.total_odd, `${t.confidence}%`, t.result || "pending", t.suggested_stake || "-", t.potential_return || "-", format(new Date(t.created_at), "dd/MM/yyyy HH:mm")]);
      } else if (type === "history") {
        const { data: bets } = await supabase.from("betting_history").select("*").eq("user_id", user.id).order("bet_date", { ascending: false });
        data = bets || [];
        headers = ["Jogo", "Tipo", "Odd", "Stake", "Resultado", "Lucro", "Data"];
        filename = `historico_apostas_${format(new Date(), "yyyy-MM-dd")}.csv`;
        data = data.map(b => [b.fixture_info, b.bet_type, b.odd, `R$ ${b.stake}`, b.result || "pending", b.profit ? `R$ ${b.profit}` : "-", format(new Date(b.bet_date), "dd/MM/yyyy")]);
      } else {
        const { data: goals } = await supabase.from("bankroll_goals").select("*").eq("user_id", user.id);
        data = goals || [];
        headers = ["Tipo", "Meta", "Atual", "Início", "Fim", "Alcançado"];
        filename = `metas_${format(new Date(), "yyyy-MM-dd")}.csv`;
        data = data.map(g => [g.goal_type, `R$ ${g.target_amount}`, `R$ ${g.current_amount}`, format(new Date(g.start_date), "dd/MM/yyyy"), format(new Date(g.end_date), "dd/MM/yyyy"), g.achieved ? "Sim" : "Não"]);
      }

      const csvContent = [headers.join(","), ...data.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${filename} exportado com sucesso!`);
    } catch (err) {
      toast.error("Erro ao exportar dados");
    } finally {
      setExporting(null);
    }
  };

  const reports = [
    { id: "tickets" as const, icon: FileText, title: "Bilhetes Salvos", desc: "Exporte todos os bilhetes com odds, confiança e resultados", color: "text-primary" },
    { id: "history" as const, icon: Table, title: "Histórico de Apostas", desc: "Relatório completo com lucros, stakes e performance", color: "text-badge-star" },
    { id: "goals" as const, icon: Calendar, title: "Metas de Banca", desc: "Suas metas financeiras com progresso atual", color: "text-neon" },
  ];

  return (
    <div className="space-y-3">
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Relatórios
          </CardTitle>
          <p className="text-xs text-muted-foreground">Baixe seus dados em CSV para análise externa</p>
        </CardHeader>
      </Card>

      {reports.map(r => (
        <Card key={r.id} className="border-border bg-card hover:border-primary/30 transition-all">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <r.icon className={`h-5 w-5 ${r.color}`} />
                </div>
                <div>
                  <p className="font-bold text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => exportCSV(r.id)}
                disabled={exporting === r.id}
              >
                {exporting === r.id ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
