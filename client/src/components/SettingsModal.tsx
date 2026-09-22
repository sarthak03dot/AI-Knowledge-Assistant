import React, { useState } from "react";
import type { AppConfig } from "../types/rag";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  TextField,
  Divider,
  CircularProgress,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import KeyIcon from "@mui/icons-material/Key";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { updateAppConfig } from "../services/api";

interface SettingsModalProps {
  isOpen: boolean;
  topK: number;
  alpha: number;
  onUpdateParams: (topK: number, alpha: number) => void;
  onClose: () => void;
  onRefreshStats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  topK,
  alpha,
  onUpdateParams,
  onClose,
  onRefreshStats,
}) => {
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [localTopK, setLocalTopK] = useState(topK);
  const [localAlpha, setLocalAlpha] = useState(alpha);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    const payload: AppConfig = { top_k: localTopK, alpha: localAlpha };
    if (nvidiaKey.trim()) payload.nvidia_api_key = nvidiaKey.trim();
    if (groqKey.trim()) payload.groq_api_key = groqKey.trim();
    if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
    if (openrouterKey.trim()) payload.openrouter_api_key = openrouterKey.trim();
    try {
      await updateAppConfig(payload);
      onUpdateParams(localTopK, localAlpha);
      onRefreshStats();
      setSavedSuccess(true);
      setTimeout(() => { setSavedSuccess(false); onClose(); }, 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth
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
            <TuneIcon sx={{ fontSize: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#f8fafc" }}>Multi-Provider & RAG Settings</Typography>
        </Box>
      </DialogTitle>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

      <form onSubmit={handleSave}>
        <DialogContent sx={{ pt: 2.5, px: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* API Keys */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <KeyIcon sx={{ fontSize: 14, color: "#22d3ee" }} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#22d3ee" }}>
                  API Keys (Optional Override)
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", mb: 2 }}>
                NexusRAG dynamically routes queries across high-speed enterprise AI model engines.
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField label="NVIDIA NIM AI API Key" type="password" size="small" placeholder="nvapi-..." value={nvidiaKey} onChange={(e) => setNvidiaKey(e.target.value)} fullWidth />
                <TextField label="OpenRouter API Key" type="password" size="small" placeholder="sk-or-v1-..." value={openrouterKey} onChange={(e) => setOpenrouterKey(e.target.value)} fullWidth />
                <TextField label="Groq API Key" type="password" size="small" placeholder="gsk_..." value={groqKey} onChange={(e) => setGroqKey(e.target.value)} fullWidth />
                <TextField label="Google Gemini API Key" type="password" size="small" placeholder="AIzaSy... / AQ...." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} fullWidth />
              </Box>
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* Retrieval Params */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                <TuneIcon sx={{ fontSize: 14, color: "#22d3ee" }} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#22d3ee" }}>
                  Retrieval Parameters
                </Typography>
              </Box>

              {/* Top-K */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#f8fafc" }}>Top-K Context Passages</Typography>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#22d3ee" }}>{localTopK}</Typography>
                </Box>
                <Slider value={localTopK} onChange={(_, v) => setLocalTopK(v as number)} min={1} max={10} step={1} marks
                  sx={{ color: "#06b6d4" }} />
                <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8" }}>Number of top relevant passages passed into AI context.</Typography>
              </Box>

              {/* Alpha */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#f8fafc" }}>Hybrid Balance (Keyword vs Semantic)</Typography>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#22d3ee" }}>{localAlpha.toFixed(2)}</Typography>
                </Box>
                <Slider value={localAlpha} onChange={(_, v) => setLocalAlpha(v as number)} min={0} max={1} step={0.05} sx={{ color: "#06b6d4" }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "0.68rem", color: "#38bdf8" }}>0.0 (Pure Keyword Match)</Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: "#06b6d4" }}>1.0 (Pure Semantic Match)</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Button type="button" variant="outlined" onClick={onClose} disabled={isSaving}
            sx={{ borderColor: "rgba(255, 255, 255, 0.15)", color: "#94a3b8", fontSize: "0.8rem", "&:hover": { borderColor: "#06b6d4", color: "#f8fafc" } }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving}
            startIcon={savedSuccess ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
            sx={{
              flex: 1,
              background: savedSuccess ? "#10b981" : "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
              fontWeight: 700,
              fontSize: "0.8rem",
              "&:hover": { background: savedSuccess ? "#059669" : "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)" }
            }}>
            {savedSuccess ? "Saved!" : isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
export default SettingsModal;
