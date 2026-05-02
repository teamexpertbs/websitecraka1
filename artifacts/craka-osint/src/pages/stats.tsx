import { Layout } from "@/components/layout";
import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Activity, Database, Zap, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

export default function Stats() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading || !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const successRate = stats.totalLookups > 0 
    ? Math.round((stats.successfulLookups / stats.totalLookups) * 100) 
    : 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3">
            <BarChart2 className="w-7 h-7 sm:w-8 sm:h-8" />
            System Telemetry
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Real-time performance and usage metrics.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Lookups" 
            value={stats.totalLookups} 
            icon={Search} 
            color="text-primary" 
          />
          <StatCard 
            title="Success Rate" 
            value={`${successRate}%`} 
            icon={Activity} 
            color="text-success" 
          />
          <StatCard 
            title="Active APIs" 
            value={stats.activeApis} 
            icon={Zap} 
            color="text-secondary" 
          />
          <StatCard 
            title="Cache Hits" 
            value={stats.cachedResults} 
            icon={Database} 
            color="text-warning" 
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-medium">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryBreakdown}>
                  <XAxis 
                    dataKey="category" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-medium">Top Vectors</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {stats.topApis.map((api, i) => (
                  <div key={api.apiName} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground font-mono text-sm w-4">{i + 1}.</div>
                      <div className="font-medium text-primary">{api.apiName}</div>
                    </div>
                    <div className="font-mono text-sm">{api.count} ops</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className={`text-3xl font-bold ${color} text-glow`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-full bg-muted/40 border border-border ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}
