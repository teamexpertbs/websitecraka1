import { useState } from "react";
import { useListApis, usePerformLookup } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Terminal, Search, ShieldAlert, Cpu, CheckCircle2, AlertCircle,
  Copy, Check, Download, Share2, Languages, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["All", "Phone", "Identity", "Vehicle", "Banking", "Location", "Network", "Email", "Social", "Gaming"];

function flattenData(data: Record<string, unknown>, prefix = ""): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(data)) {
    const label = prefix ? `${prefix} > ${k}` : k;
    if (v === null || v === undefined) {
      rows.push({ key: label, value: "—" });
    } else if (typeof v === "object" && !Array.isArray(v)) {
      rows.push(...flattenData(v as Record<string, unknown>, label));
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        rows.push({ key: label, value: "—" });
      } else {
        v.forEach((item, i) => {
          if (typeof item === "object" && item !== null) {
            rows.push(...flattenData(item as Record<string, unknown>, `${label}[${i + 1}]`));
          } else {
            rows.push({ key: `${label}[${i + 1}]`, value: String(item) });
          }
        });
      }
    } else {
      rows.push({ key: label, value: String(v) });
    }
  }
  return rows;
}

function toTextReport(apiName: string, query: string, rows: Array<{ key: string; value: string }>): string {
  const lines = [
    `=== CraKa OSINT Report ===`,
    `Tool    : ${apiName}`,
    `Query   : ${query}`,
    `Time    : ${new Date().toLocaleString("en-IN")}`,
    ``,
    `--- Results ---`,
    ...rows.filter(r => r.key !== "Developer").map(r => `${r.key.padEnd(24)}: ${r.value}`),
    ``,
    `Powered by @DM_CRAKA_OWNER_BOT`,
  ];
  return lines.join("\n");
}

const HINDI_MAP: Record<string, string> = {
  name: "नाम", phone: "फोन", number: "नंबर", mobile: "मोबाइल",
  address: "पता", city: "शहर", state: "राज्य", country: "देश",
  pincode: "पिनकोड", district: "जिला", taluka: "तालुका",
  dob: "जन्म तिथि", gender: "लिंग", father: "पिता",
  email: "ईमेल", operator: "ऑपरेटर", circle: "सर्कल",
  registered: "पंजीकृत", owner: "मालिक", vehicle: "वाहन",
  rc: "आरसी", chassis: "चेसिस", engine: "इंजन",
  fuel: "ईंधन", color: "रंग", model: "मॉडल",
  bank: "बैंक", branch: "शाखा", ifsc: "आईएफएससी",
  upi: "यूपीआई", pan: "पैन", aadhaar: "आधार",
  status: "स्थिति", valid: "वैध", invalid: "अमान्य",
  active: "सक्रिय", inactive: "निष्क्रिय",
  true: "हाँ", false: "नहीं",
  success: "सफल", error: "त्रुटि",
  latitude: "अक्षांश", longitude: "देशांतर",
  isp: "इंटरनेट प्रदाता", region: "क्षेत्र",
  timezone: "समय क्षेत्र", currency: "मुद्रा",
  type: "प्रकार", carrier: "कैरियर",
};

function hindiLabel(key: string): string {
  const lower = key.toLowerCase().replace(/[_\-]/g, " ");
  for (const [en, hi] of Object.entries(HINDI_MAP)) {
    if (lower.includes(en)) return hi;
  }
  return key;
}

function hindiValue(value: string): string {
  const lower = value.toLowerCase();
  if (lower === "true" || lower === "yes") return "हाँ";
  if (lower === "false" || lower === "no") return "नहीं";
  if (lower === "male") return "पुरुष";
  if (lower === "female") return "महिला";
  if (lower === "active") return "सक्रिय";
  if (lower === "inactive") return "निष्क्रिय";
  if (lower === "valid") return "वैध";
  if (lower === "invalid") return "अमान्य";
  return value;
}

interface ResultRow { key: string; value: string }

