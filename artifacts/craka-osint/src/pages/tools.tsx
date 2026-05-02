import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListApis } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Search } from "lucide-react";

export default function Tools() {
  const { data: apis = [], isLoading } = useListApis();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredApis = apis.filter(api => 
    api.isActive && (
      api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const categories = Array.from(new Set(apis.map(a => a.category))) as string[];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <Wrench className="w-8 h-8" />
              Tool Directory
            </h1>
            <p className="text-muted-foreground mt-2">Index of all available intelligence vectors.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search tools..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-muted/30 border-border"
            />
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-32 bg-card border border-border rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map(category => {
              const categoryApis = filteredApis.filter(a => a.category === category);
              if (categoryApis.length === 0) return null;
              
              return (
                <div key={category}>
                  <h2 className="text-xl font-bold text-foreground mb-4 pb-2 border-b border-border/50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryApis.map(api => (
                      <div key={api.id} className="p-5 rounded-md border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-primary text-lg group-hover:text-glow transition-all">{api.name}</h3>
                          <Badge variant="outline" className="bg-muted/50 border-border text-xs">
                            {api.credits}c
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mt-4 text-sm font-mono">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">Cmd:</span>
                            <span className="text-foreground">{api.command}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">Slug:</span>
                            <span className="text-secondary">{api.slug}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">Eg:</span>
                            <span className="text-muted-foreground truncate">{api.example}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {filteredApis.length === 0 && (
              <div className="text-center p-12 bg-card border border-border rounded-md text-muted-foreground">
                No tools found matching your search.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
