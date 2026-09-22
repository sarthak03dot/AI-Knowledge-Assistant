import React, { useState } from "react";
import type { SearchResultItem } from "../types/rag";
import { runVectorSearch } from "../services/api";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Slider,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import BoltIcon from "@mui/icons-material/Bolt";
import ArticleIcon from "@mui/icons-material/Article";
import TuneIcon from "@mui/icons-material/Tune";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LayersIcon from "@mui/icons-material/Layers";
import TagIcon from "@mui/icons-material/Tag";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

interface VectorPlaygroundProps {
  topK: number;
  alpha: number;
}

export const VectorPlayground: React.FC<VectorPlaygroundProps> = ({ topK: initialTopK, alpha: initialAlpha }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeAlpha, setActiveAlpha] = useState(initialAlpha);
  const [activeTopK, setActiveTopK] = useState(initialTopK);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setSearched(true);
    try {
      const searchRes = await runVectorSearch(query.trim(), activeTopK, activeAlpha);
      setResults(searchRes);
    } catch (err) {
      console.error(err);
      alert("Vector search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyChunk = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const densePercent = Math.round(activeAlpha * 100);
  const sparsePercent = 100 - densePercent;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", bgcolor: "#070b14" }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: "1px solid rgba(6, 182, 212, 0.15)", bgcolor: "#0b1120", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#f8fafc", letterSpacing: "-0.01em" }}>Knowledge & Search Lab</Typography>
            <Chip icon={<FiberManualRecordIcon sx={{ fontSize: "7px !important", color: "#06b6d4 !important" }} />} label="Hybrid Grounding Inspector" size="small"
              sx={{ bgcolor: "rgba(6, 182, 212, 0.15)", border: "1px solid rgba(6, 182, 212, 0.3)", color: "#22d3ee", fontSize: "0.65rem", height: 22, fontWeight: 700 }} />
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Directly inspect semantic retrieval rankings, test hybrid relevance fusion, and balance semantic similarity vs keyword search.
          </Typography>
        </Box>
        <Chip label={`Top-K: ${activeTopK} • Alpha: ${activeAlpha.toFixed(2)}`} size="small"
          sx={{ bgcolor: "rgba(6, 182, 212, 0.15)", border: "1px solid rgba(6, 182, 212, 0.3)", color: "#22d3ee", fontSize: "0.68rem", fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, md: 4 }, py: 3, minHeight: 0, "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-track": { bgcolor: "transparent" }, "&::-webkit-scrollbar-thumb": { bgcolor: "#1e293b", borderRadius: 2 } }}>
        {/* Control Panel */}
        <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)", mb: 2.5 }}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
            {/* Alpha Slider */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <TuneIcon sx={{ fontSize: 15, color: "#06b6d4" }} />
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>
                    Hybrid Fusion Balance (α = {activeAlpha.toFixed(2)})
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: "0.68rem", fontFamily: '"JetBrains Mono", monospace', color: "#22d3ee", fontWeight: 600 }}>
                  {sparsePercent}% Keyword ⇄ {densePercent}% Semantic
                </Typography>
              </Box>
              <Slider value={activeAlpha} onChange={(_, v) => setActiveAlpha(v as number)} min={0} max={1} step={0.05} sx={{ color: "#06b6d4", mb: 1 }} />
              <Box sx={{ height: 6, borderRadius: 2, overflow: "hidden", display: "flex" }}>
                <Box sx={{ width: `${sparsePercent}%`, bgcolor: "#38bdf8", transition: "width 0.2s ease" }} />
                <Box sx={{ width: `${densePercent}%`, bgcolor: "#06b6d4", transition: "width 0.2s ease" }} />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#38bdf8" }}>Keyword Match</Typography>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#06b6d4" }}>Semantic Match</Typography>
              </Box>
            </Box>

            {/* Top-K chips */}
            <Box>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc", display: "block", mb: 1 }}>Top-K Chunks</Typography>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                {[3, 4, 6, 8, 10].map((k) => (
                  <Box key={k} onClick={() => setActiveTopK(k)}
                    sx={{
                      width: 36, height: 36, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      fontSize: "0.8rem", fontWeight: 700, border: "1px solid", transition: "all 0.15s ease",
                      borderColor: activeTopK === k ? "#06b6d4" : "rgba(255, 255, 255, 0.12)",
                      bgcolor: activeTopK === k ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: activeTopK === k ? "#22d3ee" : "#94a3b8",
                      "&:hover": { borderColor: "#06b6d4", color: "#f8fafc" },
                    }}>
                    {k}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Search Bar */}
        <Box component="form" onSubmit={handleSearch}
          sx={{ display: "flex", gap: 1.5, mb: 3, p: 1.5, borderRadius: 2, bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)", "&:focus-within": { borderColor: "#06b6d4", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }, transition: "all 0.2s ease" }}>
          <TextField fullWidth variant="standard" placeholder="Enter a search query to inspect retrieval rankings & passage matching..." value={query} onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                disableUnderline: true,
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "#22d3ee" }} /></InputAdornment>,
                sx: { fontSize: "0.875rem", color: "#f8fafc", "& input::placeholder": { color: "#64748b" } },
              }
            }} />
          <Button type="submit" variant="contained" disabled={!query.trim() || isLoading}
            startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <BoltIcon sx={{ fontSize: 16 }} />}
            sx={{ flexShrink: 0, background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)", fontWeight: 700, fontSize: "0.8rem", "&:hover": { background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)" } }}>
            Probe Vectors
          </Button>
        </Box>

        {/* Results */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AutoAwesomeIcon sx={{ fontSize: 14, color: "#06b6d4" }} />
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Retrieved Vector Points ({results.length})
              </Typography>
            </Box>
            {results.length > 0 && <Typography sx={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#64748b" }}>Scored using Reciprocal Rank Fusion + Cosine Distance</Typography>}
          </Box>

          {isLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, py: 10 }}>
              <StorageIcon sx={{ fontSize: 40, color: "#06b6d4", animation: "pulse 1.5s ease-in-out infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } } }} />
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#f8fafc" }}>Querying knowledge base...</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>Executing semantic neural search and keyword matching fusion</Typography>
            </Box>
          ) : results.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, py: 10, bgcolor: "#0f172a", borderRadius: 2, border: "1px dashed rgba(255, 255, 255, 0.1)" }}>
              <LayersIcon sx={{ fontSize: 40, color: "#475569" }} />
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#f8fafc" }}>
                {searched ? "No matching passages found" : "Ready for Relevance Inspection"}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", maxWidth: 400 }}>
                {searched ? "Try adjusting the Hybrid Balance slider or broadening your search query." : "Type a query above to see relevance scores, semantic match confidence, and keyword rankings."}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {results.map((r, i) => {
                const chunkId = r.chunk_id || `chunk_${i}`;
                return (
                  <Box key={chunkId} sx={{ borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.08)", bgcolor: "#0f172a", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)", overflow: "hidden", transition: "border-color 0.2s ease", "&:hover": { borderColor: "rgba(6, 182, 212, 0.4)" } }}>
                    {/* Top bar */}
                    <Box sx={{ px: 2.5, py: 1.5, bgcolor: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Chip label={`#${i + 1}`} size="small" sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700, bgcolor: "rgba(6, 182, 212, 0.15)", color: "#22d3ee", border: "1px solid rgba(6, 182, 212, 0.3)", fontFamily: "monospace" }} />
                        <ArticleIcon sx={{ fontSize: 16, color: "#06b6d4" }} />
                        <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#f8fafc" }}>{r.doc_name}</Typography>
                        <Chip icon={<TagIcon sx={{ fontSize: "11px !important" }} />} label={`Passage #${r.chunk_index}`} size="small"
                          sx={{ height: 20, fontSize: "0.62rem", bgcolor: "rgba(255, 255, 255, 0.05)", color: "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.08)" }} />
                      </Box>
                      <Button size="small"
                        startIcon={copiedId === chunkId ? <CheckIcon sx={{ fontSize: 12, color: "#10b981" }} /> : <ContentCopyIcon sx={{ fontSize: 12 }} />}
                        onClick={() => handleCopyChunk(r.text, chunkId)}
                        sx={{ fontSize: "0.65rem", py: 0.3, px: 1, color: copiedId === chunkId ? "#10b981" : "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 1, "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.2)" } }}>
                        {copiedId === chunkId ? "Copied" : "Copy Text"}
                      </Button>
                    </Box>

                    {/* Scores + text */}
                    <Box sx={{ px: 2.5, py: 2 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 2 }}>
                        {[
                          { label: "COMBINED RELEVANCE", val: r.score, color: "#06b6d4", trackColor: "rgba(255, 255, 255, 0.08)" },
                          { label: "SEMANTIC MATCH", val: r.dense_score, color: "#38bdf8", trackColor: "rgba(255, 255, 255, 0.08)" },
                          { label: "KEYWORD MATCH", val: r.sparse_score, color: "#34d399", trackColor: "rgba(255, 255, 255, 0.08)" },
                        ].map((score) => (
                          <Box key={score.label}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: score.color }}>{score.label}</Typography>
                              <Typography sx={{ fontSize: "0.68rem", fontFamily: "monospace", fontWeight: 700, color: score.color }}>{(score.val * 100).toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, score.val * 100))}
                              sx={{ height: score.label === "COMBINED HYBRID" ? 6 : 5, borderRadius: 2, bgcolor: score.trackColor, "& .MuiLinearProgress-bar": { bgcolor: score.color } }} />
                          </Box>
                        ))}
                      </Box>
                      <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 1.5, bgcolor: "#070b14", border: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "0.75rem", color: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowX: "auto" }}>
                        {r.text}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
export default VectorPlayground;
