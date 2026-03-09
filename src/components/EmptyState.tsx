import { SearchX, WifiOff, Calendar } from "lucide-react";

interface EmptyStateProps {
  type?: "no-results" | "no-games" | "error";
  searchTerm?: string;
}

const configs = {
  "no-results": {
    icon: SearchX,
    title: "Nenhum resultado encontrado",
    description: "Tente buscar com outros termos ou remova os filtros",
  },
  "no-games": {
    icon: Calendar,
    title: "Sem jogos no momento",
    description: "Não há jogos programados para agora. Volte mais tarde!",
  },
  error: {
    icon: WifiOff,
    title: "Erro ao carregar",
    description: "Verifique sua conexão e tente novamente",
  },
};

export function EmptyState({ type = "no-games", searchTerm }: EmptyStateProps) {
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="rounded-2xl bg-card border border-border p-5">
        <Icon className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">{config.title}</p>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          {searchTerm ? `Nenhum resultado para "${searchTerm}"` : config.description}
        </p>
      </div>
    </div>
  );
}
