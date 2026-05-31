import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bookmark, Trash2, RotateCcw, Search, Lock } from "lucide-react";
import { useUserStore } from "@/lib/user-store";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BookmarkItem {
  id: number;
  sessionId: string;
  slug: string;
  apiName: string;
  queryVal: string;
  label: string | null;
  createdAt: string;
}

export default function Bookmarks() {
  const { signedInUser } = useUserStore();
  const sessionId = signedInUser?.sessionId || localStorage.getItem("craka_session_id") || "";
  const { toast } = useToast();

  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchBookmarks = async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/bookmarks?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookmarks(); }, [sessionId]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/bookmarks/${id}?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
      setItems(prev => prev.filter(b => b.id !== id));
      toast({ title: "Deleted", description: "Bookmark remove ho gaya." });
    } catch {
      toast({ title: "Error", description: "Delete nahi hua.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRerun = (item: BookmarkItem) => {
    window.location.href = `/?slug=${encodeURIComponent(item.slug)}&q=${encodeURIComponent(item.queryVal)}`;
  };

  const filtered = items.filter(b =>
    b.apiName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.queryVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.label || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!sessionId) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
          <Lock className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Please sign in to view your bookmarks.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
              <Bookmark className="w-7 h-7 sm:w-8 sm:h-8" />
              Bookmarks
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">Aapke saved lookup results.</p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/30 border-border text-sm"
            />
          </div>
        </header>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-card border border-border rounded-md animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-md">
            <Bookmark className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              {searchTerm ? "Koi match nahi mila." : "Abhi tak koi bookmark nahi hai. Terminal pe search karo aur star icon se save karo!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-md border border-border bg-card hover:border-primary/30 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-primary text-sm">{item.apiName}</span>
                    <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/70">
                      {item.slug}
                    </Badge>
                    {item.label && (
                      <Badge variant="outline" className="text-[10px] border-yellow-400/30 text-yellow-400/80">
                        {item.label}
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-sm text-foreground mt-1">{item.queryVal}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(item.createdAt), "dd MMM yyyy, HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => handleRerun(item)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Re-run
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">
              {filtered.length} bookmark{filtered.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
