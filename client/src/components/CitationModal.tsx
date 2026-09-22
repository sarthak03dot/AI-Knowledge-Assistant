import React from "react";
import type { Citation } from "../types/rag";
import { getDocumentViewUrl } from "../services/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ArticleIcon from "@mui/icons-material/Article";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
  onViewDoc?: (docId: string, docName: string, cloudinaryUrl?: string) => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ citation, onClose, onViewDoc }) => {
  return (
    <Dialog open={!!citation} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#0b1120",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            borderRadius: 2.5,
            boxShadow: "0 24px 48px rgba(0,0,0,0.7)",
          }
        }
      }}>
      <DialogTitle sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(6, 182, 212, 0.15)", border: "1px solid rgba(6, 182, 212, 0.3)", color: "#22d3ee", display: "flex" }}>
            <MenuBookIcon sx={{ fontSize: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#f8fafc" }}>Source Citation Reference</Typography>
        </Box>
      </DialogTitle>
      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {citation && (
          <Box sx={{ bgcolor: "rgba(255, 255, 255, 0.02)", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.06)", overflow: "hidden" }}>
            {/* Header / Doc Title */}
            <Box sx={{ p: 2, bgcolor: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ArticleIcon sx={{ fontSize: 16, color: "#06b6d4" }} />
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#f8fafc" }}>{citation.doc_name}</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.72rem", color: "#22d3ee", bgcolor: "rgba(6, 182, 212, 0.12)", px: 1, py: 0.3, borderRadius: 1, border: "1px solid rgba(6, 182, 212, 0.25)" }}>
                Chunk #{citation.chunk_index}
              </Typography>
            </Box>

            {/* Snippet */}
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontSize: "0.78rem", fontFamily: "monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#e2e8f0" }}>
                {citation.snippet}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, justifyContent: "space-between", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <Box>
          {citation && (
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                onClose();
                if (onViewDoc) {
                  onViewDoc(citation.doc_id || "", citation.doc_name || "", citation.cloudinary_url);
                } else {
                  window.open(getDocumentViewUrl(citation.doc_id, citation.cloudinary_url), "_blank");
                }
              }}
              startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              sx={{
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                fontWeight: 700,
                fontSize: "0.75rem",
                "&:hover": { background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)" }
              }}
            >
              Preview in In-App Viewer
            </Button>
          )}
        </Box>
        <Button variant="outlined" onClick={onClose} sx={{ borderColor: "rgba(255, 255, 255, 0.15)", color: "#94a3b8", fontSize: "0.8rem", "&:hover": { borderColor: "#06b6d4", color: "#f8fafc" } }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
export default CitationModal;
