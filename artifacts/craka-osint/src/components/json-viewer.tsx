import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: Record<string, any>;
  className?: string;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  return (
    <div className={cn("font-mono text-sm space-y-1 p-4 bg-muted/50 rounded-md border border-border/50", className)}>
      <div className="text-muted-foreground mb-2">{"{"}</div>
      {Object.entries(data).map(([key, value]) => (
        <JsonNode key={key} nodeKey={key} value={value} depth={1} />
      ))}
      <div className="text-muted-foreground mt-2">{"}"}</div>
    </div>
  );
}

function JsonNode({ nodeKey, value, depth }: { nodeKey: string; value: any; depth: number }) {
  const [copied, setCopied] = useState(false);
  
  const indent = Array(depth * 4).fill("\u00A0").join("");
  
  const handleCopy = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = () => {
    if (value === null) return <span className="text-muted-foreground">null</span>;
    if (typeof value === "boolean") return <span className="text-secondary">{value.toString()}</span>;
    if (typeof value === "number") return <span className="text-warning">{value}</span>;
    if (typeof value === "string") {
      return (
        <span 
          className="text-success cursor-pointer hover:underline decoration-success/50 underline-offset-2"
          onClick={(e) => handleCopy(e, value)}
          title="Click to copy"
        >
          "{value}"
          {copied && <Check className="inline-block w-3 h-3 ml-2 text-success" />}
        </span>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground">[]</span>;
      return (
        <span>
          <span className="text-muted-foreground">[</span>
          <div className="flex flex-col">
            {value.map((item, i) => (
              <div key={i} className="flex">
                <span className="select-none">{Array((depth + 1) * 4).fill("\u00A0").join("")}</span>
                <span className="flex-1">
                  {typeof item === 'object' && item !== null ? (
                    <div className="inline-block">
                      <span className="text-muted-foreground">{"{"}</span>
                      <div className="flex flex-col">
                        {Object.entries(item).map(([k, v]) => (
                          <JsonNode key={k} nodeKey={k} value={v} depth={depth + 2} />
                        ))}
                      </div>
                      <span>{Array((depth + 1) * 4).fill("\u00A0").join("")}<span className="text-muted-foreground">{"}"}</span>{i < value.length - 1 ? "," : ""}</span>
                    </div>
                  ) : (
                    <span className="text-success hover:underline cursor-pointer" onClick={(e) => handleCopy(e, String(item))}>"{item}"</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <span>{indent}<span className="text-muted-foreground">]</span></span>
        </span>
      );
    }
    
    if (typeof value === "object") {
      if (Object.keys(value).length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
      return (
        <span>
          <span className="text-muted-foreground">{"{"}</span>
          <div className="flex flex-col">
            {Object.entries(value).map(([k, v]) => (
              <JsonNode key={k} nodeKey={k} value={v} depth={depth + 1} />
            ))}
          </div>
          <span>{indent}<span className="text-muted-foreground">{"}"}</span></span>
        </span>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  return (
    <div className="flex group">
      <span className="select-none text-muted-foreground">{indent}</span>
      <span className="text-primary">"{nodeKey}"</span>
      <span className="text-muted-foreground mx-1">:</span>
      <span className="flex-1">{renderValue()}{depth > 1 ? "," : ""}</span>
    </div>
  );
}