function ResultViewer({
  rows, apiName, query, cached
}: {
  rows: ResultRow[];
  apiName: string;
  query: string;
  cached: boolean;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showHindi, setShowHindi] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const { toast } = useToast();

  const display = rows.filter(r => r.key !== "Developer" && r.value !== "—");

  const rawTextRow = display.length === 1 && display[0].key === "raw" ? display[0] : null;
  const rawText = rawTextRow ? rawTextRow.value : null;

  const report = rawText ? rawText : toTextReport(apiName, query, display);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(report);
    setCopiedAll(true);
    toast({ title: "Copied!", description: "Full report copied to clipboard." });
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `craka_osint_${apiName.replace(/\s+/g, "_")}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "Report saved as text file." });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(report);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `CraKa OSINT - ${apiName}`, text: report });
      } catch {}
    } else {
      navigator.clipboard.writeText(report);
      toast({ title: "Copied!", description: "Report copied — paste to share." });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 px-3 pt-3">
        <button
          onClick={() => setShowHindi(h => !h)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
            showHindi
              ? "bg-purple-500/20 border-purple-500/60 text-purple-300"
              : "bg-card border-border text-muted-foreground hover:border-purple-500/40 hover:text-purple-300"
          }`}
        >
          <Languages className="w-3.5 h-3.5" />
          {showHindi ? "English" : "हिंदी"}
        </button>
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
        >
          {copiedAll ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          Copy All
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border bg-card border-border text-muted-foreground hover:border-green-500/60 hover:text-green-400 transition-all"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
        {cached && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-yellow-400/70 border border-yellow-400/20 bg-yellow-400/5 rounded px-2 py-1">
            CACHED
          </span>
        )}
      </div>

      <div className="px-3 pb-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
        {display.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4 text-center">No data returned.</div>
        ) : rawText ? (
          <div className="rounded-md bg-black/40 border border-border/30 p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">{rawText}</pre>
          </div>
        ) : display.map((row) => {
          const label = showHindi ? hindiLabel(row.key) : row.key.replace(/_/g, " ");
          const val = showHindi ? hindiValue(row.value) : row.value;
          const isCopied = copiedKey === row.key;
          return (
            <div
              key={row.key}
              className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 px-3 rounded-md bg-black/30 border border-border/30 hover:border-primary/20 transition-all"
            >
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:w-36 sm:flex-shrink-0">
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest leading-5 truncate">
                  {label}
                </span>
                <button
                  onClick={() => handleCopy(row.key, row.value)}
                  className="sm:hidden flex-shrink-0 text-muted-foreground active:text-primary"
                  title="Copy"
                >
                  {isCopied
                    ? <Check className="w-3.5 h-3.5 text-green-400" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
              <div className="flex flex-1 min-w-0 items-center justify-between gap-2">
                <span className="text-sm text-foreground break-all leading-relaxed">{val}</span>
                <button
                  onClick={() => handleCopy(row.key, row.value)}
                  className="hidden sm:block flex-shrink-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy"
                >
                  {isCopied
                    ? <Check className="w-3.5 h-3.5 text-green-400" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          );
        })}
        <div className="pt-2 text-[10px] text-muted-foreground/50 text-center">
          Powered by @DM_CRAKA_OWNER_BOT
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: apis = [], isLoading: isLoadingApis } = useListApis();
  const performLookup = usePerformLookup();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedApiSlug, setSelectedApiSlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [lastQuery, setLastQuery] = useState("");

  const filteredApis = apis.filter(api =>
    api.isActive && (activeCategory === "All" || api.category === activeCategory)
  );

  const selectedApi = apis.find(a => a.slug === selectedApiSlug);

  const handleLookup = () => {
    if (!selectedApiSlug || !query) return;

    if (selectedApi?.pattern) {
      const regex = new RegExp(selectedApi.pattern);
      if (!regex.test(query)) {
        toast({
          title: "Invalid Input",
          description: `Format galat hai. Example: ${selectedApi.example}`,
          variant: "destructive"
        });
        return;
      }
    }

    setResult(null);
    setLastQuery(query);
    performLookup.mutate({ data: { slug: selectedApiSlug, query } }, {
      onSuccess: (data) => {
        setResult(data);
        if (!data.success) {
          toast({
            title: "Lookup Failed",
            description: data.error || "No data found",
            variant: "destructive"
          });
        }
      },
      onError: (error: any) => {
        toast({
          title: "Lookup Failed",
          description: error?.data?.error || "An unknown error occurred",
          variant: "destructive"
        });
      }
    });
  };

  const rows = result ? flattenData(result.data || { error: result.error || "Unknown error" }) : [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Terminal className="w-8 h-8" />
            Command Center
          </h1>
          <p className="text-muted-foreground mt-2">Initialize target acquisition protocol.</p>
        </header>

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors px-3 py-1"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 order-2 md:order-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {isLoadingApis ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 bg-card border border-border rounded animate-pulse" />
                ))}
              </div>
            ) : filteredApis.length === 0 ? (
              <div className="text-center p-8 bg-card border border-border rounded-md text-muted-foreground">
                <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-50" />
                No vectors in this category.
              </div>
            ) : (
              filteredApis.map(api => (
                <div
                  key={api.id}
                  onClick={() => { setSelectedApiSlug(api.slug); setResult(null); setQuery(""); }}
                  className={`p-3 rounded-md border cursor-pointer transition-all duration-200 ${
                    selectedApiSlug === api.slug
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-bold text-sm text-foreground">{api.name}</div>
                  <div className="text-xs text-primary/70 mt-1">{api.command} &lt;query&gt;</div>
                  <div className="flex justify-between items-center mt-2">
                    <Badge variant="outline" className="text-[10px] h-4 py-0 border-primary/30 text-primary/80">
                      {api.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{api.credits}c</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="md:col-span-2 order-1 md:order-2 space-y-6">
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
              <CardHeader className="border-b border-border bg-black/20 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  {selectedApi ? `Target: ${selectedApi.name}` : "Select a target vector"}
                </CardTitle>
                {selectedApi && (
                  <CardDescription className="text-muted-foreground mt-1">
                    Example:{" "}
                    <span
                      className="text-primary cursor-pointer hover:underline"
                      onClick={() => setQuery(selectedApi.example)}
                    >
                      {selectedApi.example}
                    </span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Terminal className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                      disabled={!selectedApi || performLookup.isPending}
                      placeholder={selectedApi ? `Enter ${selectedApi.example}...` : "Awaiting vector selection..."}
                      className="pl-10 bg-black/50 border-border focus-visible:ring-primary font-mono"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                  <Button
                    onClick={handleLookup}
                    disabled={!selectedApi || !query || performLookup.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-32 font-bold tracking-widest"
                  >
                    {performLookup.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        RUN
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        EXECUTE
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {performLookup.isPending && (
              <Card className="border-primary/20 bg-card animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-8 bg-black/40 rounded w-full" style={{ width: `${85 - i * 10}%` }} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result && !performLookup.isPending && (
              <Card className="border-primary/30 shadow-[0_0_15px_rgba(0,217,255,0.05)] bg-card animate-in fade-in slide-in-from-bottom-4 overflow-hidden">
                <CardHeader className="border-b border-border pb-3 px-4 pt-4">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <CardTitle className="text-base">
                      {result.success ? result.apiName : "Lookup Failed"}
                    </CardTitle>
                    {result.success && (
                      <span className="ml-auto text-xs text-muted-foreground font-normal">{lastQuery}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {result.success ? (
                    <ResultViewer
                      rows={rows}
                      apiName={result.apiName}
                      query={lastQuery}
                      cached={result.cached}
                    />
                  ) : (
                    <div className="p-6 text-destructive text-sm">
                      {result.error || "No data returned"}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
