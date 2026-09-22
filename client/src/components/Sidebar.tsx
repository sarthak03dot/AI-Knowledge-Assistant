import React, { useState } from "react";
import type { Stats, DocumentItem, User, ChatSession } from "../types/rag";
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Avatar,
  TextField,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Chip,
} from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LayersIcon from "@mui/icons-material/Layers";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";

interface SidebarProps {
  stats: Stats | null;
  documents: DocumentItem[];
  currentUser: User | null;
  activeTab: "documents" | "chat" | "playground" | "assets" | "billing";
  onSelectTab: (tab: "documents" | "chat" | "playground" | "assets" | "billing") => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onInspectDoc: (docId: string, docName: string) => void;
  onDeleteDoc: (docId: string) => void;
  onOpenSettings: () => void;
  onOpenPricing?: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  isUploading: boolean;
  sidebarWidth: number;
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  currentUser,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onLogout,
  sidebarWidth,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}) => {
  const [searchVal, setSearchVal] = useState("");
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const isProfileMenuOpen = Boolean(profileAnchorEl);

  const userPlan = currentUser?.plan || "free";
  const userName = currentUser?.name || "Explorer";
  const userEmail = currentUser?.email || "user@example.com";

  // Regular primary navigation items
  const navItems: Array<{
    key: "chat" | "documents" | "playground";
    label: string;
    icon: React.ReactElement;
    badge?: string | number;
  }> = [
    {
      key: "chat" as const,
      label: "AI Assistant",
      icon: <SmartToyOutlinedIcon sx={{ fontSize: 18 }} />,
      badge: chats.length > 0 ? chats.length : undefined,
    },
    {
      key: "documents" as const,
      label: "Documents",
      icon: <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />,
      badge: documents.length > 0 ? documents.length : "0",
    },
    {
      key: "playground" as const,
      label: "Search & Knowledge Lab",
      icon: <CategoryOutlinedIcon sx={{ fontSize: 18 }} />,
    },
  ];

  const filteredChats = chats.filter((c) =>
    !searchVal ? true : c.title.toLowerCase().includes(searchVal.toLowerCase())
  );

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: sidebarWidth,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#0b1120",
          borderRight: "1px solid rgba(6, 182, 212, 0.15)",
          p: 2,
        },
      }}
    >
      {/* Brand Logo Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2, px: 0.5 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 14px rgba(6, 182, 212, 0.4)",
            flexShrink: 0,
          }}
        >
          <LayersIcon sx={{ fontSize: 19, color: "#ffffff" }} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "0.98rem",
              letterSpacing: "-0.02em",
              color: "#f8fafc",
              lineHeight: 1.2,
            }}
          >
            NexusRAG
          </Typography>
          <Typography sx={{ fontSize: "0.65rem", color: "#64748b", lineHeight: 1 }}>
            Document Intelligence
          </Typography>
        </Box>
      </Box>

      {/* New Chat Primary Action Button */}
      <Box sx={{ mb: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={onNewChat}
          sx={{
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
            color: "#ffffff",
            borderRadius: 2,
            py: 0.9,
            fontSize: "0.82rem",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "0 2px 12px rgba(6, 182, 212, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
              boxShadow: "0 4px 18px rgba(6, 182, 212, 0.5)",
            },
          }}
        >
          New Conversation
        </Button>
      </Box>

      {/* Search Input Bar */}
      <Box sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search chats & docs..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ fontSize: 16, color: "#64748b", mr: 0.75 }} />,
              sx: {
                borderRadius: 2,
                bgcolor: "#0f172a",
                fontSize: "0.8rem",
                height: 36,
                color: "#f8fafc",
                "& fieldset": { borderColor: "rgba(255, 255, 255, 0.08)" },
                "&:hover fieldset": { borderColor: "rgba(6, 182, 212, 0.3)" },
                "&.Mui-focused fieldset": { borderColor: "#06b6d4" },
              },
            },
          }}
        />
      </Box>

      {/* Navigation & Chat History Scroll Area */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          flex: 1,
          overflowY: "auto",
          pr: 0.5,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#1e293b", borderRadius: 2 },
        }}
      >
        {/* Core Navigation Items (AI Assistant, Documents, Knowledge Lab) */}
        {navItems.map((item, idx) => {
          const isActive =
            (item.key === "documents" && (activeTab === "documents" || activeTab === "assets")) ||
            (item.key === "chat" && activeTab === "chat" && !activeChatId) ||
            (item.key === "playground" && activeTab === "playground");

          return (
            <Box
              key={idx}
              onClick={() => onSelectTab(item.key)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.25,
                py: 0.85,
                borderRadius: 2,
                cursor: "pointer",
                transition: "all 0.15s ease",
                bgcolor: isActive ? "rgba(6, 182, 212, 0.15)" : "transparent",
                color: isActive ? "#22d3ee" : "#94a3b8",
                fontWeight: isActive ? 700 : 500,
                border: isActive ? "1px solid rgba(6, 182, 212, 0.35)" : "1px solid transparent",
                "&:hover": {
                  bgcolor: isActive ? "rgba(6, 182, 212, 0.22)" : "rgba(255, 255, 255, 0.04)",
                  color: isActive ? "#22d3ee" : "#f8fafc",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box sx={{ color: isActive ? "#22d3ee" : "#64748b", display: "flex" }}>
                  {item.icon}
                </Box>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: "inherit" }}>
                  {item.label}
                </Typography>
              </Box>

              {item.badge && (
                <Box
                  sx={{
                    px: 0.7,
                    py: 0.1,
                    borderRadius: 2,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: isActive ? "rgba(6, 182, 212, 0.25)" : "rgba(255, 255, 255, 0.06)",
                    color: isActive ? "#22d3ee" : "#94a3b8",
                    border: `1px solid ${isActive ? "rgba(6, 182, 212, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                  }}
                >
                  {item.badge}
                </Box>
              )}
            </Box>
          );
        })}

        {/* Chat History Section */}
        <Box sx={{ mt: 2, mb: 0.5, px: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Chat History ({filteredChats.length})
          </Typography>
        </Box>

        {filteredChats.length === 0 ? (
          <Box sx={{ px: 1.5, py: 1.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontStyle: "italic" }}>
              No previous chats saved
            </Typography>
          </Box>
        ) : (
          filteredChats.map((c) => {
            const isSelected = activeTab === "chat" && activeChatId === c.id;
            return (
              <Box
                key={c.id}
                onClick={() => onSelectChat(c.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.2,
                  py: 0.75,
                  borderRadius: 2,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  bgcolor: isSelected ? "rgba(6, 182, 212, 0.15)" : "transparent",
                  color: isSelected ? "#22d3ee" : "#cbd5e1",
                  border: isSelected ? "1px solid rgba(6, 182, 212, 0.35)" : "1px solid transparent",
                  "&:hover": {
                    bgcolor: isSelected ? "rgba(6, 182, 212, 0.22)" : "rgba(255, 255, 255, 0.04)",
                    color: isSelected ? "#22d3ee" : "#f8fafc",
                    "& .chat-del-btn": { opacity: 1 },
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                  <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 15, color: isSelected ? "#22d3ee" : "#64748b", flexShrink: 0 }} />
                  <Typography
                    noWrap
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "#22d3ee" : "#cbd5e1",
                    }}
                  >
                    {c.title || "Conversation"}
                  </Typography>
                </Box>

                <Tooltip title="Delete Chat">
                  <IconButton
                    className="chat-del-btn"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(c.id);
                    }}
                    sx={{
                      opacity: 0,
                      p: 0.25,
                      color: "#64748b",
                      transition: "opacity 0.15s ease",
                      "&:hover": { color: "#f43f5e", bgcolor: "rgba(244, 63, 94, 0.1)" },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })
        )}
      </Box>

      {/* User Profile Trigger Bar (Click to show details & account options) */}
      <Box
        onClick={handleProfileClick}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          mt: "auto",
          borderRadius: 2,
          border: isProfileMenuOpen
            ? "1px solid rgba(6, 182, 212, 0.5)"
            : "1px solid rgba(255, 255, 255, 0.08)",
          bgcolor: isProfileMenuOpen
            ? "rgba(6, 182, 212, 0.12)"
            : "rgba(255, 255, 255, 0.02)",
          cursor: "pointer",
          transition: "all 0.15s ease",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(6, 182, 212, 0.35)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: 1 }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: currentUser?.avatar_color || "#06b6d4",
              fontSize: "0.85rem",
              fontWeight: 800,
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Typography
                noWrap
                sx={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#f8fafc",
                  lineHeight: 1.2,
                }}
              >
                {userName}
              </Typography>
              <Chip
                label={userPlan.toUpperCase()}
                size="small"
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  height: 18,
                  borderRadius: 1,
                  bgcolor:
                    userPlan === "enterprise"
                      ? "rgba(139, 92, 246, 0.2)"
                      : userPlan === "pro"
                      ? "rgba(6, 182, 212, 0.2)"
                      : "rgba(148, 163, 184, 0.15)",
                  color:
                    userPlan === "enterprise"
                      ? "#a78bfa"
                      : userPlan === "pro"
                      ? "#22d3ee"
                      : "#94a3b8",
                  border:
                    userPlan === "enterprise"
                      ? "1px solid rgba(139, 92, 246, 0.4)"
                      : userPlan === "pro"
                      ? "1px solid rgba(6, 182, 212, 0.4)"
                      : "1px solid rgba(148, 163, 184, 0.25)",
                }}
              />
            </Box>
            <Typography noWrap sx={{ fontSize: "0.68rem", color: "#64748b" }}>
              {userEmail}
            </Typography>
          </Box>
        </Box>

        <UnfoldMoreIcon sx={{ fontSize: 18, color: "#64748b" }} />
      </Box>

      {/* Profile Details & Options Menu */}
      <Menu
        anchorEl={profileAnchorEl}
        open={isProfileMenuOpen}
        onClose={handleProfileClose}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              width: sidebarWidth - 36,
              bgcolor: "#0b1120",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              borderRadius: 2,
              boxShadow: "0 16px 40px rgba(0,0,0,0.85)",
              p: 1,
              mt: -1,
            },
          },
        }}
      >
        {/* Full User Details Header */}
        <Box sx={{ p: 1.5, mb: 1, bgcolor: "rgba(255, 255, 255, 0.03)", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: currentUser?.avatar_color || "#06b6d4",
                fontSize: "1rem",
                fontWeight: 800,
                borderRadius: 2,
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontWeight: 800, fontSize: "0.9rem", color: "#f8fafc" }}>
                {userName}
              </Typography>
              <Typography noWrap sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                {userEmail}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>Plan Tier:</Typography>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: userPlan === "free" ? "#94a3b8" : "#22d3ee" }}>
                {userPlan.toUpperCase()}
              </Typography>
            </Box>
            <Chip
              label={currentUser?.plan_status === "active" ? "Active" : "Standard"}
              size="small"
              sx={{
                fontSize: "0.62rem",
                fontWeight: 700,
                height: 18,
                bgcolor: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                borderRadius: 1,
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            />
          </Box>
        </Box>

        {/* Action Menu Items */}
        <MenuItem
          onClick={() => {
            handleProfileClose();
            onSelectTab("billing");
          }}
          sx={{
            borderRadius: 2,
            py: 1,
            px: 1.5,
            my: 0.25,
            "&:hover": { bgcolor: "rgba(6, 182, 212, 0.12)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "#22d3ee" }}>
            <CreditCardOutlinedIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.2 }}>
              Plans & Usage
            </Typography>
            <Typography sx={{ fontSize: "0.68rem", color: "#64748b" }}>
              Manage billing, limits & invoices
            </Typography>
          </Box>
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleProfileClose();
            onOpenSettings();
          }}
          sx={{
            borderRadius: 2,
            py: 1,
            px: 1.5,
            my: 0.25,
            "&:hover": { bgcolor: "rgba(6, 182, 212, 0.12)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "#94a3b8" }}>
            <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.2 }}>
              System Settings
            </Typography>
            <Typography sx={{ fontSize: "0.68rem", color: "#64748b" }}>
              API keys, vector models & RAG params
            </Typography>
          </Box>
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleProfileClose();
            window.open("https://github.com/", "_blank");
          }}
          sx={{
            borderRadius: 2,
            py: 1,
            px: 1.5,
            my: 0.25,
            "&:hover": { bgcolor: "rgba(6, 182, 212, 0.12)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "#94a3b8" }}>
            <HelpOutlineOutlinedIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.2 }}>
              Help & Documentation
            </Typography>
            <Typography sx={{ fontSize: "0.68rem", color: "#64748b" }}>
              API guides & knowledge base docs
            </Typography>
          </Box>
        </MenuItem>

        <Divider sx={{ my: 0.75, borderColor: "rgba(255, 255, 255, 0.08)" }} />

        <MenuItem
          onClick={() => {
            handleProfileClose();
            onLogout();
          }}
          sx={{
            borderRadius: 2,
            py: 0.9,
            px: 1.5,
            color: "#f43f5e",
            "&:hover": { bgcolor: "rgba(244, 63, 94, 0.12)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "#f43f5e" }}>
            <LogoutIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#f43f5e" }}>
            Sign Out
          </Typography>
        </MenuItem>
      </Menu>
    </Drawer>
  );
};
export default Sidebar;
