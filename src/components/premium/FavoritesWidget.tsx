import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NormalizedFixture } from "@/lib/odds-api";
import { Star, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface Favorite {
  id: string;
  favorite_type: string;
  reference_id: string;
  reference_name: string;
  reference_logo?: string;
}

interface FavoritesWidgetProps {
  fixtures: NormalizedFixture[];
  onSelectFixture?: (f: NormalizedFixture) => void;
}

export function FavoritesWidget({ fixtures, onSelectFixture }: FavoritesWidgetProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    const { data, error } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", user!.id);

    if (!error) setFavorites(data || []);
    setLoading(false);
  };

  const addFavorite = async (type: "team" | "league", id: string, name: string, logo?: string) => {
    if (!user) return;

    const exists = favorites.find(f => f.favorite_type === type && f.reference_id === id);
    if (exists) {
      toast.info("Já está nos favoritos");
      return;
    }

    const { error } = await supabase.from("user_favorites").insert({
      user_id: user.id,
      favorite_type: type,
      reference_id: id,
      reference_name: name,
      reference_logo: logo
    });

    if (!error) {
      toast.success(`${name} adicionado aos favoritos`);
      fetchFavorites();
    }
  };

  const removeFavorite = async (id: string) => {
    const { error } = await supabase.from("user_favorites").delete().eq("id", id);
    if (!error) {
      toast.success("Removido dos favoritos");
      fetchFavorites();
    }
  };

  // Get fixtures for favorite teams
  const favoriteTeamNames = favorites.filter(f => f.favorite_type === "team").map(f => f.reference_name.toLowerCase());
  const relevantFixtures = fixtures.filter(f =>
    favoriteTeamNames.includes(f.teams.home.name.toLowerCase()) ||
    favoriteTeamNames.includes(f.teams.away.name.toLowerCase())
  );

  // Get unique teams and leagues for quick add
  const allTeams = fixtures.reduce((acc: { id: string; name: string; logo?: string }[], f) => {
    if (!acc.find(t => t.name === f.teams.home.name)) {
      acc.push({ id: f.teams.home.name, name: f.teams.home.name, logo: f.teams.home.logo });
    }
    if (!acc.find(t => t.name === f.teams.away.name)) {
      acc.push({ id: f.teams.away.name, name: f.teams.away.name, logo: f.teams.away.logo });
    }
    return acc;
  }, []).slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-badge-star fill-badge-star" />
        <h3 className="text-sm font-bold text-foreground">Meus Favoritos</h3>
      </div>

      {/* Current Favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="flex items-center gap-2 rounded-full bg-badge-star/10 border border-badge-star/30 pl-1 pr-2 py-1"
            >
              {fav.reference_logo && (
                <img src={fav.reference_logo} alt="" className="w-5 h-5 object-contain rounded-full" />
              )}
              <span className="text-xs font-semibold text-badge-star">{fav.reference_name}</span>
              <button
                onClick={() => removeFavorite(fav.id)}
                className="p-0.5 rounded-full hover:bg-badge-star/20 transition-colors"
              >
                <X className="h-3 w-3 text-badge-star" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Relevant Fixtures */}
      {relevantFixtures.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Jogos dos seus times favoritos</h4>
          {relevantFixtures.slice(0, 5).map((fixture) => (
            <div
              key={fixture.id}
              onClick={() => onSelectFixture?.(fixture)}
              className="flex items-center gap-3 rounded-xl bg-card border border-badge-star/20 p-3 cursor-pointer hover:border-badge-star/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {fixture.teams.home.logo && (
                  <img src={fixture.teams.home.logo} alt="" className="w-5 h-5 object-contain" />
                )}
                <span className="text-xs font-semibold text-foreground truncate">{fixture.teams.home.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">vs</span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="text-xs font-semibold text-foreground truncate">{fixture.teams.away.name}</span>
                {fixture.teams.away.logo && (
                  <img src={fixture.teams.away.logo} alt="" className="w-5 h-5 object-contain" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground">Adicionar aos favoritos</h4>
        <div className="grid grid-cols-2 gap-2">
          {allTeams
            .filter(t => !favorites.find(f => f.reference_name === t.name))
            .slice(0, 6)
            .map((team) => (
              <button
                key={team.id}
                onClick={() => addFavorite("team", team.id, team.name, team.logo)}
                className="flex items-center gap-2 rounded-lg bg-card border border-border p-2 hover:border-neon/50 transition-colors"
              >
                {team.logo && <img src={team.logo} alt="" className="w-4 h-4 object-contain" />}
                <span className="text-xs text-foreground truncate flex-1">{team.name}</span>
                <Plus className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
        </div>
      </div>

      {favorites.length === 0 && (
        <div className="rounded-xl bg-card border border-border p-6 text-center">
          <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum favorito ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione times para acompanhar mais facilmente</p>
        </div>
      )}
    </div>
  );
}
