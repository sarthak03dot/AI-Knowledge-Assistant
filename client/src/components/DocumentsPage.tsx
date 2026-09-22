import React, { useState, useMemo, useRef } from "react";
import type { DocumentItem, Stats } from "../types/rag";
import { getDocumentViewUrl } from "../services/api";
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Chip,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import SortIcon from "@mui/icons-material/Sort";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import LayersIcon from "@mui/icons-material/Layers";
import ClearIcon from "@mui/icons-material/Clear";

interface DocumentsPageProps {
  documents: DocumentItem[];
  stats: Stats | null;
  onUploadFiles: (files: FileList | File[]) => void;
  onInspectDoc: (docId: string, docName: string) => void;
  onDeleteDoc: (docId: string) => void;
  onViewDoc?: (doc: DocumentItem) => void;
  onOpenSettings: () => void;
  onSwitchToChat: (initialPrompt?: string) => void;
  isUploading: boolean;
  uploadProgress?: number;
  uploadStatusText?: string;
}

type FilterType = "all" | "pdf" | "word" | "spreadsheet" | "text";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc" | "chunks" | "words";

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  stats,
  onUploadFiles,
  onInspectDoc,
  onDeleteDoc,
  onViewDoc,
  onSwitchToChat,
  isUploading,
  uploadProgress = 0,
  uploadStatusText = "",
}) => {
  const [searchVal, setSearchVal] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [isDragOver, setIsDragOver] = useState(false);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper for document visual theme based on extension
  const getDocVisuals = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "txt";
    if (ext === "pdf") {
      return {
        type: "pdf" as const,
        extLabel: "PDF",
        icon: <PictureAsPdfOutlinedIcon sx={{ fontSize: 22, color: "#f43f5e" }} />,
        bgColor: "rgba(244, 63, 94, 0.12)",
        borderColor: "rgba(244, 63, 94, 0.3)",
        accentColor: "#f43f5e",
      };
    }
    if (ext === "docx" || ext === "doc") {
      return {
        type: "word" as const,
        extLabel: "DOCX",
        icon: <ArticleOutlinedIcon sx={{ fontSize: 22, color: "#38bdf8" }} />,
        bgColor: "rgba(56, 189, 248, 0.12)",
        borderColor: "rgba(56, 189, 248, 0.3)",
        accentColor: "#38bdf8",
      };
    }
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      return {
        type: "spreadsheet" as const,
        extLabel: ext.toUpperCase(),
        icon: <TableChartOutlinedIcon sx={{ fontSize: 22, color: "#10b981" }} />,
        bgColor: "rgba(16, 185, 129, 0.12)",
        borderColor: "rgba(16, 185, 129, 0.3)",
        accentColor: "#10b981",
      };
    }
    return {
      type: "text" as const,
      extLabel: ext.toUpperCase(),
      icon: <DescriptionOutlinedIcon sx={{ fontSize: 22, color: "#818cf8" }} />,
      bgColor: "rgba(129, 140, 248, 0.12)",
      borderColor: "rgba(129, 140, 248, 0.3)",
      accentColor: "#818cf8",
    };
  };

  // Format date nicely
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Recently added";
    try {
      const date = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recently added";
    }
  };

  // Format number
  const formatNum = (num?: number) => {
    if (!num) return "0";
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  // Filter & Sort computation
  const filteredAndSortedDocs = useMemo(() => {
    let result = documents.filter((doc) => {
      // Search filter
      const matchesSearch = !searchVal.trim()
        ? true
        : doc.doc_name.toLowerCase().includes(searchVal.toLowerCase());

      if (!matchesSearch) return false;

      // Category filter
      if (activeFilter === "all") return true;
      const visual = getDocVisuals(doc.doc_name);
      return visual.type === activeFilter;
    });

    // Sort
    result = [...result].sort((a, b) => {
      if (sortOption === "newest") {
        return (b.created_at || 0) - (a.created_at || 0);
      }
      if (sortOption === "oldest") {
        return (a.created_at || 0) - (b.created_at || 0);
      }
      if (sortOption === "name_asc") {
        return a.doc_name.localeCompare(b.doc_name);
      }
      if (sortOption === "name_desc") {
        return b.doc_name.localeCompare(a.doc_name);
      }
      if (sortOption === "chunks") {
        return (b.chunk_count || 0) - (a.chunk_count || 0);
      }
      if (sortOption === "words") {
        return (b.word_count || 0) - (a.word_count || 0);
      }
      return 0;
    });

    return result;
  }, [documents, searchVal, activeFilter, sortOption]);

  // Document type counts
  const typeCounts = useMemo(() => {
    const counts = { pdf: 0, word: 0, spreadsheet: 0, text: 0 };
    documents.forEach((d) => {
      const visual = getDocVisuals(d.doc_name);
      counts[visual.type] = (counts[visual.type] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const totalWords = useMemo(() => {
    return documents.reduce((acc, d) => acc + (d.word_count || 0), 0);
  }, [documents]);

  const totalChunks = useMemo(() => {
    return stats?.total_chunks ?? documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
  }, [documents, stats]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", bgcolor: "#0b0f19" }}>
      {/* Top Application Bar */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          bgcolor: "#0e1320",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DescriptionOutlinedIcon sx={{ fontSize: 20, color: "#818cf8" }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#f8fafc", letterSpacing: "-0.01em" }}>
              Documents & Knowledge Library
            </Typography>
            <Chip
              icon={<FiberManualRecordIcon sx={{ fontSize: "6px !important", color: "#10b981 !important" }} />}
              label={`${documents.length} Document${documents.length !== 1 ? "s" : ""}`}
              size="small"
              sx={{
                bgcolor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                fontSize: "0.65rem",
                height: 22,
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>

        {/* Top Right Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
              fontWeight: 700,
              fontSize: "0.78rem",
              py: 0.6,
              px: 1.75,
              borderRadius: 2,
              boxShadow: "0 4px 14px rgba(6, 182, 212, 0.35)",
              "&:hover": { background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)" },
            }}
          >
            Upload Document
          </Button>
        </Box>
      </Box>

      {/* Main Workspace Scroll Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 2, md: 4 },
          py: 3,
          minHeight: 0,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#1e293b", borderRadius: 2 },
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Metrics Grid Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            gap: 1.5,
            mb: 3,
          }}
        >
          {[
            {
              label: "Total Documents",
              val: documents.length,
              sub: `${typeCounts.pdf} PDFs • ${typeCounts.word} DOCX`,
              icon: <DescriptionOutlinedIcon sx={{ fontSize: 18, color: "#818cf8" }} />,
              color: "#818cf8",
              bg: "rgba(99, 102, 241, 0.1)",
              border: "rgba(99, 102, 241, 0.25)",
            },
            {
              label: "Indexed Passages",
              val: totalChunks,
              sub: "Grounded in search",
              icon: <LayersIcon sx={{ fontSize: 18, color: "#38bdf8" }} />,
              color: "#38bdf8",
              bg: "rgba(56, 189, 248, 0.1)",
              border: "rgba(56, 189, 248, 0.25)",
            },
            {
              label: "Total Word Count",
              val: formatNum(totalWords),
              sub: "Extracted corpus text",
              icon: <ArticleOutlinedIcon sx={{ fontSize: 18, color: "#34d399" }} />,
              color: "#34d399",
              bg: "rgba(52, 211, 153, 0.1)",
              border: "rgba(52, 211, 153, 0.25)",
            },
            {
              label: "Status & Search",
              val: "100% Ready",
              sub: "Semantic + Keyword",
              icon: <AutoAwesomeIcon sx={{ fontSize: 18, color: "#fbbf24" }} />,
              color: "#fbbf24",
              bg: "rgba(251, 191, 36, 0.1)",
              border: "rgba(251, 191, 36, 0.25)",
            },
          ].map((m) => (
            <Box
              key={m.label}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#111827",
                border: `1px solid ${m.border}`,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {m.label}
                </Typography>
                <Box sx={{ p: 0.6, borderRadius: 1.5, bgcolor: m.bg, display: "flex" }}>
                  {m.icon}
                </Box>
              </Box>
              <Typography sx={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", mb: 0.2 }}>
                {m.val}
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", color: "#64748b" }}>
                {m.sub}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Ingestion Progress Modal/Section if Uploading */}
        {isUploading && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: "1px solid rgba(99, 102, 241, 0.4)",
              bgcolor: "rgba(17, 24, 39, 0.9)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <CircularProgress size={20} sx={{ color: "#818cf8" }} />
                <Box>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#f8fafc" }}>
                    {uploadStatusText || "Ingesting & indexing new documents..."}
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    Please wait while document text is extracted, parsed into passages, and indexed.
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#a5b4fc", fontFamily: "monospace" }}>
                {Math.round(uploadProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.max(5, uploadProgress)}
              sx={{
                height: 6,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.08)",
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
                },
              }}
            />
          </Box>
        )}

        {/* Drag & Drop Quick Area (Expandable/Drop Indicator) */}
        {isDragOver && (
          <Box
            sx={{
              border: "2px dashed #22d3ee",
              borderRadius: 2,
              py: 4,
              px: 3,
              textAlign: "center",
              bgcolor: "rgba(6, 182, 212, 0.15)",
              mb: 3,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 40, color: "#22d3ee", mb: 1 }} />
            <Typography sx={{ fontWeight: 700, color: "#f8fafc", fontSize: "1rem" }}>
              Drop your files here to start indexing
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Supports PDF, DOCX, XLSX, CSV, TXT, MD, JSON (up to 50MB)
            </Typography>
          </Box>
        )}

        {/* Filter, Search & View Controls Bar */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
            gap: 1.5,
            mb: 2.5,
          }}
        >
          {/* Format Category Chips */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            {[
              { key: "all" as const, label: "All Documents", count: documents.length },
              { key: "pdf" as const, label: "PDFs", count: typeCounts.pdf },
              { key: "word" as const, label: "Word (.docx)", count: typeCounts.word },
              { key: "spreadsheet" as const, label: "Spreadsheets", count: typeCounts.spreadsheet },
              { key: "text" as const, label: "Text / Notes", count: typeCounts.text },
            ].map((f) => (
              <Chip
                key={f.key}
                label={`${f.label} (${f.count})`}
                onClick={() => setActiveFilter(f.key)}
                size="small"
                sx={{
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  fontWeight: activeFilter === f.key ? 700 : 500,
                  bgcolor: activeFilter === f.key ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  color: activeFilter === f.key ? "#22d3ee" : "#94a3b8",
                  border: `1px solid ${activeFilter === f.key ? "#06b6d4" : "rgba(255, 255, 255, 0.08)"}`,
                  transition: "all 0.15s ease",
                  "&:hover": { bgcolor: "rgba(6, 182, 212, 0.15)", color: "#f8fafc" },
                }}
              />
            ))}
          </Box>

          {/* Search Bar + Sort + View Mode Toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search documents by name..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ fontSize: 16, color: "#22d3ee", mr: 0.75 }} />,
                  endAdornment: searchVal ? (
                    <IconButton size="small" onClick={() => setSearchVal("")} sx={{ p: 0.25, color: "#94a3b8" }}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  ) : null,
                  sx: {
                    bgcolor: "#0f172a",
                    borderRadius: 2,
                    fontSize: "0.8rem",
                    color: "#f8fafc",
                    width: { xs: "100%", sm: 220 },
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                    "&:hover fieldset": { borderColor: "rgba(6, 182, 212, 0.3)" },
                    "&.Mui-focused fieldset": { borderColor: "#06b6d4" },
                  },
                },
              }}
            />

            {/* Sort Menu Button */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<SortIcon sx={{ fontSize: 15 }} />}
              onClick={(e) => setSortAnchorEl(e.currentTarget)}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                fontSize: "0.74rem",
                px: 1.25,
                py: 0.6,
                borderRadius: 2,
                "&:hover": { borderColor: "rgba(255, 255, 255, 0.2)", color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.04)" },
              }}
            >
              Sort
            </Button>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={() => setSortAnchorEl(null)}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: "#111827",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 2,
                    color: "#f8fafc",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  },
                },
              }}
            >
              <MenuItem
                selected={sortOption === "newest"}
                onClick={() => { setSortOption("newest"); setSortAnchorEl(null); }}
                sx={{ fontSize: "0.78rem" }}
              >
                Newest Uploaded
              </MenuItem>
              <MenuItem
                selected={sortOption === "oldest"}
                onClick={() => { setSortOption("oldest"); setSortAnchorEl(null); }}
                sx={{ fontSize: "0.78rem" }}
              >
                Oldest Uploaded
              </MenuItem>
              <MenuItem
                selected={sortOption === "name_asc"}
                onClick={() => { setSortOption("name_asc"); setSortAnchorEl(null); }}
                sx={{ fontSize: "0.78rem" }}
              >
                Name (A to Z)
              </MenuItem>
              <MenuItem
                selected={sortOption === "name_desc"}
                onClick={() => { setSortOption("name_desc"); setSortAnchorEl(null); }}
                sx={{ fontSize: "0.78rem" }}
              >
                Name (Z to A)
              </MenuItem>
              <MenuItem
                selected={sortOption === "chunks"}
                onClick={() => { setSortOption("chunks"); setSortAnchorEl(null); }}
                sx={{ fontSize: "0.78rem" }}
              >
                Most Passages / Chunks
              </MenuItem>
              <MenuItem
                selected={sortOption === "words"}
                onClick={() => { setSortOption("words"); setSortAnchorEl(null); }}
                sx={{ fontSize: "0.78rem" }}
              >
                Largest Word Count
              </MenuItem>
            </Menu>

            {/* View Mode Switcher */}
            <Box sx={{ display: "flex", bgcolor: "#111827", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.08)", p: 0.3 }}>
              <IconButton
                size="small"
                onClick={() => setViewMode("grid")}
                sx={{
                  p: 0.5,
                  borderRadius: 1.5,
                  bgcolor: viewMode === "grid" ? "rgba(99, 102, 241, 0.25)" : "transparent",
                  color: viewMode === "grid" ? "#818cf8" : "#64748b",
                  "&:hover": { color: "#f8fafc" },
                }}
              >
                <GridViewIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode("list")}
                sx={{
                  p: 0.5,
                  borderRadius: 1.5,
                  bgcolor: viewMode === "list" ? "rgba(99, 102, 241, 0.25)" : "transparent",
                  color: viewMode === "list" ? "#818cf8" : "#64748b",
                  "&:hover": { color: "#f8fafc" },
                }}
              >
                <ViewListIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Document Content Presentation */}
        {filteredAndSortedDocs.length === 0 ? (
          /* Empty / No Results State */
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              px: 3,
              borderRadius: 2,
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              bgcolor: "rgba(17, 24, 39, 0.5)",
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 44, color: "#475569", mb: 1.5 }} />
            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc", mb: 0.5 }}>
              {searchVal ? `No documents found matching "${searchVal}"` : "No document assets in your workspace"}
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", maxWidth: 450, mx: "auto", mb: 2.5 }}>
              {searchVal
                ? "Try clearing your search query or selecting a different category filter above."
                : "Upload PDF research reports, DOCX files, spreadsheets, or text files to begin asking grounded questions."}
            </Typography>
            {searchVal ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSearchVal("")}
                sx={{ color: "#22d3ee", borderColor: "rgba(6, 182, 212, 0.4)" }}
              >
                Clear Search
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  px: 2.5,
                  py: 0.8,
                }}
              >
                Upload First Document
              </Button>
            )}
          </Box>
        ) : viewMode === "grid" ? (
          /* Grid Card Layout */
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {filteredAndSortedDocs.map((doc) => {
              const visual = getDocVisuals(doc.doc_name);

              return (
                <Card
                  key={doc.doc_id}
                  sx={{
                    bgcolor: "#111827",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 2,
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "rgba(99, 102, 241, 0.4)",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4), 0 0 12px rgba(99, 102, 241, 0.15)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5, pb: 1.5 }}>
                    {/* Top Row: Format badge + Date */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
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
                        <Chip
                          label={visual.extLabel}
                          size="small"
                          sx={{
                            bgcolor: visual.bgColor,
                            color: visual.accentColor,
                            fontWeight: 800,
                            fontSize: "0.65rem",
                            height: 20,
                            border: `1px solid ${visual.borderColor}`,
                          }}
                        />
                      </Box>

                      <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
                        {formatDate(doc.created_at)}
                      </Typography>
                    </Box>

                    {/* Document Title */}
                    <Typography
                      noWrap
                      title={doc.doc_name}
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "#f8fafc",
                        mb: 1.5,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {doc.doc_name}
                    </Typography>

                    {/* Stats Pills */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
                      <Chip
                        icon={<LayersIcon sx={{ fontSize: "12px !important", color: "#818cf8 !important" }} />}
                        label={`${doc.chunk_count || 0} Passages`}
                        size="small"
                        sx={{
                          bgcolor: "rgba(99, 102, 241, 0.1)",
                          border: "1px solid rgba(99, 102, 241, 0.25)",
                          color: "#818cf8",
                          fontSize: "0.68rem",
                          height: 22,
                          fontWeight: 600,
                        }}
                      />
                      {doc.word_count ? (
                        <Chip
                          label={`${formatNum(doc.word_count)} words`}
                          size="small"
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            color: "#94a3b8",
                            fontSize: "0.68rem",
                            height: 22,
                          }}
                        />
                      ) : null}
                    </Box>

                    {/* Grounded Status indicator */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <FiberManualRecordIcon sx={{ fontSize: 7, color: "#10b981" }} />
                      <Typography sx={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600 }}>
                        Indexed & Ready for Q&A
                      </Typography>
                    </Box>
                  </CardContent>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

                  {/* Card Action Bar */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      bgcolor: "rgba(255, 255, 255, 0.015)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {/* Ask AI Button */}
                    <Button
                      size="small"
                      startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 13 }} />}
                      onClick={() => onSwitchToChat(`Summarize the main themes and key insights from "${doc.doc_name}"`)}
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#818cf8",
                        bgcolor: "rgba(99, 102, 241, 0.1)",
                        px: 1.2,
                        py: 0.4,
                        borderRadius: 1.5,
                        "&:hover": { bgcolor: "rgba(99, 102, 241, 0.2)" },
                      }}
                    >
                      Ask AI
                    </Button>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {/* View Original File in In-App Viewer */}
                      <Tooltip title="Preview / Open Document in In-App Viewer">
                        <IconButton
                          size="small"
                          onClick={() => onViewDoc ? onViewDoc(doc) : window.open(getDocumentViewUrl(doc.doc_id, doc.cloudinary_url), "_blank")}
                          sx={{ color: "#38bdf8", p: 0.5, "&:hover": { bgcolor: "rgba(56, 189, 248, 0.1)" } }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>

                      {/* Inspect Passages */}
                      <Tooltip title="Inspect Document Passages">
                        <IconButton
                          size="small"
                          onClick={() => onInspectDoc(doc.doc_id, doc.doc_name)}
                          sx={{ color: "#818cf8", p: 0.5, "&:hover": { bgcolor: "rgba(99, 102, 241, 0.1)" } }}
                        >
                          <VisibilityIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>

                      {/* Delete File */}
                      <Tooltip title="Delete Document">
                        <IconButton
                          size="small"
                          onClick={() => onDeleteDoc(doc.doc_id)}
                          sx={{ color: "#94a3b8", p: 0.5, "&:hover": { color: "#f43f5e", bgcolor: "rgba(244, 63, 94, 0.1)" } }}
                        >
                          <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Box>
        ) : (
          /* Table / List View Layout */
          <Box
            sx={{
              borderRadius: 2,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              bgcolor: "#111827",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Table Header */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "2fr 1fr", sm: "3fr 1fr 1fr 1fr 120px" },
                px: 2.5,
                py: 1.25,
                bgcolor: "rgba(255, 255, 255, 0.02)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Document Name
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: { xs: "none", sm: "block" } }}>
                Passages
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: { xs: "none", sm: "block" } }}>
                Word Count
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Added Date
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>
                Actions
              </Typography>
            </Box>

            {/* Table Rows */}
            {filteredAndSortedDocs.map((doc, idx) => {
              const visual = getDocVisuals(doc.doc_name);

              return (
                <Box
                  key={doc.doc_id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "2fr 1fr", sm: "3fr 1fr 1fr 1fr 120px" },
                    alignItems: "center",
                    px: 2.5,
                    py: 1.5,
                    borderBottom: idx === filteredAndSortedDocs.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.04)",
                    transition: "bgcolor 0.15s ease",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.02)" },
                  }}
                >
                  {/* Name + Icon */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, pr: 2 }}>
                    <Box sx={{ p: 0.6, borderRadius: 1.5, bgcolor: visual.bgColor, border: `1px solid ${visual.borderColor}`, display: "flex" }}>
                      {visual.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap title={doc.doc_name} sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>
                        {doc.doc_name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 5, color: "#10b981" }} />
                        <Typography sx={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 500 }}>
                          Indexed & Ready
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Passages */}
                  <Box sx={{ display: { xs: "none", sm: "block" } }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#818cf8" }}>
                      {doc.chunk_count || 0} passages
                    </Typography>
                  </Box>

                  {/* Word Count */}
                  <Box sx={{ display: { xs: "none", sm: "block" } }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                      {formatNum(doc.word_count)}
                    </Typography>
                  </Box>

                  {/* Date */}
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {formatDate(doc.created_at)}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                    <Tooltip title="Ask AI About This Document">
                      <IconButton
                        size="small"
                        onClick={() => onSwitchToChat(`Summarize key insights from "${doc.doc_name}"`)}
                        sx={{ color: "#818cf8", p: 0.5, "&:hover": { bgcolor: "rgba(99, 102, 241, 0.1)" } }}
                      >
                        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Preview / Open Document in In-App Viewer">
                      <IconButton
                        size="small"
                        onClick={() => onViewDoc ? onViewDoc(doc) : window.open(getDocumentViewUrl(doc.doc_id, doc.cloudinary_url), "_blank")}
                        sx={{ color: "#38bdf8", p: 0.5, "&:hover": { bgcolor: "rgba(56, 189, 248, 0.1)" } }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Inspect Passages">
                      <IconButton
                        size="small"
                        onClick={() => onInspectDoc(doc.doc_id, doc.doc_name)}
                        sx={{ color: "#818cf8", p: 0.5, "&:hover": { bgcolor: "rgba(99, 102, 241, 0.1)" } }}
                      >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete Document">
                      <IconButton
                        size="small"
                        onClick={() => onDeleteDoc(doc.doc_id)}
                        sx={{ color: "#94a3b8", p: 0.5, "&:hover": { color: "#f43f5e", bgcolor: "rgba(244, 63, 94, 0.1)" } }}
                      >
                        <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentsPage;
