import React, { useState, useEffect, useCallback } from "react";
import { Box } from "@mui/material";
import type { Stats, DocumentItem, ChunkDetail, Citation, User, ChatSession } from "./types/rag";
import {
  fetchStats,
  fetchDocuments,
  fetchDocumentChunks,
  deleteDocument,
  uploadDocuments,
  fetchCurrentUser,
  clearAuthToken,
  fetchUserChats,
  deleteChatSession,
} from "./services/api";

import { LandingPage } from "./components/LandingPage";
import { Sidebar } from "./components/Sidebar";
import { DocumentsPage } from "./components/DocumentsPage";
import { ChatView } from "./components/ChatView";
import { VectorPlayground } from "./components/VectorPlayground";
import { ChunkModal } from "./components/ChunkModal";
import { CitationModal } from "./components/CitationModal";
import { SettingsModal } from "./components/SettingsModal";
import { AuthModal } from "./components/AuthModal";
import { BillingPage } from "./components/BillingPage";
import { PricingModal } from "./components/PricingModal";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { DocumentViewerModal } from "./components/DocumentViewerModal";
import { PlasmaLoader } from "./components/PlasmaLoader";

const SIDEBAR_WIDTH = 300;

export const App: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"documents" | "chat" | "playground" | "assets" | "billing">("chat");
  const [topK, setTopK] = useState(4);
  const [alpha, setAlpha] = useState(0.65);
  const [telemetryStatus, setTelemetryStatus] = useState("Ready");

  // Modals state
  const [isChunkModalOpen, setIsChunkModalOpen] = useState(false);
  const [inspectDocName, setInspectDocName] = useState("");
  const [inspectChunks, setInspectChunks] = useState<ChunkDetail[]>([]);
  const [isChunksLoading, setIsChunksLoading] = useState(false);

  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Custom Confirmation Modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const refreshStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  const refreshDocuments = useCallback(async (user: User | null) => {
    if (!user) {
      setDocuments([]);
      return;
    }
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  }, []);

  const refreshChats = useCallback(async (user: User | null) => {
    if (!user) {
      setChatSessions([]);
      return;
    }
    try {
      const chats = await fetchUserChats();
      setChatSessions(chats);
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
        await refreshStats();
        if (user) {
          await refreshDocuments(user);
          await refreshChats(user);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsAuthChecking(false);
      }
    };
    initApp();
  }, [refreshStats, refreshDocuments, refreshChats]);

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    await refreshStats();
    await refreshDocuments(user);
    await refreshChats(user);
    setActiveTab("chat");
  };

  const handleLogout = () => {
    setConfirmModalState({
      isOpen: true,
      title: "Sign Out",
      message: "Are you sure you want to sign out of your account? Your current active session will be ended.",
      confirmText: "Sign Out",
      cancelText: "Cancel",
      variant: "warning",
      onConfirm: () => {
        clearAuthToken();
        setCurrentUser(null);
        setDocuments([]);
        setChatSessions([]);
        setActiveChatId(null);
        setStats((prev) => (prev ? { ...prev, total_documents: 0, total_chunks: 0 } : null));
        setTelemetryStatus("Logged out");
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStatusText("Connecting & starting upload...");
    setTelemetryStatus("Uploading & indexing document passages...");
    try {
      await uploadDocuments(files, (progress, statusText) => {
        setUploadProgress(progress);
        setUploadStatusText(statusText);
      });
      await refreshDocuments(currentUser);
      await refreshStats();
      setTelemetryStatus("Ready");
    } catch (err) {
      console.error("Upload error:", err);
      setTelemetryStatus("Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  const handleDeleteDoc = (docId: string) => {
    const targetDoc = documents.find((d) => d.doc_id === docId);
    const docName = targetDoc ? targetDoc.doc_name : "this document";
    setConfirmModalState({
      isOpen: true,
      title: "Delete Document",
      message: `Are you sure you want to permanently delete "${docName}"? All indexed passages, search embeddings, and original documents will be permanently removed.`,
      confirmText: "Delete Permanently",
      variant: "danger",
      onConfirm: async () => {
        try {
          setConfirmModalState((prev) => ({ ...prev, isLoading: true }));
          await deleteDocument(docId);
          await refreshDocuments(currentUser);
          await refreshStats();
          setTelemetryStatus("Document successfully deleted from knowledge base");
          setConfirmModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          console.error("Delete error:", err);
          setConfirmModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      },
    });
  };

  const handleInspectDoc = async (docId: string, docName: string) => {
    setInspectDocName(docName);
    setIsChunkModalOpen(true);
    setIsChunksLoading(true);
    try {
      const chunks = await fetchDocumentChunks(docId);
      setInspectChunks(chunks);
    } catch (err) {
      console.error("Inspect error:", err);
    } finally {
      setIsChunksLoading(false);
    }
  };

  // Chat sessions management
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setActiveTab("chat");
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setActiveTab("chat");
  };

  const handleDeleteChat = (chatId: string) => {
    const chat = chatSessions.find((c) => c.id === chatId);
    const chatTitle = chat ? `"${chat.title}"` : "this conversation";
    setConfirmModalState({
      isOpen: true,
      title: "Delete Conversation",
      message: `Are you sure you want to delete ${chatTitle}? All messages, references, and citations in this chat session will be removed from your database.`,
      confirmText: "Delete Chat",
      variant: "danger",
      onConfirm: async () => {
        try {
          setConfirmModalState((prev) => ({ ...prev, isLoading: true }));
          await deleteChatSession(chatId);
          if (activeChatId === chatId) {
            setActiveChatId(null);
          }
          if (currentUser) {
            await refreshChats(currentUser);
          }
          setTelemetryStatus("Chat deleted");
          setConfirmModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          console.error("Failed to delete chat:", err);
          setConfirmModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      },
    });
  };

  const handleChatCreatedOrUpdated = (updatedSession: ChatSession) => {
    setActiveChatId(updatedSession.id);
    if (currentUser) {
      refreshChats(currentUser);
    }
  };

  if (isAuthChecking) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          bgcolor: "#070b14",
          gap: 3,
        }}
      >
        <PlasmaLoader size={1.2} message="Loading your knowledge space..." />
      </Box>
    );
  }

  // If not authenticated, display modern Landing Page
  if (!currentUser) {
    return (
      <>
        <LandingPage
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenPricing={() => setIsPricingOpen(true)}
          dbType={stats?.database || "MongoDB Atlas"}
          hasCloudinary={stats?.has_cloudinary}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          dbType={stats?.database || "MongoDB Atlas"}
        />
        <PricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          currentUser={currentUser}
          onPaymentSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
            refreshStats();
          }}
        />
      </>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        bgcolor: "#070b14",
      }}
    >
        {/* SlothUI Sidebar */}
        <Sidebar
          stats={stats}
          documents={documents}
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onUploadFiles={handleUploadFiles}
          onInspectDoc={handleInspectDoc}
          onDeleteDoc={handleDeleteDoc}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenPricing={() => setActiveTab("billing")}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          isUploading={isUploading}
          sidebarWidth={SIDEBAR_WIDTH}
          chats={chatSessions}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />

        {/* Main Content Workspace */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: "100vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            bgcolor: "#070b14",
          }}
        >
          {activeTab === "documents" || activeTab === "assets" ? (
            <DocumentsPage
              documents={documents}
              stats={stats}
              onUploadFiles={handleUploadFiles}
              onInspectDoc={handleInspectDoc}
              onDeleteDoc={handleDeleteDoc}
              onViewDoc={(doc) => setViewingDoc(doc)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onSwitchToChat={() => setActiveTab("chat")}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              uploadStatusText={uploadStatusText}
            />
          ) : activeTab === "chat" ? (
            <ChatView
              stats={stats}
              documents={documents}
              documentsCount={documents.length}
              currentUser={currentUser}
              topK={topK}
              alpha={alpha}
              onCitationClick={(cite) => setActiveCitation(cite)}
              telemetryStatus={telemetryStatus}
              setTelemetryStatus={setTelemetryStatus}
              onOpenSettings={() => setIsSettingsOpen(true)}
              activeChatId={activeChatId}
              onChatCreatedOrUpdated={handleChatCreatedOrUpdated}
              onNewChat={handleNewChat}
            />
          ) : activeTab === "billing" ? (
            <BillingPage
              currentUser={currentUser}
              onUserUpdated={(updatedUser) => {
                setCurrentUser(updatedUser);
                refreshStats();
              }}
              onOpenAuth={() => setIsAuthOpen(true)}
              onSwitchToChat={() => setActiveTab("chat")}
            />
          ) : (
            <VectorPlayground topK={topK} alpha={alpha} />
          )}
        </Box>

        {/* Modals */}
        <ChunkModal
          isOpen={isChunkModalOpen}
          docName={inspectDocName}
          chunks={inspectChunks}
          isLoading={isChunksLoading}
          onClose={() => setIsChunkModalOpen(false)}
        />

        <CitationModal
          citation={activeCitation}
          onClose={() => setActiveCitation(null)}
          onViewDoc={(docId, docName, cldUrl) =>
            setViewingDoc({
              doc_id: docId,
              doc_name: docName,
              filename: docName,
              cloudinary_url: cldUrl,
              file_size: 0,
              chunk_count: 0,
              char_count: 0,
              word_count: 0,
              created_at: Date.now() / 1000,
            })
          }
        />

        {/* In-App Document / Asset Viewer Modal */}
        <DocumentViewerModal
          isOpen={!!viewingDoc}
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onSwitchToChat={() => {
            setActiveTab("chat");
          }}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          topK={topK}
          alpha={alpha}
          onUpdateParams={(newTopK, newAlpha) => {
            setTopK(newTopK);
            setAlpha(newAlpha);
          }}
          onClose={() => setIsSettingsOpen(false)}
          onRefreshStats={refreshStats}
        />

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          dbType={stats?.database || "MongoDB Atlas"}
        />

        <PricingModal
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          currentUser={currentUser}
          onPaymentSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
            refreshStats();
          }}
        />

        {/* Global Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModalState.isOpen}
          title={confirmModalState.title}
          message={confirmModalState.message}
          confirmText={confirmModalState.confirmText}
          cancelText={confirmModalState.cancelText}
          variant={confirmModalState.variant}
          isLoading={confirmModalState.isLoading}
          onConfirm={confirmModalState.onConfirm}
          onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        />
      </Box>
  );
};

export default App;
