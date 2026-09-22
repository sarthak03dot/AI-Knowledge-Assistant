import React, { useState } from "react";
import type { ChunkDetail } from "../types/rag";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Divider,
} from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import StorageIcon from "@mui/icons-material/Storage";
import TagIcon from "@mui/icons-material/Tag";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import SearchIcon from "@mui/icons-material/Search";

interface ChunkModalProps {
  docName: string;
  chunks: ChunkDetail[];
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
}

export const ChunkModal: React.FC<ChunkModalProps> = ({
  docName, chunks, isOpen, isLoading, onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");

  const handleCopyChunk = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredChunks = chunks.filter((c) => c.text.toLowerCase().includes(filterText.toLowerCase()));

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#0b1120",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            borderRadius: 2.5,
            maxHeight: "85vh",
            boxShadow: "0 24px 48px rgba(0,0,0,0.7)",
          }
        }
      }}>
      <DialogTitle sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(6, 182, 212, 0.15)", border: "1px solid rgba(6, 182, 212, 0.3)", color: "#22d3ee", display: "flex" }}>
            <LayersIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#f8fafc" }}>Indexed Document Passages</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Document: <Box component="span" sx={{ color: "#22d3ee", fontWeight: 700 }}>{docName}</Box> ({chunks.length} passages)
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

      {chunks.length > 2 && (
        <Box sx={{ px: 3, py: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search within chunk text..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ fontSize: 16, color: "#22d3ee", mr: 0.5 }} />,
                sx: {
                  bgcolor: "#0f172a",
                  borderRadius: 2,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#f8fafc",
                  fontSize: "0.85rem",
                  "& input::placeholder": { color: "#64748b" },
                },
              }
            }}
          />
        </Box>
      )}

      <DialogContent sx={{ pt: 1, px: 3, "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-track": { bgcolor: "transparent" }, "&::-webkit-scrollbar-thumb": { bgcolor: "#1e293b", borderRadius: 2 } }}>
        {isLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, py: 8 }}>
            <StorageIcon sx={{ fontSize: 40, color: "#06b6d4", animation: "pulse 1.5s ease-in-out infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } } }} />
            <Typography sx={{ fontWeight: 600, color: "#f8fafc" }}>Loading indexed document passages...</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>Extracting passage text & metadata</Typography>
          </Box>
        ) : chunks.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}><Typography sx={{ color: "#94a3b8" }}>No chunks found for this document.</Typography></Box>
        ) : filteredChunks.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}><Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>No chunks matching "{filterText}"</Typography></Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {filteredChunks.map((chunk) => (
              <Box key={chunk.chunk_id || chunk.chunk_index} sx={{ borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.08)", bgcolor: "#0f172a", overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1, bgcolor: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TagIcon sx={{ fontSize: 14, color: "#22d3ee" }} />
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#22d3ee" }}>Chunk #{chunk.chunk_index}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#94a3b8" }}>{chunk.word_count} words • {chunk.char_count} chars</Typography>
                    <Button size="small" onClick={() => handleCopyChunk(chunk.text, chunk.chunk_index)}
                      startIcon={copiedIndex === chunk.chunk_index ? <CheckIcon sx={{ fontSize: 12, color: "#10b981" }} /> : <ContentCopyIcon sx={{ fontSize: 12 }} />}
                      sx={{ fontSize: "0.65rem", py: 0.3, px: 1, minWidth: 0, color: copiedIndex === chunk.chunk_index ? "#10b981" : "#94a3b8", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 1, "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.2)" } }}>
                      {copiedIndex === chunk.chunk_index ? "Copied" : "Copy"}
                    </Button>
                  </Box>
                </Box>
                <Box component="pre" sx={{ m: 0, p: 2, fontSize: "0.75rem", color: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowX: "auto" }}>
                  {chunk.text}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderColor: "rgba(255, 255, 255, 0.15)", color: "#94a3b8", fontSize: "0.8rem", "&:hover": { borderColor: "#06b6d4", color: "#f8fafc" } }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
export default ChunkModal;
