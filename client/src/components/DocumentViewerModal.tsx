import React, { useState, useEffect } from "react";
import type { ChunkDetail, DocumentItem, DocumentPreviewResponse, DocumentPageImage } from "../types/rag";
import { getDocumentViewUrl, fetchDocumentChunks, fetchDocumentPreview } from "../services/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
// import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LayersIcon from "@mui/icons-material/Layers";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import SearchIcon from "@mui/icons-material/Search";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import ViewDayIcon from "@mui/icons-material/ViewDay";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import { PlasmaLoader } from "./PlasmaLoader";

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSwitchToChat?: (initialPrompt?: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onSwitchToChat,
}) => {
  const [activeTab, setActiveTab] = useState<"pages" | "reader" | "chunks" | "stream">("pages");
  const [preview, setPreview] = useState<DocumentPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [chunks, setChunks] = useState<ChunkDetail[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  // Page controls for Cloudinary multi-page viewer
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(100); // 100%
  const [viewMode, setViewMode] = useState<"continuous" | "single">("continuous");
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Search & Copy controls for Reader
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const docId = doc?.doc_id || "";
  const docName = doc?.doc_name || "Document";
  const ext = docName.includes(".") ? docName.split(".").pop()?.toLowerCase() || "" : "";
  const isPdf = ext === "pdf";

  const viewUrl = docId ? getDocumentViewUrl(docId, doc?.cloudinary_url) : doc?.cloudinary_url || "";

  useEffect(() => {
    if (isOpen && docId) {
      setCurrentPage(1);
      setZoomScale(100);
      setSearchFilter("");
      setIframeLoaded(false);

      // 1. Fetch Cloudinary pages preview
      setIsLoadingPreview(true);
      fetchDocumentPreview(docId)
        .then((data) => {
          setPreview(data);
          if (data.page_urls && data.page_urls.length > 0) {
            setActiveTab("pages");
          } else {
            setActiveTab("reader");
          }
        })
        .catch((err) => {
          console.warn("Could not fetch document preview metadata:", err);
          setActiveTab("reader");
        })
        .finally(() => setIsLoadingPreview(false));

      // 2. Fetch chunk details for semantic reader
      setIsLoadingChunks(true);
      fetchDocumentChunks(docId)
        .then((data) => setChunks(Array.isArray(data) ? data : (data as any).chunks || []))
        .catch((err) => console.warn("Failed to load chunks for viewer:", err))
        .finally(() => setIsLoadingChunks(false));
    } else {
      setPreview(null);
      setChunks([]);
    }
  }, [isOpen, docId]);

  const handleCopyChunk = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const fullText = chunks.map((c) => c.text).join("\n\n");
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const filteredChunks = chunks.filter((c) =>
    !searchFilter.trim() || c.text.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalWords = chunks.reduce((acc, c) => acc + (c.word_count || 0), doc?.word_count || 0);
  const totalPages = preview?.total_pages || preview?.page_urls?.length || 1;
  const pageList: DocumentPageImage[] = preview?.page_urls || [];

  const getDocIcon = () => {
    if (isPdf) return <PictureAsPdfOutlinedIcon sx={{ fontSize: 22, color: "#f43f5e" }} />;
    if (["docx", "doc"].includes(ext)) return <ArticleOutlinedIcon sx={{ fontSize: 22, color: "#38bdf8" }} />;
    if (["xlsx", "xls", "csv"].includes(ext)) return <TableChartOutlinedIcon sx={{ fontSize: 22, color: "#34d399" }} />;
    return <DescriptionOutlinedIcon sx={{ fontSize: 22, color: "#a855f7" }} />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoomScale(100);

  return (
    <Dialog
      open={isOpen && !!doc}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#070a13",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 2,
            height: "92vh",
            maxHeight: "92vh",
            boxShadow: "0 24px 70px rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Top Header */}
      <DialogTitle sx={{ p: 1.75, px: 3, bgcolor: "#0d1322", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          {/* Document metadata left */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {getDocIcon()}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.98rem", color: "#f8fafc", letterSpacing: "-0.01em" }}>
                {docName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3, flexWrap: "wrap" }}>
                <Chip
                  label={ext.toUpperCase() || "DOCUMENT"}
                  size="small"
                  sx={{
                    bgcolor: "rgba(99, 102, 241, 0.15)",
                    color: "#818cf8",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    height: 19,
                    borderRadius: 1,
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                  }}
                />
                {preview?.cloudinary_url && (
                  <Chip
                    icon={<CloudDoneOutlinedIcon sx={{ fontSize: "12px !important", color: "#34d399 !important" }} />}
                    label="Cloudinary Synced"
                    size="small"
                    sx={{
                      bgcolor: "rgba(52, 211, 153, 0.1)",
                      color: "#34d399",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      height: 19,
                      borderRadius: 1,
                      border: "1px solid rgba(52, 211, 153, 0.25)",
                    }}
                  />
                )}
                {doc?.file_size ? (
                  <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    {formatFileSize(doc.file_size)}
                  </Typography>
                ) : null}
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>•</Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700 }}>
                  {pageList.length > 0 ? `${pageList.length} Pages` : `${chunks.length || doc?.chunk_count || 0} Passages`}
                </Typography>
                {totalWords > 0 && (
                  <>
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>•</Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {totalWords.toLocaleString()} words
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* Right Action Tools & Tabs */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* View Mode Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              sx={{
                minHeight: 34,
                bgcolor: "rgba(255, 255, 255, 0.04)",
                borderRadius: 2,
                p: 0.3,
                "& .MuiTabs-indicator": { display: "none" },
              }}
            >
              {pageList.length > 0 && (
                <Tab
                  value="pages"
                  label={`Pages (${pageList.length})`}
                  icon={<VisibilityIcon sx={{ fontSize: "14px !important" }} />}
                  iconPosition="start"
                  sx={{
                    minHeight: 28,
                    py: 0.5,
                    px: 1.5,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: 2,
                    color: "#94a3b8",
                    "&.Mui-selected": {
                      bgcolor: "rgba(99, 102, 241, 0.25)",
                      color: "#818cf8",
                    },
                  }}
                />
              )}
              <Tab
                value="reader"
                label="Document Reader"
                icon={<MenuBookIcon sx={{ fontSize: "14px !important" }} />}
                iconPosition="start"
                sx={{
                  minHeight: 28,
                  py: 0.5,
                  px: 1.5,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: 2,
                  color: "#94a3b8",
                  "&.Mui-selected": {
                    bgcolor: "rgba(99, 102, 241, 0.25)",
                    color: "#818cf8",
                  },
                }}
              />
              <Tab
                value="chunks"
                label={`Passages (${chunks.length || doc?.chunk_count || 0})`}
                icon={<LayersIcon sx={{ fontSize: "14px !important" }} />}
                iconPosition="start"
                sx={{
                  minHeight: 28,
                  py: 0.5,
                  px: 1.5,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: 2,
                  color: "#94a3b8",
                  "&.Mui-selected": {
                    bgcolor: "rgba(99, 102, 241, 0.25)",
                    color: "#818cf8",
                  },
                }}
              />
              {isPdf && (
                <Tab
                  value="stream"
                  label="PDF Stream"
                  icon={<PictureAsPdfOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                  iconPosition="start"
                  sx={{
                    minHeight: 28,
                    py: 0.5,
                    px: 1.5,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: 2,
                    color: "#94a3b8",
                    "&.Mui-selected": {
                      bgcolor: "rgba(99, 102, 241, 0.25)",
                      color: "#818cf8",
                    },
                  }}
                />
              )}
            </Tabs>

            {/* {preview?.signed_url || doc?.cloudinary_url ? (
              <Tooltip title="Open Original File on Cloudinary">
                <IconButton
                  size="small"
                  component="a"
                  href={preview?.signed_url || doc?.cloudinary_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "#94a3b8",
                    p: 0.8,
                    borderRadius: 2,
                    bgcolor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    "&:hover": { color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.08)" },
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            ) : null} */}

            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: "#64748b",
                p: 0.8,
                borderRadius: 2,
                "&:hover": { color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.06)" },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* Main Body Content */}
      <DialogContent sx={{ p: 0, flex: 1, bgcolor: "#070a13", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "pages" && pageList.length > 0 ? (
          /* ========================================================= */
          /* 1. CLOUDINARY MULTI-PAGE VISUAL DOCUMENT VIEWER           */
          /* ========================================================= */
          <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            {/* Top Viewer Toolbar */}
            <Box
              sx={{
                p: 1.25,
                px: 3,
                bgcolor: "rgba(255, 255, 255, 0.02)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
                flexShrink: 0,
              }}
            >
              {/* Page Navigator */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip title="Previous Page">
                  <span>
                    <IconButton
                      size="small"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        const prev = Math.max(currentPage - 1, 1);
                        setCurrentPage(prev);
                        const el = document.getElementById(`doc-page-${prev}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      sx={{
                        color: "#94a3b8",
                        bgcolor: "rgba(255, 255, 255, 0.04)",
                        borderRadius: 2,
                        p: 0.6,
                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", color: "#f8fafc" },
                        "&.Mui-disabled": { color: "#334155" },
                      }}
                    >
                      <ChevronLeftIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    bgcolor: "rgba(255, 255, 255, 0.04)",
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 2,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#f8fafc" }}>
                    Page {currentPage}
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>/</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    {totalPages}
                  </Typography>
                </Box>

                <Tooltip title="Next Page">
                  <span>
                    <IconButton
                      size="small"
                      disabled={currentPage >= totalPages}
                      onClick={() => {
                        const next = Math.min(currentPage + 1, totalPages);
                        setCurrentPage(next);
                        const el = document.getElementById(`doc-page-${next}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      sx={{
                        color: "#94a3b8",
                        bgcolor: "rgba(255, 255, 255, 0.04)",
                        borderRadius: 2,
                        p: 0.6,
                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", color: "#f8fafc" },
                        "&.Mui-disabled": { color: "#334155" },
                      }}
                    >
                      <ChevronRightIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              {/* View Layout Controls & Zoom */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {/* Thumbnails toggle */}
                <Tooltip title={showThumbnails ? "Hide Thumbnails" : "Show Thumbnails"}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    sx={{
                      height: 30,
                      px: 1.2,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: "none",
                      color: showThumbnails ? "#818cf8" : "#94a3b8",
                      borderColor: showThumbnails ? "rgba(99, 102, 241, 0.4)" : "rgba(255, 255, 255, 0.1)",
                      bgcolor: showThumbnails ? "rgba(99, 102, 241, 0.1)" : "transparent",
                    }}
                  >
                    Thumbnails
                  </Button>
                </Tooltip>

                {/* Single vs Continuous View */}
                <Box sx={{ display: "flex", bgcolor: "rgba(255, 255, 255, 0.04)", borderRadius: 2, p: 0.3 }}>
                  <Tooltip title="Continuous Scroll">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode("continuous")}
                      sx={{
                        borderRadius: 2,
                        p: 0.5,
                        color: viewMode === "continuous" ? "#818cf8" : "#64748b",
                        bgcolor: viewMode === "continuous" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                      }}
                    >
                      <ViewHeadlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Single Page View">
                    <IconButton
                      size="small"
                      onClick={() => setViewMode("single")}
                      sx={{
                        borderRadius: 2,
                        p: 0.5,
                        color: viewMode === "single" ? "#818cf8" : "#64748b",
                        bgcolor: viewMode === "single" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                      }}
                    >
                      <ViewDayIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

                {/* Zoom Controls */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  <Tooltip title="Zoom Out">
                    <IconButton
                      size="small"
                      onClick={handleZoomOut}
                      sx={{
                        color: "#94a3b8",
                        p: 0.5,
                        borderRadius: 2,
                        "&:hover": { color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.08)" },
                      }}
                    >
                      <ZoomOutIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>

                  <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", minWidth: 42, textAlign: "center", fontWeight: 700 }}>
                    {zoomScale}%
                  </Typography>

                  <Tooltip title="Zoom In">
                    <IconButton
                      size="small"
                      onClick={handleZoomIn}
                      sx={{
                        color: "#94a3b8",
                        p: 0.5,
                        borderRadius: 2,
                        "&:hover": { color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.08)" },
                      }}
                    >
                      <ZoomInIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Reset Zoom">
                    <IconButton
                      size="small"
                      onClick={handleResetZoom}
                      sx={{
                        color: "#64748b",
                        p: 0.5,
                        borderRadius: 2,
                        "&:hover": { color: "#818cf8" },
                      }}
                    >
                      <RestartAltIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>

            {/* Main Canvas Area: Left Thumbnails + Right Pages Canvas */}
            <Box sx={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
              {/* Left Thumbnails Panel */}
              {showThumbnails && (
                <Box
                  sx={{
                    width: 160,
                    bgcolor: "rgba(0, 0, 0, 0.25)",
                    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                    p: 1.5,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", px: 0.5 }}>
                    Pages ({pageList.length})
                  </Typography>
                  {pageList.map((p) => {
                    const isSelected = currentPage === p.page;
                    return (
                      <Box
                        key={p.page}
                        onClick={() => {
                          setCurrentPage(p.page);
                          if (viewMode === "continuous") {
                            const el = document.getElementById(`doc-page-${p.page}`);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }}
                        sx={{
                          cursor: "pointer",
                          borderRadius: 2,
                          p: 0.6,
                          border: isSelected ? "2px solid #06b6d4" : "1px solid rgba(255, 255, 255, 0.08)",
                          bgcolor: isSelected ? "rgba(6, 182, 212, 0.15)" : "rgba(255, 255, 255, 0.02)",
                          transition: "all 0.15s ease",
                          flexShrink: 0,
                          "&:hover": {
                            borderColor: "#22d3ee",
                            bgcolor: "rgba(255, 255, 255, 0.05)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            aspectRatio: "1 / 1.414",
                            bgcolor: "#1e293b",
                            borderRadius: 1,
                            overflow: "hidden",
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <img
                            src={p.image_url}
                            alt={`Thumb ${p.page}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            loading="lazy"
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            textAlign: "center",
                            mt: 0.5,
                            fontWeight: isSelected ? 800 : 500,
                            color: isSelected ? "#818cf8" : "#94a3b8",
                          }}
                        >
                          Page {p.page}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Right Rendered Pages Canvas */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "auto",
                  p: { xs: 2, md: 4 },
                  bgcolor: "#050811",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  minHeight: 0,
                  width: "100%",
                }}
              >
                {isLoadingPreview ? (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 10, gap: 2 }}>
                    <CircularProgress size={36} sx={{ color: "#06b6d4" }} />
                    <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                      Loading document pages...
                    </Typography>
                  </Box>
                ) : viewMode === "single" ? (
                  /* Single Page View */
                  (() => {
                    const activePageObj = pageList.find((p) => p.page === currentPage) || pageList[0];
                    if (!activePageObj) return null;
                    const computedWidth = Math.round(820 * (zoomScale / 100));
                    return (
                      <Box
                        sx={{
                          width: `${computedWidth}px`,
                          maxWidth: zoomScale === 100 ? "100%" : "none",
                          bgcolor: "#ffffff",
                          borderRadius: "2px",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.75)",
                          overflow: "hidden",
                          position: "relative",
                          flexShrink: 0,
                          flexGrow: 0,
                        }}
                      >
                        <img
                          src={activePageObj.image_url}
                          alt={`Document Page ${activePageObj.page}`}
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                          }}
                        />
                      </Box>
                    );
                  })()
                ) : (
                  /* Continuous Scroll View */
                  pageList.map((p) => {
                    const computedWidth = Math.round(820 * (zoomScale / 100));
                    return (
                      <Box
                        key={p.page}
                        id={`doc-page-${p.page}`}
                        sx={{
                          width: `${computedWidth}px`,
                          maxWidth: zoomScale === 100 ? "100%" : "none",
                          bgcolor: "#ffffff",
                          borderRadius: "2px",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.75)",
                          overflow: "hidden",
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          flexShrink: 0,
                          flexGrow: 0,
                        }}
                      >
                        {/* Page number badge */}
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 12,
                            right: 14,
                            bgcolor: "rgba(0, 0, 0, 0.75)",
                            backdropFilter: "blur(6px)",
                            color: "#f8fafc",
                            px: 1.2,
                            py: 0.3,
                            borderRadius: 1,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            zIndex: 2,
                            pointerEvents: "none",
                          }}
                        >
                          Page {p.page} / {totalPages}
                        </Box>

                        <img
                          src={p.image_url}
                          alt={`Document Page ${p.page}`}
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                          }}
                          loading={p.page <= 3 ? "eager" : "lazy"}
                        />
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>
        ) : activeTab === "reader" ? (
          /* ========================================================= */
          /* 2. DOCUMENT READER (Extracted Article Content)            */
          /* ========================================================= */
          <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Search & Action Bar */}
            <Box
              sx={{
                p: 2,
                px: 3,
                bgcolor: "rgba(255, 255, 255, 0.02)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <TextField
                size="small"
                placeholder="Search across document text..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                sx={{ flex: 1, maxWidth: 400 }}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ fontSize: 16, color: "#64748b", mr: 1 }} />,
                    sx: {
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      borderRadius: 2,
                      fontSize: "0.82rem",
                      color: "#f8fafc",
                      height: 36,
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.08)" },
                      "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                      "&.Mui-focused fieldset": { borderColor: "#06b6d4" },
                    },
                  },
                }}
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCopyAll}
                  startIcon={copiedAll ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    color: copiedAll ? "#10b981" : "#94a3b8",
                    borderColor: copiedAll ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.12)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 2,
                    height: 34,
                    px: 1.5,
                    "&:hover": { borderColor: "#818cf8", color: "#f8fafc" },
                  }}
                >
                  {copiedAll ? "Copied All Text!" : "Copy Full Text"}
                </Button>
              </Box>
            </Box>

            {/* Scrollable Reader Document Container */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: { xs: 2.5, md: 4 },
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box sx={{ maxWidth: 880, width: "100%" }}>
                {isLoadingChunks ? (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 10, gap: 2 }}>
                    <CircularProgress size={36} sx={{ color: "#06b6d4" }} />
                    <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                      Loading document passages...
                    </Typography>
                  </Box>
                ) : chunks.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <DescriptionOutlinedIcon sx={{ fontSize: 44, color: "#475569", mb: 1.5 }} />
                    <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc", mb: 0.5 }}>
                      Document content is processing
                    </Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                      The text content for this document is being indexed. You can also view the original file pages.
                    </Typography>
                  </Box>
                ) : filteredChunks.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <SearchIcon sx={{ fontSize: 36, color: "#475569", mb: 1 }} />
                    <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>
                      No matches found for "{searchFilter}"
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {filteredChunks.map((chunk, idx) => (
                      <Box
                        key={chunk.chunk_id || idx}
                        sx={{
                          p: 3,
                          bgcolor: "rgba(255, 255, 255, 0.02)",
                          borderRadius: 2,
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: "rgba(255, 255, 255, 0.035)",
                            borderColor: "rgba(6, 182, 212, 0.35)",
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip
                              label={`Section #${chunk.chunk_index}`}
                              size="small"
                              sx={{
                                bgcolor: "rgba(6, 182, 212, 0.15)",
                                color: "#22d3ee",
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                height: 20,
                                borderRadius: 1,
                                border: "1px solid rgba(6, 182, 212, 0.3)",
                              }}
                            />
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                              {chunk.word_count} words
                            </Typography>
                          </Box>
                          <Tooltip title={copiedIndex === idx ? "Copied!" : "Copy Section"}>
                            <IconButton
                              size="small"
                              onClick={() => handleCopyChunk(chunk.text, idx)}
                              sx={{ color: copiedIndex === idx ? "#10b981" : "#64748b", p: 0.4 }}
                            >
                              {copiedIndex === idx ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.88rem",
                            color: "#cbd5e1",
                            lineHeight: 1.75,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {chunk.text}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        ) : activeTab === "chunks" ? (
          /* ========================================================= */
          /* 3. CHUNKS & EMBEDDINGS VIEW                               */
          /* ========================================================= */
          <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", p: 3 }}>
            <Box sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Filter indexed passages..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ fontSize: 16, color: "#64748b", mr: 1 }} />,
                    sx: {
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      borderRadius: 2,
                      fontSize: "0.82rem",
                      color: "#f8fafc",
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.08)" },
                      "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                      "&.Mui-focused fieldset": { borderColor: "#06b6d4" },
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", pr: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {filteredChunks.map((chunk, idx) => (
                <Box
                  key={chunk.chunk_id || idx}
                  sx={{
                    p: 2,
                    bgcolor: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 2,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Chip
                      label={`Passage #${chunk.chunk_index}`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(6, 182, 212, 0.15)",
                        color: "#22d3ee",
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        height: 20,
                        borderRadius: 1,
                      }}
                    />
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                      {chunk.word_count} words • {chunk.char_count} chars
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {chunk.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          /* ========================================================= */
          /* 4. ORIGINAL PDF STREAM FALLBACK                           */
          /* ========================================================= */
          <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
            {!iframeLoaded && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  bgcolor: "#070a13",
                  zIndex: 1,
                }}
              >
                <PlasmaLoader size={1.2} message={`Rendering "${docName}"...`} />
              </Box>
            )}
            <iframe
              src={viewUrl}
              title={docName}
              onLoad={() => setIframeLoaded(true)}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "#070a13",
              }}
            />
          </Box>
        )}
      </DialogContent>

      {/* Bottom Footer Actions */}
      <DialogActions
        sx={{
          p: 2,
          px: 3,
          bgcolor: "#0d1322",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {onSwitchToChat && (
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                onClose();
                onSwitchToChat(`Analyze and summarize the main findings from "${docName}"`);
              }}
              startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 15 }} />}
              sx={{
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                fontWeight: 700,
                fontSize: "0.78rem",
                px: 2,
                py: 0.6,
                borderRadius: 2,
                boxShadow: "0 4px 14px rgba(6, 182, 212, 0.3)",
              }}
            >
              Ask AI About This Document
            </Button>
          )}
        </Box>

        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            borderColor: "rgba(255, 255, 255, 0.15)",
            color: "#94a3b8",
            fontSize: "0.8rem",
            borderRadius: 2,
            px: 2,
            "&:hover": { borderColor: "#818cf8", color: "#f8fafc" },
          }}
        >
          Close Viewer
        </Button>
      </DialogActions>
    </Dialog>
  );
};
