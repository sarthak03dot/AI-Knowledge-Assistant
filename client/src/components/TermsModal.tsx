import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const sections = [
    {
      icon: <ShieldOutlinedIcon sx={{ fontSize: 20, color: "#06b6d4" }} />,
      title: "1. Privacy & Document Isolation",
      content:
        "All uploaded documents (PDFs, DOCX, XLSX, CSVs, TXT) are strictly isolated to your authenticated account. Files and knowledge vectors are encrypted in transit and at rest.",
    },
    {
      icon: <LockOutlinedIcon sx={{ fontSize: 20, color: "#8b5cf6" }} />,
      title: "2. Zero Public Model Training",
      content:
        "Your proprietary data, document passages, and chat queries are never used to train public generative AI models or sold to third-party data brokers.",
    },
    {
      icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 20, color: "#10b981" }} />,
      title: "3. Grounded Citations & Accuracy",
      content:
        "Our RAG platform provides source citations linked directly to your uploaded passages. While high precision is maintained, users should review citations for high-stakes operational decisions.",
    },
    {
      icon: <StorageOutlinedIcon sx={{ fontSize: 20, color: "#f59e0b" }} />,
      title: "4. User Control & Data Retention",
      content:
        "You retain complete ownership of your data. You may delete individual documents, wipe chat histories, or export citation notes at any time from your dashboard.",
    },
    {
      icon: <GavelOutlinedIcon sx={{ fontSize: 20, color: "#f43f5e" }} />,
      title: "5. Responsible Usage",
      content:
        "Users agree not to upload malicious payloads or violate intellectual property rights. Accounts violating security policies are subject to immediate suspension.",
    },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#0b1120",
            backgroundImage: "none",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            borderRadius: 2.5,
            boxShadow: "0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(6, 182, 212, 0.15)",
            p: 1,
            maxHeight: "85vh",
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GavelOutlinedIcon sx={{ fontSize: 22, color: "#22d3ee" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#f8fafc" }}>
                Terms & Conditions
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                NexusRAG Platform & Privacy Standards
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: "#64748b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              p: 0.6,
              "&:hover": { color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.06)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

      <DialogContent
        sx={{
          px: 3,
          py: 2.5,
          overflowY: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
        }}
      >
        <Typography sx={{ fontSize: "0.82rem", color: "#cbd5e1", mb: 2.5, lineHeight: 1.6 }}>
          Welcome to <strong style={{ color: "#22d3ee" }}>NexusRAG</strong>. By registering an account or using our services, you agree to these Terms and Conditions designed to ensure enterprise data security, privacy, and grounded retrieval integrity.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sections.map((sec, idx) => (
            <Box
              key={idx}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                gap: 1.5,
              }}
            >
              <Box sx={{ mt: 0.25, flexShrink: 0 }}>{sec.icon}</Box>
              <Box>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", mb: 0.4 }}>
                  {sec.title}
                </Typography>
                <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.55 }}>
                  {sec.content}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.84rem",
            py: 1,
            borderRadius: 2,
            textTransform: "none",
            boxShadow: "0 4px 16px rgba(6, 182, 212, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
              boxShadow: "0 6px 20px rgba(6, 182, 212, 0.5)",
            },
          }}
        >
          I Understand & Agree
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default TermsModal;
