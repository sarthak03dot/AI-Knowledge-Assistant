import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { ChatMessage, Citation, Stats, User as UserType, ChatSession, AIPersonaKey, DocumentItem } from "../types/rag";
import { streamChatQuery, updateChatSession, fetchChatById } from "../services/api";
import { useTheme } from "../theme";
import {
  Box,
  Stack,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  Avatar,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Paper,
  Divider,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import BoltIcon from "@mui/icons-material/Bolt";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeveloperBoardIcon from "@mui/icons-material/DeveloperBoard";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ArticleIcon from "@mui/icons-material/Article";
import SearchIcon from "@mui/icons-material/Search";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CodeIcon from "@mui/icons-material/Code";
import { ConfirmationModal } from "./ConfirmationModal";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TuneIcon from "@mui/icons-material/Tune";
import PsychologyIcon from "@mui/icons-material/Psychology";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SchoolIcon from "@mui/icons-material/School";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CloseIcon from "@mui/icons-material/Close";

interface ChatViewProps {
  stats: Stats | null;
  documents?: DocumentItem[];
  documentsCount?: number;
  currentUser?: UserType | null;
  topK: number;
  alpha: number;
  onCitationClick: (citation: Citation) => void;
  telemetryStatus: string;
  setTelemetryStatus: (status: string) => void;
  onOpenSettings?: () => void;
  activeChatId: string | null;
  onChatCreatedOrUpdated?: (chat: ChatSession) => void;
  onNewChat?: () => void;
}

const PERSONAS: Array<{
  id: AIPersonaKey;
  name: string;
  badge: string;
  icon: React.ReactElement;
  desc: string;
  tagline: string;
}> = [
  {
    id: "executive",
    name: "Executive Analyst",
    badge: "Strategic",
    icon: <BusinessCenterIcon sx={{ fontSize: 15 }} />,
    desc: "Provides structured executive summaries, business takeaways, and actionable bullet points.",
    tagline: "Concise, strategic & decision-oriented",
  },
  {
    id: "architect",
    name: "Technical Architect",
    badge: "Deep Specs",
    icon: <CodeIcon sx={{ fontSize: 15 }} />,
    desc: "Provides deep technical breakdowns, architecture dataflows, schemas, and implementation code.",
    tagline: "Engineering specifications & architecture",
  },
  {
    id: "researcher",
    name: "Fact-Checker & Scholar",
    badge: "Precision",
    icon: <FactCheckIcon sx={{ fontSize: 15 }} />,
    desc: "Exhaustive factual analysis citing exact numbers, metrics, dates, and strict chunk references.",
    tagline: "100% rigorous evidence & citation quotes",
  },
  {
    id: "tutor",
    name: "Interactive AI Tutor",
    badge: "Mentor",
    icon: <SchoolIcon sx={{ fontSize: 15 }} />,
    desc: "Step-by-step reasoning with intuitive analogies, glossary breakdowns, and learning takeaways.",
    tagline: "Clear analogies & structured guidance",
  },
  {
    id: "custom",
    name: "Custom Persona",
    badge: "Custom",
    icon: <EditNoteIcon sx={{ fontSize: 15 }} />,
    desc: "Configure your own custom instructions and persona behavior for answering queries.",
    tagline: "User-defined system instructions",
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  stats,
  documents = [],
  documentsCount = 0,
  currentUser,
  topK,
  alpha,
  onCitationClick,
  telemetryStatus,
  setTelemetryStatus,
  onOpenSettings,
  activeChatId,
  onChatCreatedOrUpdated,
  onNewChat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(activeChatId);
  const [currentPersona, setCurrentPersona] = useState<AIPersonaKey>("executive");
  const [customPersonaText, setCustomPersonaText] = useState("");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [tempCustomText, setTempCustomText] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  
  // Document Scoping & @ Mention State
  const [selectedDocScope, setSelectedDocScope] = useState<DocumentItem[]>([]);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const [scopeMenuAnchorEl, setScopeMenuAnchorEl] = useState<HTMLElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { colors } = useTheme();

  const getDocIcon = (docName: string) => {
    const lower = (docName || "").toLowerCase();
    if (lower.endsWith(".pdf")) return <PictureAsPdfOutlinedIcon sx={{ fontSize: 16, color: "#f43f5e" }} />;
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) return <TableChartOutlinedIcon sx={{ fontSize: 16, color: "#10b981" }} />;
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) return <DescriptionOutlinedIcon sx={{ fontSize: 16, color: "#38bdf8" }} />;
    return <ArticleIcon sx={{ fontSize: 16, color: "#a855f7" }} />;
  };

  const filteredMentionDocs = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    if (!mentionFilter) return documents;
    return documents.filter((d: DocumentItem) =>
      (d.doc_name || "").toLowerCase().includes(mentionFilter.toLowerCase())
    );
  }, [documents, mentionFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputQuery(val);

    const cursor = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9._-]*)$/);

    if (mentionMatch) {
      setIsMentionOpen(true);
      setMentionFilter(mentionMatch[1]);
      setMentionHighlightIndex(0);
    } else {
      setIsMentionOpen(false);
    }
  };

  const handleSelectMentionDoc = (doc: DocumentItem) => {
    if (!selectedDocScope.some((d) => d.doc_id === doc.doc_id)) {
      setSelectedDocScope((prev) => [...prev, doc]);
    }
    setInputQuery((prev) => prev.replace(/@[a-zA-Z0-9._-]*$/, "").trimEnd() + (prev.endsWith(" ") ? "" : " "));
    setIsMentionOpen(false);
  };

  const handleRemoveDocScope = (docId: string) => {
    setSelectedDocScope((prev) => prev.filter((d) => d.doc_id !== docId));
  };

  const handleToggleDocScope = (doc: DocumentItem) => {
    setSelectedDocScope((prev) =>
      prev.some((d) => d.doc_id === doc.doc_id)
        ? prev.filter((d) => d.doc_id !== doc.doc_id)
        : [...prev, doc]
    );
  };

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      )
    );
    setTelemetryStatus("Generation stopped by user");
  }, [setTelemetryStatus]);

  // Load chat session if activeChatId changes
  const loadChat = useCallback(async (chatId: string) => {
    setIsLoadingChat(true);
    try {
      const session = await fetchChatById(chatId);
      if (session) {
        setMessages(session.messages || []);
        if (session.persona && ["executive", "architect", "researcher", "tutor", "custom"].includes(session.persona as string)) {
          setCurrentPersona(session.persona as AIPersonaKey);
        }
        if (session.custom_persona) {
          setCustomPersonaText(session.custom_persona);
        }
        setCurrentChatId(session.id);
        setTelemetryStatus(`Loaded chat: ${session.title}`);
      }
    } catch (err) {
      console.error("Failed to load chat session:", err);
    } finally {
      setIsLoadingChat(false);
    }
  }, [setTelemetryStatus]);

  useEffect(() => {
    if (activeChatId) {
      loadChat(activeChatId);
    } else {
      setMessages([]);
      setCurrentChatId(null);
    }
  }, [activeChatId, loadChat]);

  const quickActions = [
    {
      icon: <ArticleIcon sx={{ fontSize: 20, color: "#38bdf8" }} />,
      badge: "Synthesis",
      badgeColor: "#38bdf8",
      title: "Executive Synthesis",
      subtitle: "Generate an executive summary of key takeaways, conclusions, and findings.",
      prompt: "Generate a comprehensive executive summary of all key takeaways, conclusions, and core findings from the uploaded documents.",
    },
    {
      icon: <SearchIcon sx={{ fontSize: 20, color: "#a855f7" }} />,
      badge: "Deep Probe",
      badgeColor: "#a855f7",
      title: "Fact & Data Extraction",
      subtitle: "Probe exact figures, tables, dates, statistics, and definitions with citations.",
      prompt: "Extract all significant figures, statistics, dates, definitions, and facts mentioned in the documents with citations.",
    },
    {
      icon: <CompareArrowsIcon sx={{ fontSize: 20, color: "#34d399" }} />,
      badge: "Comparative",
      badgeColor: "#34d399",
      title: "Cross-Topic Analysis",
      subtitle: "Compare arguments, perspectives, and methodologies across files.",
      prompt: "Compare and contrast the primary arguments, methodologies, and perspectives discussed across the ingested files.",
    },
    {
      icon: <CodeIcon sx={{ fontSize: 20, color: "#fbbf24" }} />,
      badge: "Architecture",
      badgeColor: "#fbbf24",
      title: "Technical Q&A",
      subtitle: "Ask granular technical questions with exact source paragraph matches.",
      prompt: "Explain the technical architecture, principles, frameworks, and implementations detailed in the source materials.",
    },
  ];

  const quickPills = [
    { label: "Summarize Documents", prompt: "Summarize all key insights and themes from the uploaded documents in clear bullet points." },
    { label: "Key Takeaways", prompt: "Highlight the core findings, main arguments, and actionable takeaways from the uploaded documents." },
    { label: "Key Entities & Dates", prompt: "List all prominent entities, organizations, locations, and key dates found in the document corpus." },
    { label: "Technical Breakdown", prompt: "Provide a detailed technical breakdown of the methods, architectures, or protocols described in the files." },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearChat = () => {
    setMessages([]);
    setTelemetryStatus("Ready");
    setIsClearConfirmOpen(false);
    if (onNewChat) onNewChat();
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const md = messages
      .map((m) => `### ${m.role === "user" ? "User" : "NexusRAG Assistant"}\n\n${m.content}\n\n`)
      .join("---\n\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NexusRAG_Chat_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveCustomPersona = () => {
    setCustomPersonaText(customPersonaText);
    setCurrentPersona("custom");
    setIsCustomModalOpen(false);
  };

  const handleSendMessage = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isStreaming) return;

    setInputQuery("");
    setIsStreaming(true);

    let sessionId = currentChatId;
    if (!sessionId) {
      sessionId = `chat_${Date.now()}`;
      setCurrentChatId(sessionId);
    }

    const userMessageId = `user_${Date.now()}`;
    const assistantMessageId = `asst_${Date.now()}`;

    const docIdsToQuery = selectedDocScope.length > 0 ? selectedDocScope.map((d) => d.doc_id) : undefined;
    const scopedDocNames = selectedDocScope.length > 0 ? selectedDocScope.map((d) => d.doc_name) : undefined;

    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: trimmed,
      scopedDocs: scopedDocNames,
    };
    const asstMsg: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
      citations: [],
      model: "Searching knowledge base...",
    };

    const newMessages: ChatMessage[] = [...messages, userMsg, asstMsg];
    setMessages(newMessages);
    setTelemetryStatus(`Synthesizing response (${PERSONAS.find((p) => p.id === currentPersona)?.name})...`);

    const chatHistoryPayload = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
    chatHistoryPayload.push({ role: "user", content: trimmed });

    const charQueue: string[] = [];
    let displayedText = "";
    let currentCitations: Citation[] = [];
    let currentProvider = "Connecting...";
    let isStreamDone = false;
    let doneMetadata: { latency: number; confidence: number; provider: string } | null = null;
    let isDraining = false;

    const drainQueue = () => {
      if (isDraining) return;
      isDraining = true;
      const step = () => {
        if (charQueue.length > 0) {
          const count = charQueue.length > 50 ? 5 : charQueue.length > 20 ? 3 : charQueue.length > 8 ? 2 : 1;
          for (let i = 0; i < count && charQueue.length > 0; i++) displayedText += charQueue.shift();
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: displayedText, citations: currentCitations, model: currentProvider } : msg
            )
          );
          setTimeout(step, 14);
        } else if (isStreamDone) {
          const finalMessages = newMessages.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: displayedText,
                  citations: currentCitations,
                  model: doneMetadata?.provider || currentProvider,
                  latency: doneMetadata?.latency,
                  confidence: doneMetadata?.confidence,
                  isStreaming: false,
                }
              : msg
          );
          setMessages(finalMessages);
          setTelemetryStatus(`Completed in ${doneMetadata?.latency || 0.5}s via ${doneMetadata?.provider || currentProvider}`);
          setIsStreaming(false);
          isDraining = false;

          // Persist chat session to database
          if (sessionId) {
            updateChatSession(sessionId, {
              persona: currentPersona,
              custom_persona: customPersonaText,
              messages: finalMessages,
            })
              .then((updated) => {
                if (onChatCreatedOrUpdated) onChatCreatedOrUpdated(updated);
              })
              .catch((e) => console.error("Error auto-saving chat:", e));
          }
        } else {
          isDraining = false;
        }
      };
      step();
    };

    const enqueue = (text: string) => {
      for (let i = 0; i < text.length; i++) charQueue.push(text[i]);
      drainQueue();
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamChatQuery(
        trimmed,
        topK,
        alpha,
        chatHistoryPayload,
        {
          onInit: (data) => {
            currentCitations = data.citations || [];
            if (data.provider) currentProvider = data.provider;
            const scopeNote = selectedDocScope.length > 0 ? ` (Scoped to ${selectedDocScope.length} doc${selectedDocScope.length > 1 ? "s" : ""})` : "";
            setTelemetryStatus(`Retrieved ${currentCitations.length} relevant passages${scopeNote} | Synthesizing answer...`);
          },
          onProvider: (provider) => {
            currentProvider = provider;
            setTelemetryStatus(`Streaming from: ${provider}`);
          },
          onToken: (token) => {
            enqueue(token);
          },
          onDone: (data) => {
            doneMetadata = data;
            isStreamDone = true;
            drainQueue();
          },
        },
        {
          chatId: sessionId,
          persona: currentPersona,
          customPersona: customPersonaText,
          docIds: docIdsToQuery,
        },
        controller.signal
      );
      isStreamDone = true;
      drainQueue();
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        setTelemetryStatus("Generation stopped by user");
        setIsStreaming(false);
        return;
      }
      console.error("Chat error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Error: Failed to stream response from knowledge engine.", isStreaming: false }
            : msg
        )
      );
      setTelemetryStatus("Streaming error");
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isMentionOpen && filteredMentionDocs.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionHighlightIndex((prev) => (prev + 1) % filteredMentionDocs.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionHighlightIndex((prev) => (prev - 1 + filteredMentionDocs.length) % filteredMentionDocs.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMentionDoc(filteredMentionDocs[mentionHighlightIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMentionOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputQuery);
    }
  };

  const parseTableLine = (line: string): string[] => {
    let trimmed = line.trim();
    if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
    if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
    return trimmed.split("|").map((cell) => cell.trim());
  };

  const isTableSeparator = (line: string): boolean => {
    const cells = parseTableLine(line);
    if (cells.length === 0) return false;
    return cells.every((cell) => /^:?-+:?$/.test(cell));
  };

  const getAlignments = (sepLine: string): Array<"left" | "center" | "right"> => {
    const cells = parseTableLine(sepLine);
    return cells.map((cell) => {
      const startColon = cell.startsWith(":");
      const endColon = cell.endsWith(":");
      if (startColon && endColon) return "center";
      if (endColon) return "right";
      return "left";
    });
  };

  const renderFormattedMarkdown = (text: string, citations?: Citation[], isUser = false) => {
    if (!text) return null;

    // Normalize text: unify newlines, code fences, inline sources & context
    const normalizedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\\+`{3,}/g, "```")
      .replace(/\\+~{3,}/g, "~~~")
      .replace(/`{4,}/g, "```")
      .replace(/([^\n])(\(Source:\s*)/gi, "$1\n\n$2")
      .replace(/([^\n])(\*\*Recognized Context)/gi, "$1\n\n$2");

    // Parse blocks: code fences (``` or ~~~) vs text blocks
    const lines = normalizedText.split("\n");
    interface Block {
      type: "code" | "text";
      lang?: string;
      lines: string[];
    }
    const blocks: Block[] = [];
    let inCode = false;
    let currentLang = "";
    let currentLines: string[] = [];

    const flushCurrent = (type: "code" | "text") => {
      if (currentLines.length > 0 || type === "code") {
        blocks.push({
          type,
          lang: currentLang,
          lines: currentLines,
        });
        currentLines = [];
        currentLang = "";
      }
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();
      const codeFenceMatch = trimmed.match(/^(`{3,}|~{3,})\s*([a-zA-Z0-9_+#.-]*)/);

      if (codeFenceMatch) {
        if (!inCode) {
          flushCurrent("text");
          inCode = true;
          currentLang = codeFenceMatch[2] || "";
        } else {
          flushCurrent("code");
          inCode = false;
        }
      } else if (
        inCode &&
        (trimmed.startsWith("### ") ||
          trimmed.startsWith("## ") ||
          trimmed.startsWith("# ") ||
          trimmed.startsWith("(Source:") ||
          trimmed.startsWith("You've re-shared") ||
          trimmed.startsWith("You have re-shared"))
      ) {
        // If an unclosed code block hits a section header or outside text, close the code block
        flushCurrent("code");
        inCode = false;
        currentLines.push(line);
      } else {
        currentLines.push(line);
      }
    }

    if (inCode) {
      flushCurrent("code");
    } else {
      flushCurrent("text");
    }

    return blocks.map((block, blockIdx) => {
      if (block.type === "code") {
        const codeContent = block.lines.join("\n");
        const lang = block.lang || "";
        return (
          <Box
            key={`code_${blockIdx}`}
            sx={{
              my: 1.5,
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: isUser ? "rgba(15, 23, 42, 0.7)" : colors.background.darkSurface,
              border: `1px solid ${isUser ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
              boxShadow: colors.shadows.lg,
            }}
          >
            {lang && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.6,
                  bgcolor: colors.background.darkCard,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {lang}
                </Typography>
                <Tooltip title="Copy Code">
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(codeContent.trim())}
                    sx={{ color: colors.text.tertiary, p: 0.3, "&:hover": { color: colors.text.inverse } }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            <Box
              component="pre"
              sx={{
                p: 1.75,
                m: 0,
                fontSize: "0.8rem",
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                color: colors.text.primary,
                overflowX: "auto",
                lineHeight: 1.65,
              }}
            >
              <code>{codeContent.trim()}</code>
            </Box>
          </Box>
        );
      }

      const textLines = block.lines;
      const elements: React.ReactNode[] = [];
      let i = 0;

      while (i < textLines.length) {
        const line = textLines[i];
        const trimmed = line.trim();
        const key = `${blockIdx}_${i}`;

        // Check for Markdown Table (Header + Separator row)
        if (
          trimmed.includes("|") &&
          i + 1 < textLines.length &&
          isTableSeparator(textLines[i + 1])
        ) {
          const headers = parseTableLine(line);
          const alignments = getAlignments(textLines[i + 1]);
          const rows: string[][] = [];
          i += 2;
          while (i < textLines.length && textLines[i].trim().includes("|") && textLines[i].trim() !== "") {
            const rowCells = parseTableLine(textLines[i]);
            while (rowCells.length < headers.length) {
              rowCells.push("");
            }
            rows.push(rowCells);
            i++;
          }

          elements.push(
            <Box
              key={`table_${key}`}
              sx={{
                my: 2,
                maxWidth: "100%",
                overflowX: "auto",
                borderRadius: 2,
                border: `1px solid ${isUser ? "rgba(255,255,255,0.25)" : colors.border.default}`,
                bgcolor: isUser ? "rgba(15, 23, 42, 0.6)" : colors.background.darkCard,
                boxShadow: colors.shadows.md,
                "&::-webkit-scrollbar": { height: 6 },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                "&::-webkit-scrollbar-thumb": { bgcolor: "#334155", borderRadius: 2 },
              }}
            >
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "0.825rem",
                }}
              >
                <Box component="thead">
                  <Box
                    component="tr"
                    sx={{
                      bgcolor: isUser ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                      borderBottom: `1px solid ${isUser ? "rgba(255,255,255,0.2)" : colors.border.default}`,
                    }}
                  >
                    {headers.map((header, hIdx) => (
                      <Box
                        key={hIdx}
                        component="th"
                        sx={{
                          px: 2,
                          py: 1.25,
                          fontWeight: 700,
                          color: isUser ? colors.text.inverse : colors.text.primary,
                          letterSpacing: "0.02em",
                          textAlign: alignments[hIdx] || "left",
                          borderRight:
                            hIdx < headers.length - 1
                              ? `1px solid ${isUser ? "rgba(255,255,255,0.1)" : colors.border.light}`
                              : "none",
                        }}
                      >
                        {renderInline(header, citations, isUser)}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {rows.map((row, rIdx) => (
                    <Box
                      key={rIdx}
                      component="tr"
                      sx={{
                        bgcolor:
                          rIdx % 2 === 1
                            ? isUser
                              ? "rgba(255, 255, 255, 0.04)"
                              : "rgba(255, 255, 255, 0.015)"
                            : "transparent",
                        borderBottom:
                          rIdx < rows.length - 1
                            ? `1px solid ${isUser ? "rgba(255,255,255,0.1)" : colors.border.light}`
                            : "none",
                        transition: "background-color 0.15s ease",
                        "&:hover": {
                          bgcolor: isUser
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(99, 102, 241, 0.08)",
                        },
                      }}
                    >
                      {row.map((cell, cIdx) => (
                        <Box
                          key={cIdx}
                          component="td"
                          sx={{
                            px: 2,
                            py: 1.25,
                            color: isUser ? colors.text.inverse : colors.text.secondary,
                            lineHeight: 1.6,
                            textAlign: alignments[cIdx] || "left",
                            borderRight:
                              cIdx < row.length - 1
                                ? `1px solid ${isUser ? "rgba(255,255,255,0.08)" : colors.border.light}`
                                : "none",
                          }}
                        >
                          {renderInline(cell, citations, isUser)}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          );
          continue;
        }

        // Horizontal rules / markdown separators
        if (trimmed.match(/^(={3,}|-{3,}|_{3,}|\*{3,})$/)) {
          elements.push(
            <Box
              key={key}
              sx={{
                height: "1px",
                bgcolor: isUser ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.08)",
                my: 2,
                width: "100%",
              }}
            />
          );
          i++;
          continue;
        }

        // Ignore empty / stray hash-only or divider lines
        if (/^#{1,6}\s*$/.test(trimmed)) {
          i++;
          continue;
        }

        const headingColor = isUser ? colors.text.inverse : colors.text.primary;
        const mutedColor = isUser ? "rgba(255, 255, 255, 0.7)" : colors.text.tertiary;

        // Headings (from h6 to h1, with or without trailing space after #)
        const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingContent = headingMatch[2].trim();

          if (level === 6) {
            elements.push(
              <Typography key={key} variant="caption" sx={{ display: "block", fontWeight: 700, mt: 1.2, mb: 0.3, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {renderInline(headingContent, citations, isUser)}
              </Typography>
            );
          } else if (level === 5) {
            elements.push(
              <Typography key={key} sx={{ fontWeight: 700, mt: 1.4, mb: 0.4, color: headingColor, fontSize: "0.85rem" }}>
                {renderInline(headingContent, citations, isUser)}
              </Typography>
            );
          } else if (level === 4) {
            elements.push(
              <Typography key={key} sx={{ fontWeight: 700, mt: 1.6, mb: 0.4, color: headingColor, fontSize: "0.92rem" }}>
                {renderInline(headingContent, citations, isUser)}
              </Typography>
            );
          } else if (level === 3) {
            elements.push(
              <Typography key={key} variant="subtitle1" sx={{ fontWeight: 700, mt: 1.8, mb: 0.5, color: headingColor, fontSize: "1rem" }}>
                {renderInline(headingContent, citations, isUser)}
              </Typography>
            );
          } else if (level === 2) {
            elements.push(
              <Typography key={key} variant="h6" sx={{ fontWeight: 700, mt: 2.2, mb: 0.75, color: headingColor, fontSize: "1.08rem" }}>
                {renderInline(headingContent, citations, isUser)}
              </Typography>
            );
          } else {
            elements.push(
              <Typography key={key} variant="h5" sx={{ fontWeight: 800, mt: 2.5, mb: 1, color: headingColor, fontSize: "1.22rem" }}>
                {renderInline(headingContent, citations, isUser)}
              </Typography>
            );
          }
          i++;
          continue;
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          elements.push(
            <Box
              key={key}
              sx={{
                borderLeft: `3px solid ${isUser ? colors.text.inverse : colors.primary.main}`,
                bgcolor: isUser ? "rgba(255, 255, 255, 0.1)" : `${colors.primary.bg}CC`,
                pl: 1.5,
                py: 0.6,
                my: 0.8,
                borderRadius: "0 2px 2px 0",
              }}
            >
              <Typography variant="body2" sx={{ color: isUser ? colors.text.inverse : colors.text.secondary, fontStyle: "italic", lineHeight: 1.6 }}>
                {renderInline(trimmed.slice(2), citations, isUser)}
              </Typography>
            </Box>
          );
          i++;
          continue;
        }

        // Numbered lists: 1. , 2. , etc.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const [, num, itemContent] = numMatch;
          elements.push(
            <Box key={key} sx={{ display: "flex", alignItems: "flex-start", gap: 1, my: 0.4, pl: 0.5 }}>
              <Box component="span" sx={{ color: isUser ? "#ffffff" : "#818cf8", fontWeight: 700, flexShrink: 0, fontSize: "0.85rem", minWidth: "1.3em" }}>
                {num}.
              </Box>
              <Typography variant="body2" sx={{ color: isUser ? "#ffffff" : "#f1f5f9", lineHeight: 1.7, fontSize: "0.875rem" }}>
                {renderInline(itemContent, citations, isUser)}
              </Typography>
            </Box>
          );
          i++;
          continue;
        }

        // Bullet points: - , * , + , •
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ") || trimmed.startsWith("• ")) {
          const content = trimmed.replace(/^[-*+•]\s+/, "");
          elements.push(
            <Box key={key} sx={{ display: "flex", alignItems: "flex-start", gap: 1, my: 0.4, pl: 0.5 }}>
              <Box
                component="span"
                sx={{
                  color: isUser ? "#ffffff" : "#818cf8",
                  mt: "2px",
                  flexShrink: 0,
                  fontSize: "1rem",
                  lineHeight: 1,
                }}
              >
                •
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: isUser ? "#ffffff" : "#e2e8f0",
                  lineHeight: 1.7,
                  fontSize: "0.875rem",
                }}
              >
                {renderInline(content, citations, isUser)}
              </Typography>
            </Box>
          );
          i++;
          continue;
        }

        // Spacing line
        if (!trimmed) {
          elements.push(<Box key={key} sx={{ height: 6 }} />);
          i++;
          continue;
        }

        // Standard Paragraph
        elements.push(
          <Typography
            key={key}
            variant="body2"
            sx={{
              my: 0.35,
              color: isUser ? "#ffffff" : "#e2e8f0",
              lineHeight: 1.7,
              fontSize: "0.875rem",
              fontWeight: isUser ? 450 : 400,
            }}
          >
            {renderInline(line, citations, isUser)}
          </Typography>
        );
        i++;
      }

      return elements;
    });
  };

  const renderInline = (text: string, citations?: Citation[], isUser = false) => {
    return text.split(/(\[\d+\]|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((part, i) => {
      if (!part) return null;
      const citeMatch = part.match(/^\[(\d+)\]$/);
      if (citeMatch) {
        const citeIndex = parseInt(citeMatch[1], 10) - 1;
        const cite = citations?.[citeIndex];
        return (
          <Box
            key={i}
            component="button"
            onClick={() => cite && onCitationClick(cite)}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 0.9,
              py: 0.2,
              mx: 0.25,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: isUser ? "#ffffff" : "#818cf8",
              bgcolor: isUser ? "rgba(255, 255, 255, 0.2)" : "rgba(99, 102, 241, 0.15)",
              border: isUser ? "1px solid rgba(255, 255, 255, 0.45)" : "1px solid rgba(99, 102, 241, 0.35)",
              borderRadius: 1.2,
              cursor: "pointer",
              verticalAlign: "middle",
              transition: "all 0.15s ease",
              "&:hover": {
                bgcolor: isUser ? "rgba(255, 255, 255, 0.3)" : "rgba(99, 102, 241, 0.25)",
                borderColor: isUser ? "rgba(255, 255, 255, 0.7)" : "#818cf8",
                transform: "translateY(-1px)",
              },
            }}
          >
            {cite ? `📄 ${cite.doc_name} #${cite.chunk_index}` : part}
          </Box>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Box
            key={i}
            component="strong"
            sx={{
              fontWeight: 700,
              color: isUser ? "#ffffff" : "#ffffff",
            }}
          >
            {part.slice(2, -2)}
          </Box>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <Box
            key={i}
            component="em"
            sx={{
              fontStyle: "italic",
              color: isUser ? "#ffffff" : "#cbd5e1",
            }}
          >
            {part.slice(1, -1)}
          </Box>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <Box
            key={i}
            component="code"
            sx={{
              fontFamily: '"JetBrains Mono", Consolas, monospace',
              fontSize: "0.78rem",
              px: 0.8,
              py: 0.2,
              bgcolor: isUser ? "rgba(255, 255, 255, 0.18)" : "rgba(30, 41, 59, 0.8)",
              color: isUser ? "#ffffff" : "#38bdf8",
              borderRadius: 1,
              border: isUser ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {part.slice(1, -1)}
          </Box>
        );
      }
      return part;
    });
  };

  const activeProvidersList: string[] = [];
  if (stats?.has_nvidia) activeProvidersList.push("NVIDIA NIM");
  if (stats?.has_openrouter) activeProvidersList.push("OpenRouter");
  if (stats?.has_groq) activeProvidersList.push("Groq");
  if (stats?.has_gemini) activeProvidersList.push("Gemini");
  const providerLabel = "⚡ High-Speed AI Engine";
  const userName = currentUser?.name ? currentUser.name.split(" ")[0] : "Explorer";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative", bgcolor: "#0b0f19" }}>
      {/* Top Application Bar */}
      <Box
        sx={{
          px: 3,
          py: 1.25,
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
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#f8fafc" }}>
              Knowledge Assistant
            </Typography>
            <Chip
              icon={<FiberManualRecordIcon sx={{ fontSize: "6px !important", color: "#10b981 !important" }} />}
              label="Live Grounding"
              size="small"
              sx={{
                bgcolor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                fontSize: "0.62rem",
                height: 20,
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={<FiberManualRecordIcon sx={{ fontSize: "6px !important", color: "#818cf8 !important" }} />}
            label={providerLabel}
            size="small"
            sx={{
              bgcolor: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              color: "#818cf8",
              fontSize: "0.68rem",
              fontWeight: 600,
              height: 24,
            }}
          />

          {messages.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Export conversation to Markdown">
                <IconButton
                  size="small"
                  onClick={handleExportChat}
                  sx={{ color: "#94a3b8", p: 0.5, "&:hover": { color: "#f8fafc", bgcolor: "rgba(255,255,255,0.06)" } }}
                >
                  <FileDownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear chat history">
                <IconButton
                  size="small"
                  onClick={handleClearChat}
                  sx={{ color: "#94a3b8", p: 0.5, "&:hover": { color: "#f43f5e", bgcolor: "rgba(244,63,94,0.1)" } }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {onOpenSettings && (
            <Tooltip title="RAG & Search Settings">
              <IconButton
                size="small"
                onClick={onOpenSettings}
                sx={{ color: "#94a3b8", p: 0.5, "&:hover": { color: "#f8fafc", bgcolor: "rgba(255,255,255,0.06)" } }}
              >
                <SettingsIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* AI Persona Selector Bar */}
      <Box
        sx={{
          px: 3,
          py: 1,
          bgcolor: "#0e1320",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: 1,
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 0.5, color: "#94a3b8" }}>
          <PsychologyIcon sx={{ fontSize: 16, color: "#818cf8" }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#cbd5e1" }}>
            AI Persona:
          </Typography>
        </Box>

        {PERSONAS.map((p) => {
          const isSelected = currentPersona === p.id;
          return (
            <Tooltip key={p.id} title={`${p.name}: ${p.tagline}`} arrow>
              <Chip
                icon={p.icon}
                label={p.name}
                size="small"
                onClick={() => {
                  if (p.id === "custom") {
                    setTempCustomText(customPersonaText);
                    setIsCustomModalOpen(true);
                  } else {
                    setCurrentPersona(p.id);
                  }
                }}
                sx={{
                  height: 28,
                  fontSize: "0.72rem",
                  fontWeight: isSelected ? 700 : 500,
                  bgcolor: isSelected ? "#06b6d4" : "#0f172a",
                  color: isSelected ? "#ffffff" : "#94a3b8",
                  border: isSelected ? "1px solid #0891b2" : "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: isSelected ? "0 2px 10px rgba(6, 182, 212, 0.35)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "& .MuiChip-icon": {
                    color: isSelected ? "#ffffff !important" : "#64748b !important",
                  },
                  "&:hover": {
                    bgcolor: isSelected ? "#0891b2" : "rgba(255, 255, 255, 0.06)",
                    borderColor: isSelected ? "#0891b2" : "rgba(6, 182, 212, 0.4)",
                    color: isSelected ? "#ffffff" : "#f8fafc",
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* Grounded Document Context Ribbon */}
      <Box
        sx={{
          px: 3,
          py: 0.8,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          bgcolor: "rgba(14, 19, 32, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <MenuBookIcon sx={{ fontSize: 15, color: "#818cf8" }} />
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>
              Knowledge Base:{" "}
              <Box component="span" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                {documentsCount} Document{documentsCount !== 1 ? "s" : ""}
              </Box>
              {" • "}
              <Box component="span" sx={{ color: "#818cf8", fontWeight: 600 }}>
                {documents ? documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0) : (stats?.total_chunks ?? 0)} Passages
              </Box>
            </Typography>
          </Box>

          {/* Document Scope Selector Button */}
          <Tooltip title="Filter queries to specific document(s) or all documents">
            <Chip
              icon={
                selectedDocScope.length > 0 ? (
                  <AlternateEmailIcon sx={{ fontSize: 13, color: "#38bdf8 !important" }} />
                ) : (
                  <SearchIcon sx={{ fontSize: 13, color: "#94a3b8 !important" }} />
                )
              }
              deleteIcon={selectedDocScope.length > 0 ? <CloseIcon sx={{ fontSize: 12 }} /> : undefined}
              onDelete={selectedDocScope.length > 0 ? () => setSelectedDocScope([]) : undefined}
              label={
                selectedDocScope.length === 0
                  ? "Scope: All Documents"
                  : selectedDocScope.length === 1
                  ? `Scope: ${selectedDocScope[0].doc_name}`
                  : `Scope: ${selectedDocScope.length} Documents`
              }
              size="small"
              onClick={(e) => setScopeMenuAnchorEl(e.currentTarget)}
              sx={{
                height: 24,
                fontSize: "0.7rem",
                fontWeight: 600,
                cursor: "pointer",
                bgcolor: selectedDocScope.length > 0 ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.05)",
                color: selectedDocScope.length > 0 ? "#38bdf8" : "#94a3b8",
                border: `1px solid ${selectedDocScope.length > 0 ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                "&:hover": {
                  bgcolor: selectedDocScope.length > 0 ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.1)",
                },
              }}
            />
          </Tooltip>

          <Menu
            anchorEl={scopeMenuAnchorEl}
            open={Boolean(scopeMenuAnchorEl)}
            onClose={() => setScopeMenuAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  mt: 0.5,
                  maxHeight: 340,
                  width: 320,
                  bgcolor: "#111827",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  borderRadius: 2,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc" }}>
                Target Query Scope
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                Choose which document(s) to ground AI responses in
              </Typography>
            </Box>

            <MenuItem
              onClick={() => {
                setSelectedDocScope([]);
                setScopeMenuAnchorEl(null);
              }}
              selected={selectedDocScope.length === 0}
              sx={{
                fontSize: "0.78rem",
                display: "flex",
                justifyContent: "space-between",
                color: selectedDocScope.length === 0 ? "#818cf8" : "#f8fafc",
                py: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ArticleIcon sx={{ fontSize: 16, color: "#818cf8" }} />
                <span>All Documents (Corpus)</span>
              </Box>
              {selectedDocScope.length === 0 && <CheckIcon sx={{ fontSize: 15, color: "#818cf8" }} />}
            </MenuItem>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)", my: 0.5 }} />

            {(documents || []).map((doc: DocumentItem) => {
              const isSelected = selectedDocScope.some((d) => d.doc_id === doc.doc_id);
              return (
                <MenuItem
                  key={doc.doc_id}
                  onClick={() => handleToggleDocScope(doc)}
                  selected={isSelected}
                  sx={{
                    fontSize: "0.78rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.8,
                    color: isSelected ? "#38bdf8" : "#cbd5e1",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden", pr: 1 }}>
                    {getDocIcon(doc.doc_name)}
                    <Typography
                      noWrap
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: isSelected ? 700 : 500,
                        maxWidth: 200,
                      }}
                    >
                      {doc.doc_name}
                    </Typography>
                  </Box>
                  {isSelected && <CheckIcon sx={{ fontSize: 15, color: "#38bdf8", flexShrink: 0 }} />}
                </MenuItem>
              );
            })}
          </Menu>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <TuneIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>
            Hybrid α={alpha.toFixed(2)} • Top-K={topK}
          </Typography>
        </Box>
      </Box>

      {/* Main Workspace Stream Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 2, md: 4 },
          py: 2.5,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#1e293b", borderRadius: 2 },
        }}
      >
        {isLoadingChat ? (
          <Box sx={{ my: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
            <CircularProgress size={32} sx={{ color: "#06b6d4" }} />
            <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>Loading conversation from database...</Typography>
          </Box>
        ) : messages.length === 0 ? (
          /* Enterprise AI Studio Launchpad */
          <Box sx={{ my: "auto", maxWidth: 840, mx: "auto", width: "100%", py: 2 }}>
            {/* Ambient Hero Greeting */}
            <Box sx={{ textAlign: "center", mb: 3.5 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 50,
                  height: 50,
                  borderRadius: 2,
                  bgcolor: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.35)",
                  boxShadow: "0 4px 16px rgba(99, 102, 241, 0.25)",
                  mb: 1.75,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 26, color: "#818cf8" }} />
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#f8fafc",
                  fontSize: { xs: "1.5rem", md: "1.85rem" },
                  mb: 1,
                }}
              >
                What would you like to explore, {userName}?
              </Typography>

              <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: 620, mx: "auto" }}>
                Ask questions across your {documentsCount} uploaded document{documentsCount !== 1 ? "s" : ""}. Answers are analyzed by{" "}
                <Box component="span" sx={{ color: "#818cf8", fontWeight: 700 }}>
                  {PERSONAS.find((p) => p.id === currentPersona)?.name}
                </Box>{" "}
                and grounded with semantic search, keyword indexing, and real-time citations.
              </Typography>
            </Box>

            {/* 2x2 Feature Capability Cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              {quickActions.map((action, i) => (
                <Box
                  key={i}
                  onClick={() => handleSendMessage(action.prompt)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      borderColor: "#06b6d4",
                      boxShadow: "0 8px 24px rgba(6, 182, 212, 0.25)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1.8,
                          bgcolor: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Chip
                        label={action.badge}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.58rem",
                          fontWeight: 700,
                          bgcolor: `${action.badgeColor}20`,
                          color: action.badgeColor,
                          border: `1px solid ${action.badgeColor}40`,
                        }}
                      />
                    </Box>
                    <SendIcon sx={{ fontSize: 13, color: "#64748b" }} />
                  </Box>

                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", mb: 0.4 }}>
                    {action.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.5 }}>
                    {action.subtitle}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Quick Suggestion Pills */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
              {quickPills.map((pill, idx) => (
                <Chip
                  key={idx}
                  label={pill.label}
                  onClick={() => handleSendMessage(pill.prompt)}
                  sx={{
                    bgcolor: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "#94a3b8",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    height: 28,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: "rgba(6, 182, 212, 0.15)",
                      borderColor: "rgba(6, 182, 212, 0.4)",
                      color: "#22d3ee",
                      transform: "translateY(-1px)",
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          /* Active Conversation Stream */
          <Stack spacing={3} sx={{ maxWidth: 840, mx: "auto", width: "100%", py: 1 }}>
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar */}
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    background: msg.role === "user" ? "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)" : "#0f172a",
                    border: `1px solid ${msg.role === "user" ? "rgba(6, 182, 212, 0.4)" : "rgba(255, 255, 255, 0.12)"}`,
                    color: msg.role === "user" ? "#ffffff" : "#22d3ee",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  {msg.role === "user" ? (
                    <PersonIcon sx={{ fontSize: 17, color: "#ffffff" }} />
                  ) : (
                    <SmartToyIcon sx={{ fontSize: 17, color: "#22d3ee" }} />
                  )}
                </Avatar>

                {/* Message Bubble */}
                <Box
                  sx={{
                    maxWidth: "85%",
                    p: 2.2,
                    borderRadius: 2,
                    background: msg.role === "user" ? "linear-gradient(135deg, #0891b2 0%, #2563eb 100%)" : "#0f172a",
                    color: msg.role === "user" ? "#ffffff" : "#f8fafc",
                    border: `1px solid ${msg.role === "user" ? "rgba(6, 182, 212, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                    boxShadow: msg.role === "user" ? "0 4px 16px rgba(6, 182, 212, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.35)",
                  }}
                >
                  {msg.role === "user" && msg.scopedDocs && msg.scopedDocs.length > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 1, flexWrap: "wrap" }}>
                      <Chip
                        icon={<AlternateEmailIcon sx={{ fontSize: 13, color: "rgba(255,255,255,0.9) !important" }} />}
                        label={`Scoped to: ${msg.scopedDocs.join(", ")}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          bgcolor: "rgba(0, 0, 0, 0.25)",
                          color: "#ffffff",
                          border: "1px solid rgba(255, 255, 255, 0.25)",
                          "& .MuiChip-label": { px: 0.8 },
                        }}
                      />
                    </Box>
                  )}
                  <Box>
                    {msg.content ? (
                      renderFormattedMarkdown(msg.content, msg.citations, msg.role === "user")
                    ) : msg.isStreaming ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.5, px: 0.25 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: "#818cf8",
                              animation: "pulseDot 1.4s ease-in-out infinite",
                              "@keyframes pulseDot": {
                                "0%, 100%": { transform: "scale(0.7)", opacity: 0.3 },
                                "50%": { transform: "scale(1.2)", opacity: 1 },
                              },
                            }}
                          />
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: "#818cf8",
                              animation: "pulseDot 1.4s ease-in-out 0.2s infinite",
                            }}
                          />
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: "#818cf8",
                              animation: "pulseDot 1.4s ease-in-out 0.4s infinite",
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic" }}>
                          Synthesizing response ({PERSONAS.find((p) => p.id === currentPersona)?.name})...
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                  {msg.isStreaming && msg.content && (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: "2px",
                        height: "1.1em",
                        bgcolor: "#818cf8",
                        ml: 0.5,
                        animation: "blink 1s step-end infinite",
                        "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
                        verticalAlign: "middle",
                      }}
                    />
                  )}

                  {/* Assistant Footer Metadata */}
                  {!msg.isStreaming && msg.role === "assistant" && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mt: 1.5,
                        pt: 1.25,
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                        <DeveloperBoardIcon sx={{ fontSize: 13, color: "#818cf8" }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.68rem", color: "#818cf8" }}>
                          {msg.model || "Local Synthesizer"}
                        </Typography>
                      </Box>
                      {msg.latency !== undefined && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <AccessTimeIcon sx={{ fontSize: 13, color: "#94a3b8" }} />
                          <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                            {msg.latency}s
                          </Typography>
                        </Box>
                      )}
                      {msg.citations && msg.citations.length > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <BoltIcon sx={{ fontSize: 13, color: "#f59e0b" }} />
                          <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                            {msg.citations.length} Chunks
                          </Typography>
                        </Box>
                      )}
                      {msg.confidence !== undefined && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <CheckCircleIcon sx={{ fontSize: 13, color: "#10b981" }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.68rem", color: "#10b981" }}>
                            {Math.round(msg.confidence * 100)}% Confidence
                          </Typography>
                        </Box>
                      )}
                      <Tooltip title="Copy response text">
                        <Button
                          size="small"
                          startIcon={
                            copiedId === msg.id ? (
                              <CheckIcon sx={{ fontSize: 12, color: "#10b981" }} />
                            ) : (
                              <ContentCopyIcon sx={{ fontSize: 12 }} />
                            )
                          }
                          onClick={() => handleCopy(msg.content, msg.id)}
                          sx={{
                            ml: "auto",
                            fontSize: "0.65rem",
                            py: 0.2,
                            px: 0.8,
                            minWidth: 0,
                            color: copiedId === msg.id ? "#10b981" : "#94a3b8",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: 1.2,
                            bgcolor: "rgba(255, 255, 255, 0.03)",
                            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", color: "#f8fafc" },
                          }}
                        >
                          {copiedId === msg.id ? "Copied" : "Copy"}
                        </Button>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Floating Prompt Composer */}
      <Box
        sx={{
          px: 3,
          pb: 2.5,
          flexShrink: 0,
          maxWidth: 840,
          mx: "auto",
          width: "100%",
          position: "relative",
        }}
      >
        {/* Floating @ Mention Autocomplete Popover */}
        {isMentionOpen && filteredMentionDocs.length > 0 && (
          <Paper
            elevation={12}
            sx={{
              position: "absolute",
              bottom: "100%",
              left: 24,
              right: 24,
              mb: 1.5,
              maxHeight: 280,
              overflowY: "auto",
              bgcolor: "#0f172a",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: 2,
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.75)",
              zIndex: 100,
              p: 1,
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 0.8,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <AlternateEmailIcon sx={{ fontSize: 14, color: "#818cf8" }} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#f8fafc" }}>
                  Attach Document Scope ({filteredMentionDocs.length} match{filteredMentionDocs.length !== 1 ? "es" : ""})
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "0.65rem", color: "#64748b" }}>
                ↑↓ to navigate • Enter to attach • Esc to dismiss
              </Typography>
            </Box>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {filteredMentionDocs.map((doc: DocumentItem, idx: number) => {
                const isHighlighted = idx === mentionHighlightIndex;
                const isAlreadySelected = selectedDocScope.some((d) => d.doc_id === doc.doc_id);
                return (
                  <Box
                    key={doc.doc_id}
                    onClick={() => handleSelectMentionDoc(doc)}
                    onMouseEnter={() => setMentionHighlightIndex(idx)}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: isHighlighted ? "rgba(99, 102, 241, 0.22)" : isAlreadySelected ? "rgba(56, 189, 248, 0.08)" : "transparent",
                      border: `1px solid ${isHighlighted ? "rgba(99, 102, 241, 0.5)" : "transparent"}`,
                      transition: "all 0.12s ease",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, overflow: "hidden", pr: 1 }}>
                      {getDocIcon(doc.doc_name)}
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography noWrap sx={{ fontSize: "0.82rem", fontWeight: 600, color: isHighlighted ? "#ffffff" : "#e2e8f0" }}>
                          {doc.doc_name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                          {doc.chunk_count ? `${doc.chunk_count} passages` : "Ready for querying"} • {doc.char_count ? `${doc.char_count} chars` : "Document"}
                        </Typography>
                      </Box>
                    </Box>
                    {isAlreadySelected ? (
                      <Chip
                        label="Attached"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          bgcolor: "rgba(56, 189, 248, 0.2)",
                          color: "#38bdf8",
                          border: "1px solid rgba(56, 189, 248, 0.4)",
                        }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: "0.7rem", color: "#818cf8", fontWeight: 600, flexShrink: 0 }}>
                        Attach ↵
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        )}

        {/* Attached Document Scope Chips */}
        {selectedDocScope.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mb: 1,
              flexWrap: "wrap",
              px: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#38bdf8", mr: 0.5 }}>
              <AlternateEmailIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#38bdf8" }}>
                Target Documents:
              </Typography>
            </Box>
            {selectedDocScope.map((doc) => (
              <Chip
                key={doc.doc_id}
                icon={getDocIcon(doc.doc_name)}
                label={doc.doc_name}
                size="small"
                onDelete={() => handleRemoveDocScope(doc.doc_id)}
                sx={{
                  height: 24,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  bgcolor: "rgba(56, 189, 248, 0.12)",
                  color: "#e0f2fe",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  "& .MuiChip-deleteIcon": {
                    color: "#38bdf8",
                    fontSize: 14,
                    "&:hover": { color: "#f43f5e" },
                  },
                }}
              />
            ))}
            <Button
              size="small"
              onClick={() => setSelectedDocScope([])}
              sx={{
                fontSize: "0.68rem",
                color: "#94a3b8",
                minWidth: 0,
                px: 1,
                py: 0.2,
                "&:hover": { color: "#f43f5e" },
              }}
            >
              Clear Scope (Search All)
            </Button>
          </Box>
        )}

        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: "#0f172a",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            "&:focus-within": {
              borderColor: "#06b6d4",
              boxShadow: "0 8px 32px rgba(6, 182, 212, 0.28)",
            },
            transition: "all 0.2s ease",
          }}
        >
          <TextField
            multiline
            maxRows={6}
            fullWidth
            variant="standard"
            placeholder={
              selectedDocScope.length > 0
                ? `Ask from ${selectedDocScope.map((d) => d.doc_name).join(", ")}... (Shift+Enter for newline)`
                : `Ask a question (type @ to scope to specific doc)... (Shift+Enter for newline)`
            }
            value={inputQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  fontSize: "0.875rem",
                  color: "#f8fafc",
                  px: 0.5,
                  "& textarea::placeholder": { color: "#64748b" },
                },
              },
            }}
          />
          {isStreaming ? (
            <Tooltip title="Stop generating (Pause)">
              <IconButton
                type="button"
                onClick={handleStopStreaming}
                sx={{
                  bgcolor: "#f43f5e",
                  color: "#ffffff",
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  boxShadow: "0 0 14px rgba(244, 63, 94, 0.45)",
                  "&:hover": { bgcolor: "#e11d48", transform: "scale(1.05)" },
                  transition: "all 0.18s ease",
                }}
              >
                <StopRoundedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Send Query (Enter)">
              <span>
                <IconButton
                  type="submit"
                  disabled={!inputQuery.trim()}
                  sx={{
                    background: inputQuery.trim() ? "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)" : "#1e293b",
                    color: inputQuery.trim() ? "#ffffff" : "#64748b",
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    boxShadow: inputQuery.trim() ? "0 2px 10px rgba(6, 182, 212, 0.35)" : "none",
                    "&:hover": {
                      background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
                      color: "#ffffff",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <SendIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>

        {/* Footer info line */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75, px: 1 }}>
          <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "#64748b" }}>
            Persona: <Box component="span" sx={{ color: "#22d3ee", fontWeight: 600 }}>{PERSONAS.find((p) => p.id === currentPersona)?.name}</Box> • Grounded Hybrid Retrieval (α={alpha.toFixed(2)}, Top-K={topK})
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FiberManualRecordIcon sx={{ fontSize: "5px", color: telemetryStatus.includes("error") ? "#f43f5e" : "#10b981" }} />
            <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
              {telemetryStatus}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Custom Persona Configuration Modal */}
      <Dialog
        open={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              p: 1,
              bgcolor: "#0f172a",
              border: "1px solid rgba(6, 182, 212, 0.25)",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#f8fafc", pb: 0.5 }}>
          ⚙️ Configure Custom AI Persona
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8", mb: 2 }}>
            Define custom system instructions for how the AI assistant should analyze context, tone its answers, format output, and prioritize insights.
          </Typography>
          <TextField
            multiline
            rows={5}
            fullWidth
            placeholder="e.g. You are a Chief Technology Officer. Explain all concepts in terms of enterprise ROI, cloud cost optimization, and SOC2 compliance with executive summary bullet points."
            value={tempCustomText}
            onChange={(e) => setTempCustomText(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                fontSize: "0.85rem",
                bgcolor: "#0b1120",
                color: "#f8fafc",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
                "&:hover fieldset": { borderColor: "rgba(6, 182, 212, 0.3)" },
                "&.Mui-focused fieldset": { borderColor: "#06b6d4" },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCustomModalOpen(false)} sx={{ color: "#94a3b8" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCustomPersona}
            sx={{
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
              },
            }}
          >
            Apply Persona
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Chat Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearConfirmOpen}
        title="Clear Conversation"
        message="Are you sure you want to clear this active chat screen? Any unsaved conversation messages in this view will be reset."
        confirmText="Clear Messages"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmClearChat}
        onClose={() => setIsClearConfirmOpen(false)}
      />
    </Box>
  );
};
