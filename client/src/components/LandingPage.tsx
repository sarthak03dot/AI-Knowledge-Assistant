import React from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Container,
  Typography,
  Button,
  Chip,
  Stack,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import StorageIcon from "@mui/icons-material/Storage";
import CloudIcon from "@mui/icons-material/Cloud";
import ArticleIcon from "@mui/icons-material/Article";
import ShieldIcon from "@mui/icons-material/Shield";
import BoltIcon from "@mui/icons-material/Bolt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LoginIcon from "@mui/icons-material/Login";

interface LandingPageProps {
  onOpenAuth: () => void;
  onOpenPricing?: () => void;
  dbType?: string;
  hasCloudinary?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onOpenPricing,
}) => {
  const featureCards = [
    {
      icon: <ArticleIcon sx={{ fontSize: 28 }} />,
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.12)",
      border: "rgba(6, 182, 212, 0.3)",
      title: "Multi-Format Documents",
      text: "Native parsing for PDF documents, Word reports (.docx), Excel spreadsheets (.xlsx), CSV tables, and structured text.",
    },
    {
      icon: <ShieldIcon sx={{ fontSize: 28 }} />,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.3)",
      title: "Private & Secure Workspaces",
      text: "Your uploaded documents and conversations are private, isolated, and encrypted with enterprise-grade data governance.",
    },
    {
      icon: <BoltIcon sx={{ fontSize: 28 }} />,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.12)",
      border: "rgba(139, 92, 246, 0.3)",
      title: "Real-Time Grounded Answers",
      text: "High-speed AI answering with clickable source citations, multi-persona analysis, and instant document insights.",
    },
  ];

  const steps = [
    {
      icon: <CloudIcon sx={{ fontSize: 22 }} />,
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.12)",
      border: "rgba(6, 182, 212, 0.3)",
      title: "1. Upload Documents",
      desc: "Upload PDFs, DOCX, CSVs, or text files to build your searchable knowledge base in seconds.",
    },
    {
      icon: <StorageIcon sx={{ fontSize: 22 }} />,
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.12)",
      border: "rgba(59, 130, 246, 0.3)",
      title: "2. Semantic Search",
      desc: "Deep AI search scans paragraphs, figures, and data tables for exact contextual matches.",
    },
    {
      icon: <AutoAwesomeIcon sx={{ fontSize: 22 }} />,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.12)",
      border: "rgba(139, 92, 246, 0.3)",
      title: "3. Grounded Chat & Citations",
      desc: "Stream comprehensive answers with verified clickable citations linked directly to source passages.",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#070b14", overflow: "auto" }}>
      {/* Navbar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(7, 11, 20, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(6, 182, 212, 0.18)",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Brand */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2.5,
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(6, 182, 212, 0.45)",
              }}
            >
              <LayersIcon sx={{ fontSize: 20, color: "white" }} />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: "-0.01em" }} color="text.primary">
                  NexusRAG
                </Typography>
                <Chip
                  label="Enterprise"
                  size="small"
                  sx={{
                    bgcolor: "rgba(6, 182, 212, 0.18)",
                    border: "1px solid rgba(6, 182, 212, 0.35)",
                    color: "#22d3ee",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    height: 20,
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                Grounded Document Intelligence
              </Typography>
            </Box>
          </Box>

          {/* Nav actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Chip
              icon={<ShieldIcon sx={{ fontSize: "13px !important", color: "#10b981 !important" }} />}
              label="Encrypted & Private"
              size="small"
              sx={{
                bgcolor: "rgba(16, 185, 129, 0.12)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontSize: "0.7rem",
                fontWeight: 600,
              }}
            />
            <Chip
              icon={<AutoAwesomeIcon sx={{ fontSize: "13px !important", color: "#06b6d4 !important" }} />}
              label="Live Grounding"
              size="small"
              sx={{
                bgcolor: "rgba(6, 182, 212, 0.12)",
                color: "#22d3ee",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                fontSize: "0.7rem",
                fontWeight: 600,
              }}
            />
            {onOpenPricing && (
              <Button
                variant="text"
                size="small"
                startIcon={<AutoAwesomeIcon sx={{ fontSize: 14, color: "#8b5cf6" }} />}
                onClick={onOpenPricing}
                sx={{
                  color: "#cbd5e1",
                  fontSize: "0.78rem",
                  py: 0.7,
                  "&:hover": { color: "#ffffff", bgcolor: "rgba(6, 182, 212, 0.1)" },
                }}
              >
                Plans
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<LoginIcon sx={{ fontSize: 14 }} />}
              onClick={onOpenAuth}
              sx={{
                borderColor: "rgba(6, 182, 212, 0.4)",
                color: "#22d3ee",
                fontSize: "0.78rem",
                py: 0.7,
                "&:hover": { borderColor: "#06b6d4", bgcolor: "rgba(6, 182, 212, 0.12)" },
              }}
            >
              Sign In
            </Button>
            <Button
              variant="contained"
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              onClick={onOpenAuth}
              sx={{
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                fontWeight: 700,
                fontSize: "0.78rem",
                py: 0.7,
                boxShadow: "0 4px 16px rgba(6, 182, 212, 0.4)",
                "&:hover": {
                  background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
                  boxShadow: "0 6px 20px rgba(6, 182, 212, 0.55)",
                },
              }}
            >
              Get Started Free
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          textAlign: "center",
          pt: { xs: 8, md: 12 },
          pb: { xs: 6, md: 10 },
          overflow: "hidden",
        }}
      >
        {/* Aurora Glow background */}
        <Box
          sx={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.22) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <Container maxWidth="md" sx={{ position: "relative" }}>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: "14px !important", color: "#06b6d4 !important" }} />}
            label="Next-Gen Retrieval-Augmented Generation Platform"
            size="small"
            sx={{
              mb: 4,
              bgcolor: "rgba(6, 182, 212, 0.12)",
              border: "1px solid rgba(6, 182, 212, 0.35)",
              color: "#22d3ee",
              fontSize: "0.75rem",
              fontWeight: 600,
              py: 0.5,
            }}
          />

          <Typography
            variant="h3"
            color="text.primary"
            sx={{
              fontWeight: 800,
              mb: 3,
              lineHeight: 1.2,
              background: "linear-gradient(135deg, #f8fafc 20%, #22d3ee 60%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Your Documents, Grounded Intelligence & Cloud Storage in One Place
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 5, maxWidth: 620, mx: "auto", lineHeight: 1.75, fontSize: "1rem" }}
          >
            Upload <strong>PDF, Word DOCX, Excel XLSX, CSV, JSON & TXT</strong> files. NexusRAG indexes your knowledge base, securely protects your documents in the cloud, and delivers grounded AI answers with real-time source citations.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, justifyContent: "center", mb: 8 }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={onOpenAuth}
              sx={{
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                fontWeight: 700,
                px: 4,
                py: 1.4,
                borderRadius: 2.5,
                boxShadow: "0 8px 28px rgba(6, 182, 212, 0.45)",
                "&:hover": {
                  background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
                  boxShadow: "0 12px 36px rgba(6, 182, 212, 0.6)",
                },
              }}
            >
              Register & Start Ingesting
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<LoginIcon />}
              onClick={onOpenAuth}
              sx={{
                borderColor: "rgba(6, 182, 212, 0.4)",
                color: "#22d3ee",
                px: 3.5,
                py: 1.4,
                borderRadius: 2.5,
                "&:hover": { borderColor: "#06b6d4", bgcolor: "rgba(6, 182, 212, 0.12)" },
              }}
            >
              Sign In to Workspace
            </Button>
          </Box>

          {/* Preview Card */}
          <Box
            sx={{
              maxWidth: 720,
              mx: "auto",
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              bgcolor: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.15)",
            }}
          >
            {/* Window chrome */}
            <Box
              sx={{
                px: 2,
                py: 1.2,
                bgcolor: "rgba(7, 11, 20, 0.8)",
                borderBottom: "1px solid rgba(6, 182, 212, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Stack direction="row" spacing={0.75}>
                {["#f43f5e", "#f59e0b", "#10b981"].map((c) => (
                  <Box key={c} sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c }} />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center", fontSize: "0.72rem", fontFamily: "monospace" }}>
                nexusrag.workspace.live
              </Typography>
              <Chip
                label="User Isolated"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  bgcolor: "rgba(6, 182, 212, 0.15)",
                  color: "#22d3ee",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                }}
              />
            </Box>
            <Box sx={{ p: 3, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
              {steps.map((step) => (
                <Box
                  key={step.title}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: `1px solid ${step.border}`,
                    bgcolor: step.bg,
                    textAlign: "left",
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: step.bg,
                      border: `1px solid ${step.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: step.color,
                      mb: 1.5,
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography sx={{ fontSize: "0.75rem", mb: 0.5, fontWeight: 700, display: "block", color: "text.primary" }}>
                    {step.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", lineHeight: 1.5 }}>
                    {step.desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: "rgba(6, 182, 212, 0.03)" }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }} color="text.primary">
              Engineered for Precision, Privacy & Scale
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: "auto" }}>
              Everything you need for an enterprise-ready knowledge assistant with verified zero hallucinations.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {featureCards.map((card) => (
              <Grid size={{ xs: 12, md: 4 }} key={card.title}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: "rgba(15, 23, 42, 0.75)",
                    border: `1px solid ${card.border}`,
                    borderRadius: 3,
                    backdropFilter: "blur(12px)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: `0 16px 36px rgba(0,0,0,0.4), 0 0 20px ${card.bg}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3.5 }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.5,
                        bgcolor: card.bg,
                        border: `1px solid ${card.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: card.color,
                        mb: 2.5,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }} color="text.primary">
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {card.text}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, borderTop: "1px solid rgba(6, 182, 212, 0.15)", bgcolor: "rgba(7, 11, 20, 0.95)" }}>
        <Container>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LayersIcon sx={{ fontSize: 18, color: "#06b6d4" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                NexusRAG Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Enterprise Document Intelligence & Semantic Search
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              © 2026 NexusRAG. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};
export default LandingPage;
