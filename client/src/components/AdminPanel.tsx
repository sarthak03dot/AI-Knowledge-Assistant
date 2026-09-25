import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DescriptionIcon from "@mui/icons-material/Description";
import ChatIcon from "@mui/icons-material/Chat";
import TuneIcon from "@mui/icons-material/Tune";
import SpeedIcon from "@mui/icons-material/Speed";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import SecurityIcon from "@mui/icons-material/Security";
import SaveIcon from "@mui/icons-material/Save";
import LayersIcon from "@mui/icons-material/Layers";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";

import type { AdminDashboardData, SystemSettings, AdminUserItem, AdminPaymentItem } from "../types/rag";
import {
  fetchAdminDashboard,
  fetchSystemSettings,
  updateSystemSettings,
  fetchAdminUsers,
  updateAdminUserRole,
  updateAdminUserPlan,
  deleteAdminUser,
  fetchAdminPayments,
  updateAdminRateLimit,
} from "../services/api";
import { DataTable, type ColumnDef } from "./DataTable";

interface AdminPanelProps {
  onBackToApp: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToApp }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "users" | "payments" | "settings">("overview");
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Users state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [userRowsPerPage, setUserRowsPerPage] = useState(10);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentRowsPerPage, setPaymentRowsPerPage] = useState(10);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [paymentPlanFilter, setPaymentPlanFilter] = useState("");
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit Plan & Pricing state
  const [freeDocLimit, setFreeDocLimit] = useState<number>(5);
  const [freeQueryLimit, setFreeQueryLimit] = useState<number>(50);
  const [proMonthlyPrice, setProMonthlyPrice] = useState<number>(999);
  const [proYearlyPrice, setProYearlyPrice] = useState<number>(9590);
  const [proDocLimit, setProDocLimit] = useState<number>(100);
  const [proQueryLimit, setProQueryLimit] = useState<number>(2000);
  const [entMonthlyPrice, setEntMonthlyPrice] = useState<number>(4999);
  const [entYearlyPrice, setEntYearlyPrice] = useState<number>(47990);
  const [entDocLimit, setEntDocLimit] = useState<number>(1000);
  
  // Rate Limit state (Defaults to 60 requests/min standard)
  const [rateLimitPerMin, setRateLimitPerMin] = useState<number>(60);

  // User Plan & Special Offer Action Modal
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<string>("free");
  const [targetPlanStatus, setTargetPlanStatus] = useState<string>("active");
  const [targetOfferNote, setTargetOfferNote] = useState<string>("");
  const [targetDocLimit, setTargetDocLimit] = useState<string>("");
  const [targetQueryLimit, setTargetQueryLimit] = useState<string>("");

  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);

  // Load Dashboard & Settings
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [dash, sys] = await Promise.all([
        fetchAdminDashboard(),
        fetchSystemSettings(),
      ]);

      setDashboardData(dash);
      setSettings(sys);

      // Populate edit fields from loaded settings
      const plans = sys.plans || {};
      if (plans.free) {
        setFreeDocLimit(plans.free.document_limit || 5);
        setFreeQueryLimit((plans.free as any).query_limit || 50);
      }
      if (plans.pro) {
        setProMonthlyPrice(plans.pro.price_monthly || 999);
        setProYearlyPrice(plans.pro.price_yearly || 9590);
        setProDocLimit(plans.pro.document_limit || 100);
        setProQueryLimit((plans.pro as any).query_limit || 2000);
      }
      if (plans.enterprise) {
        setEntMonthlyPrice(plans.enterprise.price_monthly || 4999);
        setEntYearlyPrice(plans.enterprise.price_yearly || 47990);
        setEntDocLimit(plans.enterprise.document_limit || 1000);
      }
      setRateLimitPerMin(sys.rate_limit_per_minute || 60);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to load admin telemetry." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Users with Search, Filters, and Pagination
  const loadUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetchAdminUsers(
        userSearch,
        userPage * userRowsPerPage,
        userRowsPerPage,
        userRoleFilter,
        userPlanFilter,
        userStatusFilter
      );
      setUsers(res.users || []);
      setUserTotal(res.total || 0);
    } catch (err: any) {
      console.error("Failed to load users:", err);
    } finally {
      setIsUsersLoading(false);
    }
  }, [userSearch, userPage, userRowsPerPage, userRoleFilter, userPlanFilter, userStatusFilter]);

  // Fetch Payments with Search, Filters, and Pagination
  const loadPayments = useCallback(async () => {
    setIsPaymentsLoading(true);
    try {
      const res = await fetchAdminPayments(
        paymentPage * paymentRowsPerPage,
        paymentRowsPerPage,
        paymentSearch,
        paymentStatusFilter,
        paymentPlanFilter
      );
      setPayments(res.payments || []);
      setPaymentTotal(res.total || 0);
    } catch (err: any) {
      console.error("Failed to load payments:", err);
    } finally {
      setIsPaymentsLoading(false);
    }
  }, [paymentSearch, paymentPage, paymentRowsPerPage, paymentStatusFilter, paymentPlanFilter]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "payments") {
      loadPayments();
    }
  }, [activeTab, loadUsers, loadPayments]);

  const handleSavePlanSettings = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const currentPlans = settings?.plans || (dashboardData?.plans as any) || {};
      const updatedPlans = {
        ...currentPlans,
        free: {
          ...currentPlans.free,
          document_limit: Number(freeDocLimit),
          query_limit: Number(freeQueryLimit),
          features: [
            `Up to ${freeDocLimit} Documents`,
            "Up to 500 Passages",
            `${freeQueryLimit} AI Queries / month`,
            "Executive Analyst AI Persona",
            "Standard Hybrid Search",
            "Community Support",
          ],
        },
        pro: {
          ...currentPlans.pro,
          price_monthly: Number(proMonthlyPrice),
          price_yearly: Number(proYearlyPrice),
          document_limit: Number(proDocLimit),
          query_limit: Number(proQueryLimit),
          features: [
            `Up to ${proDocLimit} Documents`,
            "Up to 10,000 Passages",
            `${proQueryLimit.toLocaleString()} AI Queries / month`,
            "All 5 AI Personas + Custom Builder",
            "Priority Low-Latency LLM Queue",
            "PDF & Markdown Report Exporting",
            "Email & Priority Support",
          ],
        },
        enterprise: {
          ...currentPlans.enterprise,
          price_monthly: Number(entMonthlyPrice),
          price_yearly: Number(entYearlyPrice),
          document_limit: Number(entDocLimit),
        },
      };

      await updateSystemSettings({
        plans: updatedPlans,
        rate_limit_per_minute: Number(rateLimitPerMin),
      });

      setFeedback({ type: "success", message: "Subscription plans & pricing updated successfully!" });
      await loadInitialData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRateLimit = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateAdminRateLimit(Number(rateLimitPerMin));
      setFeedback({ type: "success", message: `Global rate limit successfully updated to ${rateLimitPerMin} requests/min!` });
    } catch (err: any) {
      setFeedback({ type: "error", message: "Failed to update rate limit." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleUserRole = async (user: AdminUserItem) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateAdminUserRole(user.id, newRole);
      setFeedback({ type: "success", message: `User ${user.email} role updated to ${newRole.toUpperCase()}.` });
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update role." });
    }
  };

  const handleOpenPlanModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setTargetPlan(u.plan || "free");
    setTargetPlanStatus(u.plan_status || "active");
    setTargetOfferNote(u.offer_note || "");
    setTargetDocLimit(u.custom_doc_limit !== undefined && u.custom_doc_limit !== null ? String(u.custom_doc_limit) : "");
    setTargetQueryLimit(u.custom_query_limit !== undefined && u.custom_query_limit !== null ? String(u.custom_query_limit) : "");
    setEditPlanModalOpen(true);
  };

  const handleConfirmPlanUpdate = async () => {
    if (!selectedUser) return;
    try {
      await updateAdminUserPlan(
        selectedUser.id,
        targetPlan,
        targetPlanStatus,
        targetOfferNote || undefined,
        targetDocLimit ? Number(targetDocLimit) : undefined,
        targetQueryLimit ? Number(targetQueryLimit) : undefined
      );
      setFeedback({ type: "success", message: `Updated ${selectedUser.email} subscription & custom offer.` });
      setEditPlanModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update plan." });
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteAdminUser(selectedUser.id);
      setFeedback({ type: "success", message: `User ${selectedUser.email} permanently deleted.` });
      setDeleteUserModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to delete user." });
    }
  };

  // Columns for Users Table
  const userColumns: ColumnDef<AdminUserItem>[] = [
    {
      key: "user",
      label: "User Profile",
      minWidth: 220,
      render: (u) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              bgcolor: u.avatar_color || "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.85rem",
              color: "#ffffff",
              boxShadow: "0 0 10px rgba(99,102,241,0.3)",
              flexShrink: 0,
            }}
          >
            {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.84rem", color: "#f8fafc" }}>
              {u.name || "Unnamed User"}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
              {u.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "role",
      label: "Role",
      minWidth: 100,
      render: (u) => (
        <Chip
          size="small"
          icon={u.role === "admin" ? <SecurityIcon sx={{ fontSize: 13 }} /> : undefined}
          label={u.role.toUpperCase()}
          sx={{
            bgcolor: u.role === "admin" ? "rgba(236, 72, 153, 0.15)" : "rgba(255, 255, 255, 0.05)",
            color: u.role === "admin" ? "#f472b6" : "#94a3b8",
            border: u.role === "admin" ? "1px solid rgba(236, 72, 153, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
            fontWeight: 800,
            fontSize: "0.68rem",
          }}
        />
      ),
    },
    {
      key: "plan",
      label: "Plan & Status",
      minWidth: 160,
      render: (u) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={u.plan.toUpperCase()}
              sx={{
                bgcolor:
                  u.plan === "enterprise"
                    ? "rgba(168, 85, 247, 0.2)"
                    : u.plan === "pro"
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(255, 255, 255, 0.06)",
                color:
                  u.plan === "enterprise"
                    ? "#c084fc"
                    : u.plan === "pro"
                    ? "#60a5fa"
                    : "#cbd5e1",
                fontWeight: 700,
                fontSize: "0.68rem",
              }}
            />
            {u.plan_status && u.plan_status !== "active" && (
              <Chip
                size="small"
                label={u.plan_status.toUpperCase()}
                sx={{
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  height: 20,
                }}
              />
            )}
          </Box>
          {u.offer_note && (
            <Typography sx={{ fontSize: "0.68rem", color: "#34d399", display: "flex", alignItems: "center", gap: 0.5 }}>
              <LocalOfferIcon sx={{ fontSize: 11 }} /> {u.offer_note}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: "documents_count",
      label: "Docs",
      align: "center",
      minWidth: 80,
      render: (u) => (
        <Typography sx={{ fontSize: "0.84rem", color: "#e2e8f0", fontWeight: 600 }}>
          {u.documents_count}
          {u.custom_doc_limit ? (
            <Typography component="span" sx={{ fontSize: "0.68rem", color: "#38bdf8", ml: 0.5 }}>
              /{u.custom_doc_limit}
            </Typography>
          ) : ""}
        </Typography>
      ),
    },
    {
      key: "query_count",
      label: "Queries",
      align: "center",
      minWidth: 80,
      render: (u) => (
        <Typography sx={{ fontSize: "0.84rem", color: "#e2e8f0", fontWeight: 600 }}>
          {u.query_count || 0}
          {u.custom_query_limit ? (
            <Typography component="span" sx={{ fontSize: "0.68rem", color: "#38bdf8", ml: 0.5 }}>
              /{u.custom_query_limit}
            </Typography>
          ) : ""}
        </Typography>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      minWidth: 100,
      render: (u) => (
        <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
          {new Date(u.created_at * 1000).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      minWidth: 200,
      render: (u) => (
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleOpenPlanModal(u)}
            startIcon={<WorkspacePremiumIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderColor: "rgba(59, 130, 246, 0.3)",
              color: "#60a5fa",
              fontSize: "0.72rem",
              textTransform: "none",
              py: 0.3,
              px: 1,
              borderRadius: 2,
              "&:hover": { bgcolor: "rgba(59, 130, 246, 0.1)", borderColor: "#3b82f6" },
            }}
          >
            Plan & Offer
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => handleToggleUserRole(u)}
            sx={{
              borderColor: u.role === "admin" ? "rgba(236, 72, 153, 0.3)" : "rgba(255, 255, 255, 0.15)",
              color: u.role === "admin" ? "#f472b6" : "#94a3b8",
              fontSize: "0.72rem",
              textTransform: "none",
              py: 0.3,
              px: 1,
              borderRadius: 2,
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
            }}
          >
            {u.role === "admin" ? "Make User" : "Make Admin"}
          </Button>

          <Tooltip title="Permanently Delete User">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedUser(u);
                setDeleteUserModalOpen(true);
              }}
              sx={{ color: "#f43f5e", "&:hover": { bgcolor: "rgba(244, 63, 94, 0.1)" } }}
            >
              <DeleteIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Columns for Payments Table
  const paymentColumns: ColumnDef<AdminPaymentItem>[] = [
    {
      key: "order_id",
      label: "Order / Ref ID",
      minWidth: 160,
      render: (p) => (
        <Typography sx={{ fontFamily: "monospace", color: "#38bdf8", fontSize: "0.82rem", fontWeight: 700 }}>
          {p.order_id}
        </Typography>
      ),
    },
    {
      key: "user",
      label: "Customer",
      minWidth: 200,
      render: (p) => (
        <Box>
          <Typography sx={{ fontSize: "0.84rem", fontWeight: 700, color: "#f8fafc" }}>
            {p.user_name}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
            {p.user_email}
          </Typography>
        </Box>
      ),
    },
    {
      key: "plan_id",
      label: "Plan & Cycle",
      minWidth: 150,
      render: (p) => (
        <Chip
          size="small"
          label={`${p.plan_id.toUpperCase()} (${p.billing_cycle})`}
          sx={{
            bgcolor: "rgba(59, 130, 246, 0.15)",
            color: "#60a5fa",
            fontSize: "0.7rem",
            fontWeight: 700,
            border: "1px solid rgba(59, 130, 246, 0.3)",
          }}
        />
      ),
    },
    {
      key: "amount",
      label: "Amount",
      minWidth: 120,
      render: (p) => (
        <Typography sx={{ fontWeight: 800, color: "#34d399", fontSize: "0.9rem" }}>
          ₹{(p.amount / 100).toLocaleString()} {p.currency}
        </Typography>
      ),
    },
    {
      key: "status",
      label: "Status",
      minWidth: 110,
      render: (p) => (
        <Chip
          size="small"
          icon={p.status === "paid" ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : undefined}
          label={p.status.toUpperCase()}
          sx={{
            bgcolor:
              p.status === "paid"
                ? "rgba(16, 185, 129, 0.15)"
                : p.status === "created"
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(244, 63, 94, 0.15)",
            color:
              p.status === "paid"
                ? "#34d399"
                : p.status === "created"
                ? "#fbbf24"
                : "#f43f5e",
            fontWeight: 700,
            fontSize: "0.7rem",
          }}
        />
      ),
    },
    {
      key: "created_at",
      label: "Timestamp",
      minWidth: 140,
      render: (p) => (
        <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
          {new Date(p.created_at * 1000).toLocaleString()}
        </Typography>
      ),
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#070b14",
        color: "#f8fafc",
        overflowY: "auto",
        p: { xs: 2, md: 4 },
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
          pb: 2.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(236, 72, 153, 0.4)",
            }}
          >
            <AdminPanelSettingsIcon sx={{ fontSize: 26, color: "#ffffff" }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                NexusRAG Command Center
              </Typography>
              <Chip
                label="ADMIN"
                size="small"
                sx={{
                  bgcolor: "rgba(236, 72, 153, 0.2)",
                  color: "#f472b6",
                  border: "1px solid rgba(236, 72, 153, 0.4)",
                  fontWeight: 800,
                  fontSize: "0.68rem",
                }}
              />
            </Box>
            <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8" }}>
              Manage subscription quotas, live pricing, customer accounts & global rate limits
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => {
              loadInitialData();
              if (activeTab === "users") loadUsers();
              if (activeTab === "payments") loadPayments();
            }}
            startIcon={<RefreshIcon />}
            sx={{
              borderColor: "rgba(255, 255, 255, 0.15)",
              color: "#cbd5e1",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2.5,
              "&:hover": { borderColor: "#06b6d4", color: "#f8fafc" },
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            onClick={onBackToApp}
            sx={{
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              color: "#ffffff",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2.5,
              px: 2.5,
            }}
          >
            Return to App
          </Button>
        </Box>
      </Box>

      {/* Alert Feedback */}
      {feedback && (
        <Alert
          severity={feedback.type}
          onClose={() => setFeedback(null)}
          sx={{ mb: 3, borderRadius: 2.5, bgcolor: feedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)", color: "#f8fafc" }}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        slotProps={{ indicator: { sx: { bgcolor: "#ec4899", height: 3, borderRadius: "3px 3px 0 0" } } }}
        sx={{
          mb: 3,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          "& .MuiTab-root": {
            color: "#94a3b8",
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.88rem",
            px: 2.5,
            py: 1.5,
            "&.Mui-selected": { color: "#f472b6" },
          },
        }}
      >
        <Tab icon={<LayersIcon sx={{ fontSize: 18 }} />} iconPosition="start" value="overview" label="Overview & Telemetry" />
        <Tab icon={<TuneIcon sx={{ fontSize: 18 }} />} iconPosition="start" value="plans" label="Plan & Pricing Manager" />
        <Tab icon={<PeopleAltIcon sx={{ fontSize: 18 }} />} iconPosition="start" value="users" label={`User Accounts (${userTotal})`} />
        <Tab icon={<AccountBalanceWalletIcon sx={{ fontSize: 18 }} />} iconPosition="start" value="payments" label={`Payment Ledger (${paymentTotal})`} />
        <Tab icon={<SpeedIcon sx={{ fontSize: 18 }} />} iconPosition="start" value="settings" label="Rate Limits & Infra" />
      </Tabs>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & TELEMETRY */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        isLoading ? (
          <Box sx={{ py: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress sx={{ color: "#ec4899", mb: 2 }} />
            <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 600 }}>
              Loading platform telemetry...
            </Typography>
          </Box>
        ) : dashboardData ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Key Metrics Grid */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2.5 }}>
            <Card sx={{ bgcolor: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
                    Total Users
                  </Typography>
                  <PeopleAltIcon sx={{ color: "#38bdf8", fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc" }}>
                  {dashboardData.metrics.total_users}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mt: 0.5 }}>
                  {dashboardData.metrics.plan_breakdown.free} Free • {dashboardData.metrics.plan_breakdown.pro} Pro • {dashboardData.metrics.plan_breakdown.enterprise} Enterprise
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
                    Knowledge Assets
                  </Typography>
                  <DescriptionIcon sx={{ color: "#a855f7", fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc" }}>
                  {dashboardData.metrics.total_documents}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mt: 0.5 }}>
                  Indexed in Qdrant Vector Cloud
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
                    AI Chat Sessions
                  </Typography>
                  <ChatIcon sx={{ color: "#ec4899", fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc" }}>
                  {dashboardData.metrics.total_chats}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mt: 0.5 }}>
                  Total conversations processed
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase" }}>
                    Gross Revenue
                  </Typography>
                  <AccountBalanceWalletIcon sx={{ color: "#10b981", fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: "#34d399" }}>
                  ₹{dashboardData.metrics.total_revenue_inr.toLocaleString()}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mt: 0.5 }}>
                  {dashboardData.metrics.total_paid_orders} Paid Razorpay Transactions
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Infrastructure Health Status */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.5 }}>
            <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <CloudQueueIcon sx={{ color: "#06b6d4" }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Cloudinary CDN</Typography>
                </Box>
                <Chip
                  size="small"
                  label={dashboardData.cloudinary.configured ? `CONNECTED: ${dashboardData.cloudinary.cloud_name}` : "NOT CONFIGURED"}
                  sx={{
                    bgcolor: dashboardData.cloudinary.configured ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                    color: dashboardData.cloudinary.configured ? "#34d399" : "#f43f5e",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                  }}
                />
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <CreditCardIcon sx={{ color: "#3b82f6" }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Razorpay Gateway</Typography>
                </Box>
                <Chip
                  size="small"
                  label={dashboardData.payment_gateway.is_configured ? "READY (TEST / LIVE KEYS)" : "SANDBOX SIMULATION"}
                  sx={{
                    bgcolor: dashboardData.payment_gateway.is_configured ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    color: dashboardData.payment_gateway.is_configured ? "#60a5fa" : "#fbbf24",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                  }}
                />
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <SpeedIcon sx={{ color: "#a855f7" }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>API Rate Limiter</Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${dashboardData.active_rate_limit} REQ / MIN`}
                  sx={{
                    bgcolor: "rgba(168, 85, 247, 0.15)",
                    color: "#c084fc",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                  }}
                />
              </CardContent>
            </Card>
          </Box>
        </Box>
        ) : null
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PLAN & PRICING MANAGER */}
      {/* ========================================================================= */}
      {activeTab === "plans" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 3 }}>
            {/* Free Plan */}
            <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3.5 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#f8fafc" }}>
                    Free Starter
                  </Typography>
                  <Chip size="small" label="Free Tier" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#cbd5e1" }} />
                </Box>
                <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", mb: 3 }}>
                  Configure document storage and chat limits for users without paid subscription.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Max Uploadable Documents"
                    type="number"
                    size="small"
                    value={freeDocLimit}
                    onChange={(e) => setFreeDocLimit(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                  <TextField
                    label="Monthly AI Chat Query Quota"
                    type="number"
                    size="small"
                    value={freeQueryLimit}
                    onChange={(e) => setFreeQueryLimit(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 3.5 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#60a5fa" }}>
                    Pro Intelligence
                  </Typography>
                  <Chip size="small" label="Paid Tier" sx={{ bgcolor: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }} />
                </Box>
                <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", mb: 3 }}>
                  Set monthly/yearly checkout amounts and increased resource limits.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Monthly Price (₹ INR)"
                    type="number"
                    size="small"
                    value={proMonthlyPrice}
                    onChange={(e) => setProMonthlyPrice(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                  <TextField
                    label="Yearly Price (₹ INR)"
                    type="number"
                    size="small"
                    value={proYearlyPrice}
                    onChange={(e) => setProYearlyPrice(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                  <TextField
                    label="Max Uploadable Documents"
                    type="number"
                    size="small"
                    value={proDocLimit}
                    onChange={(e) => setProDocLimit(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                  <TextField
                    label="Monthly AI Chat Query Quota"
                    type="number"
                    size="small"
                    value={proQueryLimit}
                    onChange={(e) => setProQueryLimit(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: 3.5 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#c084fc" }}>
                    Enterprise Suite
                  </Typography>
                  <Chip size="small" label="Custom Tier" sx={{ bgcolor: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }} />
                </Box>
                <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8", mb: 3 }}>
                  Organization grade access with highest tier limits and dedicated vector partitioning.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Monthly Price (₹ INR)"
                    type="number"
                    size="small"
                    value={entMonthlyPrice}
                    onChange={(e) => setEntMonthlyPrice(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                  <TextField
                    label="Yearly Price (₹ INR)"
                    type="number"
                    size="small"
                    value={entYearlyPrice}
                    onChange={(e) => setEntYearlyPrice(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                  <TextField
                    label="Max Documents Limit"
                    type="number"
                    size="small"
                    value={entDocLimit}
                    onChange={(e) => setEntDocLimit(Number(e.target.value))}
                    sx={{ input: { color: "#f8fafc" } }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleSavePlanSettings}
              disabled={isSaving}
              startIcon={<SaveIcon />}
              sx={{
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                fontWeight: 800,
                textTransform: "none",
                px: 3.5,
                py: 1.2,
                borderRadius: 2.5,
                boxShadow: "0 0 20px rgba(236, 72, 153, 0.4)",
              }}
            >
              {isSaving ? "Saving..." : "Save Plan Limits & Pricing"}
            </Button>
          </Box>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: USER MANAGEMENT (PAGINATED & FILTERABLE) */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <DataTable<AdminUserItem>
          columns={userColumns}
          data={users}
          totalCount={userTotal}
          page={userPage}
          rowsPerPage={userRowsPerPage}
          onPageChange={(p) => setUserPage(p)}
          onRowsPerPageChange={(r) => {
            setUserRowsPerPage(r);
            setUserPage(0);
          }}
          searchValue={userSearch}
          onSearchChange={(val) => {
            setUserSearch(val);
            setUserPage(0);
          }}
          searchPlaceholder="Search by name, email, or user ID..."
          isLoading={isUsersLoading}
          emptyTitle="No users found"
          emptySubtitle="Try adjusting your search criteria or role/plan filters."
          filterControls={
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>Role</InputLabel>
                <Select
                  value={userRoleFilter}
                  label="Role"
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(0);
                  }}
                  sx={{ color: "#f8fafc", bgcolor: "rgba(15, 23, 42, 0.65)", borderRadius: 2.5, fontSize: "0.82rem" }}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="admin">Admins Only</MenuItem>
                  <MenuItem value="user">Users Only</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>Plan Tier</InputLabel>
                <Select
                  value={userPlanFilter}
                  label="Plan Tier"
                  onChange={(e) => {
                    setUserPlanFilter(e.target.value);
                    setUserPage(0);
                  }}
                  sx={{ color: "#f8fafc", bgcolor: "rgba(15, 23, 42, 0.65)", borderRadius: 2.5, fontSize: "0.82rem" }}
                >
                  <MenuItem value="">All Plans</MenuItem>
                  <MenuItem value="free">Free Starter</MenuItem>
                  <MenuItem value="pro">Pro Intelligence</MenuItem>
                  <MenuItem value="enterprise">Enterprise Suite</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>Status</InputLabel>
                <Select
                  value={userStatusFilter}
                  label="Status"
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(0);
                  }}
                  sx={{ color: "#f8fafc", bgcolor: "rgba(15, 23, 42, 0.65)", borderRadius: 2.5, fontSize: "0.82rem" }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="trial">Trial / Promo</MenuItem>
                  <MenuItem value="discounted">Discounted</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Box>
          }
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAYMENT LEDGER (PAGINATED & FILTERABLE) */}
      {/* ========================================================================= */}
      {activeTab === "payments" && (
        <DataTable<AdminPaymentItem>
          columns={paymentColumns}
          data={payments}
          totalCount={paymentTotal}
          page={paymentPage}
          rowsPerPage={paymentRowsPerPage}
          onPageChange={(p) => setPaymentPage(p)}
          onRowsPerPageChange={(r) => {
            setPaymentRowsPerPage(r);
            setPaymentPage(0);
          }}
          searchValue={paymentSearch}
          onSearchChange={(val) => {
            setPaymentSearch(val);
            setPaymentPage(0);
          }}
          searchPlaceholder="Search order ID, payment ID, or user email..."
          isLoading={isPaymentsLoading}
          emptyTitle="No transaction receipts recorded"
          emptySubtitle="When users upgrade to Pro or Enterprise, orders and timestamps will appear here."
          filterControls={
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>Status</InputLabel>
                <Select
                  value={paymentStatusFilter}
                  label="Status"
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setPaymentPage(0);
                  }}
                  sx={{ color: "#f8fafc", bgcolor: "rgba(15, 23, 42, 0.65)", borderRadius: 2.5, fontSize: "0.82rem" }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="paid">Paid (Captured)</MenuItem>
                  <MenuItem value="created">Created (Pending)</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>Plan</InputLabel>
                <Select
                  value={paymentPlanFilter}
                  label="Plan"
                  onChange={(e) => {
                    setPaymentPlanFilter(e.target.value);
                    setPaymentPage(0);
                  }}
                  sx={{ color: "#f8fafc", bgcolor: "rgba(15, 23, 42, 0.65)", borderRadius: 2.5, fontSize: "0.82rem" }}
                >
                  <MenuItem value="">All Plans</MenuItem>
                  <MenuItem value="pro">Pro Intelligence</MenuItem>
                  <MenuItem value="enterprise">Enterprise Suite</MenuItem>
                </Select>
              </FormControl>
            </Box>
          }
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RATE LIMITS & INFRA CONFIG */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          {/* Rate Limiter Box */}
          <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <SpeedIcon sx={{ color: "#38bdf8" }} />
                <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                  Global IP Rate Limiter
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8", mb: 3 }}>
                Configure maximum API requests permitted per minute per client IP address. Standard production default is <strong>60 req/min</strong>.
              </Typography>

              {/* Quick Presets */}
              <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
                {[30, 60, 120, 300].map((preset) => (
                  <Chip
                    key={preset}
                    label={`${preset} req/min`}
                    clickable
                    onClick={() => setRateLimitPerMin(preset)}
                    sx={{
                      bgcolor: rateLimitPerMin === preset ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.05)",
                      color: rateLimitPerMin === preset ? "#38bdf8" : "#94a3b8",
                      border: rateLimitPerMin === preset ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                    }}
                  />
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <TextField
                  label="Requests / Minute"
                  type="number"
                  size="small"
                  value={rateLimitPerMin}
                  onChange={(e) => setRateLimitPerMin(Number(e.target.value))}
                  sx={{ width: 180, input: { color: "#f8fafc" } }}
                />
                <Button
                  variant="contained"
                  onClick={handleSaveRateLimit}
                  disabled={isSaving}
                  sx={{
                    bgcolor: "#38bdf8",
                    color: "#0f172a",
                    fontWeight: 800,
                    textTransform: "none",
                    px: 3,
                    borderRadius: 2,
                    "&:hover": { bgcolor: "#0ea5e9" },
                  }}
                >
                  Apply Rate Limit
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Payment Gateway Setup Card */}
          <Card sx={{ bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <CreditCardIcon sx={{ color: "#10b981" }} />
                <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                  Razorpay Payment Gateway Setup
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8", mb: 2.5 }}>
                To accept live card, UPI, and netbanking payments on your deployment:
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography sx={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                  1. Log in to your <strong>Razorpay Dashboard</strong> (test or live mode).
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                  2. Generate <strong>Key ID</strong> and <strong>Key Secret</strong> from Settings &gt; API Keys.
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                  3. Set <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> in your <code>.env</code> file.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* EDIT USER PLAN & SPECIAL OFFER MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={editPlanModalOpen}
        onClose={() => setEditPlanModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: 3.5, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#f8fafc", display: "flex", alignItems: "center", gap: 1.5 }}>
          <CardGiftcardIcon sx={{ color: "#38bdf8" }} />
          Plan Tier & Custom Offer Assignment
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.84rem", color: "#94a3b8", mb: 2.5 }}>
            Customize subscription tier, plan status, and special quota overrides for <strong>{selectedUser?.email}</strong>:
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94a3b8" }}>Plan Tier</InputLabel>
                <Select
                  value={targetPlan}
                  label="Plan Tier"
                  onChange={(e) => setTargetPlan(e.target.value)}
                  sx={{ color: "#f8fafc", bgcolor: "rgba(255,255,255,0.04)" }}
                >
                  <MenuItem value="free">Free Starter</MenuItem>
                  <MenuItem value="pro">Pro Intelligence</MenuItem>
                  <MenuItem value="enterprise">Enterprise Suite</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: "#94a3b8" }}>Plan Status</InputLabel>
                <Select
                  value={targetPlanStatus}
                  label="Plan Status"
                  onChange={(e) => setTargetPlanStatus(e.target.value)}
                  sx={{ color: "#f8fafc", bgcolor: "rgba(255,255,255,0.04)" }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="trial">Promotional / Trial</MenuItem>
                  <MenuItem value="discounted">Special Discount</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Special Offer / Promo Note (Optional)"
              placeholder="e.g. 50% discount voucher or VIP Beta tester offer"
              size="small"
              value={targetOfferNote}
              onChange={(e) => setTargetOfferNote(e.target.value)}
              sx={{ input: { color: "#f8fafc" } }}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField
                label="Custom Doc Limit Override"
                placeholder="Leave blank for default"
                type="number"
                size="small"
                value={targetDocLimit}
                onChange={(e) => setTargetDocLimit(e.target.value)}
                sx={{ input: { color: "#f8fafc" } }}
              />

              <TextField
                label="Custom Query Limit Override"
                placeholder="Leave blank for default"
                type="number"
                size="small"
                value={targetQueryLimit}
                onChange={(e) => setTargetQueryLimit(e.target.value)}
                sx={{ input: { color: "#f8fafc" } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditPlanModalOpen(false)} sx={{ color: "#94a3b8", textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmPlanUpdate}
            sx={{
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              px: 2.5,
            }}
          >
            Save Changes & Grant Offer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* DELETE USER CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={deleteUserModalOpen}
        onClose={() => setDeleteUserModalOpen(false)}
        slotProps={{ paper: { sx: { bgcolor: "#0f172a", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: 3.5, p: 1, minWidth: 360 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#fda4af" }}>
          Delete User Account
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
            Are you sure you want to permanently delete <strong>{selectedUser?.email}</strong>? All their uploaded documents, embeddings, and chat histories will be removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteUserModalOpen(false)} sx={{ color: "#94a3b8", textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDeleteUser}
            sx={{ bgcolor: "#f43f5e", fontWeight: 700, textTransform: "none", borderRadius: 2, "&:hover": { bgcolor: "#e11d48" } }}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
