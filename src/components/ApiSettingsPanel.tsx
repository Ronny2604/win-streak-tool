import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/useAppSettings";

export function ApiSettingsPanel() {
  const { oddsApiKey, oddsApiKeyUpdatedAt, isLoading, saveOddsApiKey, isSaving } = useAppSettings();
  const [keyValue, setKeyValue] = useState("");

  useEffect(() => {
    setKeyValue(oddsApiKey);
  }, [oddsApiKey]);

  const handleSave = async () => {
    const trimmed = keyValue.trim();
    if (!trimmed) {
      toast.error("Informe uma chave válida");
      return;
    }

    try {
      await saveOddsApiKey(trimmed);
      toast.success("Chave da API atualizada com sucesso");
    } catch {
      toast.error("Não foi possível salvar a chave");
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Configuração de API</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Atualize a chave do The Odds API sem alterar o código.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="odds-api-key">Chave do The Odds API</Label>
          <Input
            id="odds-api-key"
            type="text"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder="Cole a chave aqui"
          />
        </div>

        {oddsApiKeyUpdatedAt && (
          <p className="text-xs text-muted-foreground">
            Última atualização: {new Date(oddsApiKeyUpdatedAt).toLocaleString("pt-BR")}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar chave
        </button>
      </div>
    </div>
  );
}
