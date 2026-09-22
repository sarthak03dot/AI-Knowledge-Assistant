import React, { useRef, useState } from "react";
import type { DocumentItem, Stats } from "../types/rag";
import { getDocumentViewUrl } from "../services/api";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
  Button,
} from "@mui/material";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PsychologyIcon from "@mui/icons-material/Psychology";
import StorageIcon from "@mui/icons-material/Storage";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CircularProgress from "@mui/material/CircularProgress";

interface AssetDashboardProps {
  documents: DocumentItem[];
  stats: Stats | null;
  onUploadFiles: (files: FileList | File[]) => void;
  onInspectDoc: (docId: string, docName: string) => void;
  onDeleteDoc: (docId: string) => void;
  onOpenSettings: () => void;
  onSwitchToChat: () => void;
  isUploading: boolean;
  uploadProgress?: number;
  uploadStatusText?: string;
}

export const AssetDashboard: React.FC<AssetDashboardProps> = ({
  documents = [],
  stats,
  onUploadFiles,
  onInspectDoc,
  onDeleteDoc,
  onOpenSettings,
  onSwitchToChat,
  isUploading,
  uploadProgress = 0,
  uploadStatusText = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files?.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
    }
    // Reset so selecting the same file again still fires onChange
    e.target.value = "";
  };

  const getDocVisuals = (fileName: string = "") => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "txt";
    if (ext === "pdf") {
      return {
        icon: <PictureAsPdfOutlinedIcon sx={{ fontSize: 20, color: "#f43f5e" }} />,
        bgColor: "rgba(244, 63, 94, 0.12)",
        borderColor: "rgba(244, 63, 94, 0.25)",
        barColor: "#06b6d4",
        status: "Indexed & Searchable",
      };
    }
    if (ext === "docx" || ext === "doc") {
      return {
        icon: <ArticleOutlinedIcon sx={{ fontSize: 20, color: "#38bdf8" }} />,
        bgColor: "rgba(56, 189, 248, 0.12)",
        borderColor: "rgba(56, 189, 248, 0.25)",
        barColor: "#10b981",
        status: "Upload Successful!",
      };
    }
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      return {
        icon: <TableChartOutlinedIcon sx={{ fontSize: 20, color: "#34d399" }} />,
        bgColor: "rgba(52, 211, 153, 0.12)",
        borderColor: "rgba(52, 211, 153, 0.25)",
        barColor: "#10b981",
        status: "Upload Successful!",
      };
    }
    return {
      icon: <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: "#22d3ee" }} />,
      bgColor: "rgba(6, 182, 212, 0.12)",
      borderColor: "rgba(6, 182, 212, 0.25)",
      barColor: "#06b6d4",
      status: "Ready for Ingestion",
    };
  };

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        bgcolor: "#070b14",
        minHeight: 0,
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
        "&::-webkit-scrollbar-thumb": { bgcolor: "#1e293b", borderRadius: 2 },
      }}
    >
      <Box sx={{ maxWidth: 1040, mx: "auto", p: { xs: 2.5, md: 4.5 } }}>
        {/* Top Breadcrumb & Controls */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box
            onClick={onSwitchToChat}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.8,
              cursor: "pointer",
              color: "#818cf8",
              fontSize: "0.85rem",
              fontWeight: 600,
              transition: "all 0.15s ease",
              "&:hover": { color: "#a5b4fc", transform: "translateX(-2px)" },
            }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 11 }} />
            Back to AI Assistant
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Tooltip title="Help & Documentation">
              <IconButton
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#94a3b8",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)", color: "#f8fafc" },
                }}
              >
                <HelpOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="System & API Settings">
              <IconButton
                size="small"
                onClick={onOpenSettings}
                sx={{
                  width: 32,
                  height: 32,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#94a3b8",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)", color: "#f8fafc" },
                }}
              >
                <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filter & View Options">
              <IconButton
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#94a3b8",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)", color: "#f8fafc" },
                }}
              >
                <FilterListIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Main Page Title & Subtitle */}
        <Box sx={{ mb: 3.5 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "#f8fafc",
              fontSize: { xs: "1.5rem", md: "1.75rem" },
              letterSpacing: "-0.02em",
              mb: 0.5,
            }}
          >
            Upload Document Assets
          </Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "#94a3b8" }}>
            Manage your document knowledge base, indexed knowledge passages, and cloud documents.
          </Typography>
        </Box>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Drag & Drop Box */}
        <Box
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            border: isDragOver ? "2px dashed #22d3ee" : "2px dashed rgba(6, 182, 212, 0.4)",
            borderRadius: 2,
            py: 4.5,
            px: 3,
            textAlign: "center",
            cursor: isUploading ? "not-allowed" : "pointer",
            opacity: isUploading ? 0.6 : 1,
            pointerEvents: isUploading ? "none" : "auto",
            bgcolor: isDragOver ? "rgba(6, 182, 212, 0.1)" : "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(12px)",
            position: "relative",
            mb: 4,
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#06b6d4",
              boxShadow: "0 8px 30px rgba(6, 182, 212, 0.2)",
              bgcolor: "rgba(15, 23, 42, 0.9)",
            },
          }}
        >
          {/* Upload Icon Badge */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: isUploading ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.15)",
              border: isUploading ? "1px solid #22d3ee" : "1px solid rgba(6, 182, 212, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1.5,
              position: "relative",
            }}
          >
            {isUploading ? (
              <CircularProgress size={26} thickness={4.5} sx={{ color: "#22d3ee" }} />
            ) : (
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 22, color: "#22d3ee" }} />
            )}
          </Box>

          {/* Text */}
          <Typography
            sx={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#f8fafc",
              mb: 0.5,
            }}
          >
            {isUploading ? (
              <Box component="span" sx={{ color: "#22d3ee", display: "inline-flex", alignItems: "center", gap: 1 }}>
                <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                <span>Processing & Vectorizing Documents ({Math.round(uploadProgress || 0)}%)...</span>
              </Box>
            ) : (
              <>
                <Box component="span" sx={{ color: "#22d3ee", textDecoration: "underline", cursor: "pointer" }}>
                  Click here
                </Box>{" "}
                to upload your file or drag & drop.
              </>
            )}
          </Typography>

          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            {isUploading
              ? "Analyzing document content and indexing knowledge passages. Please wait..."
              : "Supported Format: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, MD, JSON (50mb max)"}
          </Typography>

          {/* Corner format badge on the right */}
          <Box
            sx={{
              position: "absolute",
              right: 28,
              top: "50%",
              transform: "translateY(-50%)",
              display: { xs: "none", sm: "flex" },
              flexDirection: "column",
              alignItems: "center",
              gap: 0.25,
              opacity: 0.75,
            }}
          >
            <Box sx={{ fontSize: "1.4rem" }}>📄</Box>
            <Typography
              sx={{
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: 0.5,
                color: "#94a3b8",
              }}
            >
              PDF / DOCX
            </Typography>
          </Box>
        </Box>

        {/* Document Progress & Status Cards List */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
          {documents.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
                px: 3,
                borderRadius: 2,
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                bgcolor: "rgba(17, 24, 39, 0.4)",
              }}
            >
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0", mb: 0.5 }}>
                No document assets uploaded yet
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8", mb: 2 }}>
                Drag and drop PDF reports, spreadsheets, or text files into the area above to begin knowledge indexing.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  fontSize: "0.78rem",
                  borderColor: "rgba(6, 182, 212, 0.4)",
                  color: "#22d3ee",
                  "&:hover": { borderColor: "#06b6d4", bgcolor: "rgba(6, 182, 212, 0.1)" },
                }}
              >
                Browse Files
              </Button>
            </Box>
          ) : (
            documents.map((doc) => {
              const visual = getDocVisuals(doc.doc_name);

              return (
                <Box
                  key={doc.doc_id}
                  sx={{
                    p: 2.25,
                    borderRadius: 2,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    bgcolor: "#111827",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      borderColor: "rgba(99, 102, 241, 0.35)",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                    },
                  }}
                >
                  {/* Top Row: Icon + Title + Delete */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1.2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: visual.bgColor,
                          border: `1px solid ${visual.borderColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {visual.icon}
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          noWrap
                          title={doc.doc_name}
                          sx={{
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            color: "#f8fafc",
                          }}
                        >
                          {doc.doc_name}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Actions right */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title="View Original Document">
                        <IconButton
                          size="small"
                          component="a"
                          href={getDocumentViewUrl(doc.doc_id, doc.cloudinary_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: "#38bdf8", p: 0.6, "&:hover": { bgcolor: "rgba(56, 189, 248, 0.1)" } }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Inspect Document Passages">
                        <IconButton
                          size="small"
                          onClick={() => onInspectDoc(doc.doc_id, doc.doc_name)}
                          sx={{ color: "#818cf8", p: 0.6, "&:hover": { bgcolor: "rgba(99, 102, 241, 0.1)" } }}
                        >
                          <VisibilityIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete File Asset">
                        <IconButton
                          size="small"
                          onClick={() => onDeleteDoc(doc.doc_id)}
                          sx={{ color: "#94a3b8", p: 0.6, "&:hover": { color: "#f43f5e", bgcolor: "rgba(244, 63, 94, 0.1)" } }}
                        >
                          <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ mb: 0.75 }}>
                    <LinearProgress
                      variant="determinate"
                      value={100}
                      sx={{
                        height: 5,
                        borderRadius: 2,
                        bgcolor: "rgba(255, 255, 255, 0.08)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: visual.barColor,
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Box>

                  {/* Status bottom text */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {doc.chunk_count ?? 0} chunks • {(doc.word_count ?? 0).toLocaleString()} words •{" "}
                      {visual.status}
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <CheckCircleIcon sx={{ fontSize: 15, color: "#10b981" }} />
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: visual.barColor,
                        }}
                      >
                        100%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}

          {/* Uploading In-Progress Multi-Stage Pipeline Animation Card */}
          {isUploading && (
            <Box
              sx={{
                p: 2.75,
                borderRadius: 2,
                border: "1px solid rgba(99, 102, 241, 0.4)",
                bgcolor: "#0f172a",
                boxShadow: "0 8px 32px rgba(99, 102, 241, 0.25)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
              }}
            >
              {/* Background ambient glow */}
              <Box
                sx={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  bgcolor: "rgba(99, 102, 241, 0.15)",
                  filter: "blur(30px)",
                  pointerEvents: "none",
                }}
              />

              {/* Header: Title + Rotating Loader + Percentage */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, position: "relative", zIndex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  {/* Pulsing Neural Beacon */}
                  <Box
                    sx={{
                      position: "relative",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        bgcolor: "rgba(99, 102, 241, 0.25)",
                        animation: "pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                        "@keyframes pulseRing": {
                          "0%": { transform: "scale(0.8)", opacity: 0.8 },
                          "50%": { transform: "scale(1.4)", opacity: 0.2 },
                          "100%": { transform: "scale(0.8)", opacity: 0.8 },
                        },
                      }}
                    />
                    <CircularProgress
                      size={24}
                      thickness={5}
                      sx={{
                        color: "#818cf8",
                        "& .MuiCircularProgress-circle": {
                          strokeLinecap: "round",
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.01em" }}>
                      {uploadStatusText || "Ingesting and indexing new documents..."}
                    </Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8", mt: 0.2 }}>
                      {uploadProgress < 30
                        ? "Streaming file payloads securely to server..."
                        : uploadProgress < 65
                        ? "Parsing document text, headers & metadata..."
                        : uploadProgress < 88
                        ? "Extracting semantic neural embeddings..."
                        : "Finalizing knowledge indexing & sync..."}
                    </Typography>
                  </Box>
                </Box>

                {/* Percentage Badge */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    borderRadius: 2,
                    bgcolor: "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      fontFamily: '"JetBrains Mono", monospace',
                      color: "#a5b4fc",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {Math.round(uploadProgress || 0)}%
                  </Typography>
                </Box>
              </Box>

              {/* Shimmering Animated Multi-Color Progress Bar */}
              <Box
                sx={{
                  position: "relative",
                  height: 8,
                  borderRadius: 2,
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  overflow: "hidden",
                  mb: 2.2,
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${Math.max(5, Math.min(100, uploadProgress || 0))}%`,
                    borderRadius: 2,
                    background: "linear-gradient(90deg, #0891b2 0%, #06b6d4 35%, #8b5cf6 70%, #22d3ee 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmerGlow 2s ease-in-out infinite",
                    transition: "width 0.3s ease-out",
                    boxShadow: "0 0 12px rgba(6, 182, 212, 0.6)",
                    "@keyframes shimmerGlow": {
                      "0%": { backgroundPosition: "0% 50%" },
                      "50%": { backgroundPosition: "100% 50%" },
                      "100%": { backgroundPosition: "0% 50%" },
                    },
                  }}
                />
              </Box>

              {/* Multi-Stage Visual Ingestion Pipeline */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
                  gap: 1.2,
                  pt: 1.5,
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {[
                  {
                    id: 1,
                    label: "1. Upload Stream",
                    desc: "Byte transmission",
                    icon: <CloudUploadIcon sx={{ fontSize: 14 }} />,
                    isDone: (uploadProgress || 0) >= 30,
                    isActive: (uploadProgress || 0) < 30,
                  },
                  {
                    id: 2,
                    label: "2. Text Chunking",
                    desc: "Recursive token slices",
                    icon: <ArticleOutlinedIcon sx={{ fontSize: 14 }} />,
                    isDone: (uploadProgress || 0) >= 65,
                    isActive: (uploadProgress || 0) >= 30 && (uploadProgress || 0) < 65,
                  },
                  {
                    id: 3,
                    label: "3. Semantic Model",
                    desc: "Neural indexing",
                    icon: <PsychologyIcon sx={{ fontSize: 14 }} />,
                    isDone: (uploadProgress || 0) >= 88,
                    isActive: (uploadProgress || 0) >= 65 && (uploadProgress || 0) < 88,
                  },
                  {
                    id: 4,
                    label: "4. Knowledge Index",
                    desc: "Semantic sync",
                    icon: <StorageIcon sx={{ fontSize: 14 }} />,
                    isDone: (uploadProgress || 0) >= 99,
                    isActive: (uploadProgress || 0) >= 88,
                  },
                ].map((stage) => (
                  <Box
                    key={stage.id}
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: stage.isActive
                        ? "rgba(99, 102, 241, 0.15)"
                        : stage.isDone
                        ? "rgba(16, 185, 129, 0.08)"
                        : "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${
                        stage.isActive
                          ? "rgba(99, 102, 241, 0.4)"
                          : stage.isDone
                          ? "rgba(16, 185, 129, 0.25)"
                          : "rgba(255, 255, 255, 0.05)"
                      }`,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.3 }}>
                      {stage.isDone ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: "#34d399" }} />
                      ) : stage.isActive ? (
                        <CircularProgress size={12} thickness={5} sx={{ color: "#818cf8" }} />
                      ) : (
                        <Box sx={{ color: "#64748b" }}>{stage.icon}</Box>
                      )}
                      <Typography
                        sx={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          color: stage.isDone ? "#34d399" : stage.isActive ? "#818cf8" : "#64748b",
                        }}
                      >
                        {stage.label}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.64rem", color: stage.isActive ? "#cbd5e1" : "#64748b", pl: 2.5 }}>
                      {stage.desc}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Informative Reassurance Footer */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mt: 1.75,
                  pt: 1.2,
                  borderTop: "1px dashed rgba(255, 255, 255, 0.06)",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 13, color: "#818cf8" }} />
                  <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    Please keep this window open — indexing passages for 100% grounded answers.
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Floating Bottom AI Grounded Chat CTA Pill */}
        <Box
          sx={{
            mt: 4,
            p: 2.25,
            borderRadius: 2,
            bgcolor: "rgba(17, 24, 39, 0.85)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: "rgba(6, 182, 212, 0.2)",
                border: "1px solid rgba(6, 182, 212, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22d3ee",
              }}
            >
              <ChatBubbleOutlinedIcon sx={{ fontSize: 19 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#f8fafc" }}>
                Ready to query your ingested documents?
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                {stats?.total_chunks ?? 0} passages indexed and ready for instant search and grounding.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            size="small"
            onClick={onSwitchToChat}
            sx={{
              px: 2.5,
              py: 0.9,
              fontSize: "0.8rem",
              fontWeight: 700,
              borderRadius: 2,
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
              boxShadow: "0 4px 14px rgba(6, 182, 212, 0.4)",
              "&:hover": {
                background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
              },
            }}
          >
            Open AI Assistant
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
