import React, { useState, useEffect, useCallback } from "react";
import type { User, PaymentHistoryItem, PlanUsage, PricingPlan } from "../types/rag";
import {
  fetchPricingPlans,
  createPaymentOrder,
  verifyPayment,
  fetchPaymentHistory,
  fetchPlanUsage,
} from "../services/api";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LayersIcon from "@mui/icons-material/Layers";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import BoltIcon from "@mui/icons-material/Bolt";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";

interface BillingPageProps {
  currentUser: User | null;
  onUserUpdated: (user: User) => void;
  onOpenAuth?: () => void;
  onSwitchToChat?: () => void;
}

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free Starter",
    tagline: "For individual testing & basic document Q&A",
    price_monthly: 0,
    price_yearly: 0,
    currency: "INR",
    features: [
      "Up to 10 Documents Storage",
      "Up to 500 Indexed Passages",
      "Executive Analyst AI Persona",
      "Standard Hybrid Search (Dense + Sparse)",
      "Direct Document Context Grounding",
      "Community & Documentation Support",
    ],
    document_limit: 10,
    chunk_limit: 500,
  },
  {
    id: "pro",
    name: "Pro Intelligence",
    tagline: "For researchers, professionals & power users",
    price_monthly: 1999,
    price_yearly: 19990,
    currency: "INR",
    features: [
      "Up to 100 Documents Storage",
      "Up to 10,000 Indexed Passages",
      "All 5 AI Personas + Custom Builder",
      "Multi-Document Synthesis & Cross-Analysis",
      "Cloudinary High-Speed Multi-Format Storage",
      "Priority Low-Latency LLM Queue",
      "Export PDF & Markdown Insights",
      "Priority Email & Ticket Support",
    ],
    document_limit: 100,
    chunk_limit: 10000,
    badge: "Most Popular",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise Suite",
    tagline: "For teams, large knowledge bases & organizations",
    price_monthly: 4999,
    price_yearly: 47990,
    currency: "INR",
    features: [
      "Unlimited Documents & Unlimited Passages",
      "Dedicated Qdrant Vector Cloud Storage",
      "Global Cross-Workspace Deep Reasoning",
      "Custom Enterprise Personas & Team Roles",
      "Full REST API Access & Webhooks Integration",
      "Dedicated Cloudinary Storage Partition",
      "99.9% Uptime Guarantee & 24/7 Enterprise SLA",
    ],
    document_limit: 999999,
    chunk_limit: 999999,
    badge: "Maximum Power",
  },
];

export const BillingPage: React.FC<BillingPageProps> = ({
  currentUser,
  onUserUpdated,
  onOpenAuth,
}) => {
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PLANS);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const currentPlanId = (currentUser?.plan || "free").toLowerCase();

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingUsage(true);
    setIsLoadingHistory(true);
    setErrorMsg("");

    try {
      const [plansData, usageData, historyData] = await Promise.allSettled([
        fetchPricingPlans(),
        fetchPlanUsage(),
        fetchPaymentHistory(),
      ]);

      if (plansData.status === "fulfilled" && Object.keys(plansData.value).length > 0) {
        setPlans(Object.values(plansData.value));
      }
      if (usageData.status === "fulfilled") {
        setUsage(usageData.value);
      }
      if (historyData.status === "fulfilled") {
        setHistory(historyData.value.payments || []);
      }
    } catch (err: any) {
      console.error("Failed to load billing data:", err);
    } finally {
      setIsLoadingUsage(false);
      setIsLoadingHistory(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpgrade = async (plan: PricingPlan) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (plan.id === currentPlanId) return;

    setErrorMsg("");
    setSuccessMsg("");
    setLoadingPlan(plan.id);

    try {
      // 1. Create order on backend
      const res = await createPaymentOrder(plan.id, billingCycle);
      const order = res.order;

      // 2. Determine if order is sandbox/simulation or real Razorpay order
      const isSandboxOrder =
        order.is_sandbox ||
        !order.order_id ||
        order.order_id.startsWith("order_sandbox_") ||
        order.order_id.startsWith("order_sim_") ||
        typeof window === "undefined" ||
        !(window as any).Razorpay;

      if (isSandboxOrder) {
        // Direct sandbox simulated verification
        const verifyRes = await verifyPayment({
          order_id: order.order_id || `order_sim_${Date.now()}`,
          payment_id: `pay_sandbox_${Date.now()}`,
          signature: "sandbox_verified_signature",
          plan_id: plan.id,
          billing_cycle: billingCycle,
          amount: order.amount,
          currency: order.currency || "INR",
        });

        setSuccessMsg(`🎉 Success! Your account is now active on ${plan.name} (${billingCycle}).`);
        onUserUpdated(verifyRes.user);
        await loadData();
        setLoadingPlan(null);
        return;
      }

      // 3. Launch live/test Razorpay Standard Checkout Popup
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "NexusRAG Enterprise",
        description: `Upgrade to ${plan.name} (${billingCycle === "yearly" ? "Annual" : "Monthly"})`,
        image: "https://cdn-icons-png.flaticon.com/512/8644/8644517.png",
        order_id: order.order_id,
        handler: async function (response: any) {
          try {
            setLoadingPlan(plan.id);
            const verifyRes = await verifyPayment({
              order_id: response.razorpay_order_id || order.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              plan_id: plan.id,
              billing_cycle: billingCycle,
              amount: order.amount,
              currency: order.currency || "INR",
            });

            setSuccessMsg(`🎉 Success! Your account is now active on ${plan.name}.`);
            onUserUpdated(verifyRes.user);
            await loadData();
          } catch (verErr: any) {
            setErrorMsg(verErr.message || "Payment verification failed. Please contact support.");
          } finally {
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: currentUser.name || "NexusRAG User",
          email: currentUser.email || "",
        },
        theme: {
          color: "#06b6d4",
          backdrop_color: "rgba(7, 11, 20, 0.85)",
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setErrorMsg(response.error?.description || "Payment was declined or cancelled.");
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize payment gateway. Please try again.");
      setLoadingPlan(null);
    }
  };

  // Helper formatting
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amountInPaise: number, currency: string = "INR") => {
    const rupees = amountInPaise / 100;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  const handleDownloadInvoice = (item: PaymentHistoryItem) => {
    const invoiceNumber = `INV-${(item.order_id || "GQL").replace(/^order_/, "").toUpperCase()}`;
    const invoiceDate = formatDate(item.created_at);
    const amountFormatted = formatAmount(item.amount, item.currency);
    const planName = (item.plan_id || "Pro").toUpperCase() + " Intelligence";
    const billingPeriod = (item.billing_cycle || "monthly") === "yearly" ? "Annual Billing (12 Months)" : "Monthly Billing (1 Month)";
    const customerName = currentUser?.name || "Valued Subscriber";
    const customerEmail = currentUser?.email || "—";
    const customerId = currentUser?.id || "—";
    const paymentId = item.payment_id || "Razorpay Verified";
    const orderId = item.order_id;
    const subtotal = amountFormatted;
    const total = amountFormatted;

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 40px 20px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 36px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .logo-badge { width: 44px; height: 44px; background: linear-gradient(135deg, #06b6d4, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #ffffff; }
    .brand-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
    .brand-sub { font-size: 11px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; }
    .invoice-tag { text-align: right; }
    .invoice-tag h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #22d3ee; }
    .invoice-tag p { font-size: 13px; color: #94a3b8; margin-top: 4px; font-family: monospace; }
    .content { padding: 36px 40px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
    .meta-box h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px; font-weight: 700; }
    .meta-box p { font-size: 14px; color: #1e293b; font-weight: 500; line-height: 1.5; }
    .meta-box p.accent { font-weight: 700; color: #4338ca; }
    .table-container { margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 700; border-radius: 4px; }
    td { padding: 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .amount-col { text-align: right; }
    .summary-section { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .summary-table { width: 320px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #64748b; }
    .summary-row.total { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 8px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center; color: #64748b; font-size: 12px; }
    .actions-bar { max-width: 800px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end; gap: 12px; }
    .btn { padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
    .btn-primary { background: #0891b2; color: #ffffff; }
    .btn-primary:hover { background: #06b6d4; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .btn-secondary:hover { background: #cbd5e1; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .actions-bar { display: none !important; }
      .invoice-card { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="btn btn-secondary" onclick="window.close()">Close</button>
    <button class="btn btn-primary" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Print / Save as PDF
    </button>
  </div>
  <div class="invoice-card">
    <div class="header">
      <div class="logo-area">
        <div class="logo-badge">G</div>
        <div>
          <div class="brand-title">GQL Document Intelligence</div>
          <div class="brand-sub">Enterprise Vector & Hybrid RAG Intelligence</div>
        </div>
      </div>
      <div class="invoice-tag">
        <h1>TAX INVOICE</h1>
        <p>${invoiceNumber}</p>
      </div>
    </div>
    <div class="content">
      <div class="meta-grid">
        <div class="meta-box">
          <h4>Billed To</h4>
          <p class="accent">${customerName}</p>
          <p>${customerEmail}</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 4px;">User ID: ${customerId}</p>
        </div>
        <div class="meta-box" style="text-align: right;">
          <h4>Payment Receipt Details</h4>
          <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
          <p style="margin-top: 6px;"><span class="status-badge">✓ PAYMENT VERIFIED & PAID</span></p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 48%;">Description</th>
              <th style="width: 22%;">Billing Cycle</th>
              <th style="width: 10%;">Qty</th>
              <th class="amount-col" style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${planName} Plan</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Full AI Persona access, high-capacity vector storage, and priority synthesis</div>
              </td>
              <td>${billingPeriod}</td>
              <td>1</td>
              <td class="amount-col" style="font-weight: 700; color: #0f172a;">${subtotal}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="summary-section">
        <div class="summary-table">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div class="summary-row">
            <span>Taxes & GST (Included)</span>
            <span>₹0.00</span>
          </div>
          <div class="summary-row total">
            <span>Total Paid</span>
            <span style="color: #4338ca;">${total}</span>
          </div>
        </div>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; border: 1px dashed #cbd5e1; font-size: 12px; color: #64748b;">
        <strong style="color: #334155;">Transaction Note:</strong> Thank you for your subscription. Your account has been upgraded with dedicated RAG vector storage and priority queue compute. For questions, contact support.
      </div>
    </div>
    <div class="footer">
      <p>GQL Document Intelligence Platform • Verified Automated Payment Receipt • Secured via Razorpay</p>
      <p style="margin-top: 4px; font-size: 11px; color: #94a3b8;">This is a computer-generated tax invoice and requires no physical signature.</p>
    </div>
  </div>
</body>
</html>`;

    const invoiceWindow = window.open("", "_blank");
    if (invoiceWindow) {
      invoiceWindow.document.write(invoiceHtml);
      invoiceWindow.document.close();
    }
  };

  const docCount = usage?.document_count ?? currentUser?.documents_count ?? 0;
  const docLimit = usage?.document_limit ?? (currentPlanId === "enterprise" ? 999999 : currentPlanId === "pro" ? 100 : 10);
  const docPercent = usage?.document_usage_percent ?? (docLimit < 999999 ? Math.min(100, Math.round((docCount / docLimit) * 100)) : 0);

  const chunkCount = usage?.chunk_count ?? 0;
  const chunkLimit = usage?.chunk_limit ?? (currentPlanId === "enterprise" ? 999999 : currentPlanId === "pro" ? 10000 : 500);
  const chunkPercent = usage?.chunk_usage_percent ?? (chunkLimit < 999999 ? Math.min(100, Math.round((chunkCount / chunkLimit) * 100)) : 0);

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        overflowY: "auto",
        bgcolor: "#0b0f19",
        p: { xs: 2.5, md: 4 },
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "@keyframes spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "@keyframes pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(99, 102, 241, 0)" },
          "50%": { boxShadow: "0 0 16px 4px rgba(99, 102, 241, 0.15)" },
        },
      }}
    >
      {/* Top Banner & Header */}
      <Box sx={{ mb: 4, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(6, 182, 212, 0.4)",
              }}
            >
              <WorkspacePremiumIcon sx={{ fontSize: 20, color: "#ffffff" }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
              Subscription, Usage & Invoicing
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#94a3b8", maxWidth: 650 }}>
            Manage your high-performance RAG capacity, monitor indexed document limits in real time, and view verified Razorpay transaction invoices.
          </Typography>
        </Box>

        <Tooltip title="Refresh Resource Usage & Invoices">
          <IconButton
            onClick={loadData}
            disabled={isLoadingUsage}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#94a3b8",
              "&:hover": { bgcolor: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" },
            }}
          >
            <RefreshIcon sx={{ fontSize: 18, animation: isLoadingUsage ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Alerts */}
      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg("")} sx={{ mb: 3, bgcolor: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg("")} sx={{ mb: 3, bgcolor: "rgba(34, 197, 94, 0.1)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
          {successMsg}
        </Alert>
      )}

      {/* SECTION 1: LIVE PLAN USAGE METRICS */}
      <Box sx={{ mb: 5 }}>
        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#22d3ee", textTransform: "uppercase", letterSpacing: "0.08em", mb: 2 }}>
          1. Current Plan & Resource Utilization
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2.5,
          }}
        >
          {/* Card 1: Active Subscription Plan */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: "#0f172a",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              position: "relative",
              overflow: "hidden",
              animation: "pulse-glow 3s ease-in-out infinite",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6)",
                borderRadius: "2px 2px 0 0",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>
                Active Plan Tier
              </Typography>
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: "8px !important", color: "#34d399 !important" }} />}
                label="Active"
                size="small"
                sx={{
                  bgcolor: "rgba(52, 211, 153, 0.12)",
                  color: "#34d399",
                  border: "1px solid rgba(52, 211, 153, 0.25)",
                  fontSize: "0.68rem",
                  height: 22,
                  fontWeight: 700,
                }}
              />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", mb: 0.5, textTransform: "capitalize" }}>
              {currentPlanId === "enterprise"
                ? "Enterprise Suite"
                : currentPlanId === "pro"
                ? "Pro Intelligence"
                : "Free Starter"}
            </Typography>

            <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mb: 2 }}>
              {currentPlanId === "enterprise"
                ? "Unlimited scale & dedicated vector clusters"
                : currentPlanId === "pro"
                ? "Advanced multi-persona research active"
                : "Basic document Q&A tier"}
            </Typography>

            <Box sx={{ pt: 1.5, borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                Billing Cycle:
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#22d3ee" }}>
                {currentPlanId === "free" ? "Always Free" : "Auto-Renewing"}
              </Typography>
            </Box>
          </Box>

          {/* Card 2: Documents Storage Usage */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DescriptionOutlinedIcon sx={{ fontSize: 18, color: "#22d3ee" }} />
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>
                  Document Storage
                </Typography>
              </Box>
              <Chip
                label={docLimit >= 999999 ? "Unlimited" : `${docPercent}% Used`}
                size="small"
                sx={{
                  bgcolor: docPercent >= 90 ? "rgba(239, 68, 68, 0.12)" : "rgba(6, 182, 212, 0.12)",
                  color: docPercent >= 90 ? "#f87171" : "#22d3ee",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  height: 22,
                }}
              />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", mb: 1 }}>
              {docCount}{" "}
              <Typography component="span" sx={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
                / {docLimit >= 999999 ? "∞ Unlimited" : `${docLimit} Documents`}
              </Typography>
            </Typography>

            <LinearProgress
              variant="determinate"
              value={docLimit >= 999999 ? 5 : Math.min(100, docPercent)}
              sx={{
                height: 6,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.06)",
                "& .MuiLinearProgress-bar": {
                  background: docPercent >= 90 ? "linear-gradient(90deg, #f87171, #ef4444)" : "linear-gradient(90deg, #06b6d4, #22d3ee)",
                },
                mb: 1.5,
              }}
            />

            <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
              {docLimit >= 999999
                ? "Enterprise capacity: Upload unlimited PDF, DOCX, XLSX, and CSV files."
                : `${Math.max(0, docLimit - docCount)} document slots remaining in this billing tier.`}
            </Typography>
          </Box>

          {/* Card 3: Passages & Vector Embeddings */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LayersIcon sx={{ fontSize: 18, color: "#38bdf8" }} />
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>
                  Indexed Passages
                </Typography>
              </Box>
              <Chip
                label={chunkLimit >= 999999 ? "Unlimited" : `${chunkPercent}% Used`}
                size="small"
                sx={{
                  bgcolor: chunkPercent >= 90 ? "rgba(239, 68, 68, 0.12)" : "rgba(56, 189, 248, 0.12)",
                  color: chunkPercent >= 90 ? "#f87171" : "#38bdf8",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  height: 22,
                }}
              />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", mb: 1 }}>
              {chunkCount.toLocaleString()}{" "}
              <Typography component="span" sx={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
                / {chunkLimit >= 999999 ? "∞ Unlimited" : `${chunkLimit.toLocaleString()} Passages`}
              </Typography>
            </Typography>

            <LinearProgress
              variant="determinate"
              value={chunkLimit >= 999999 ? 5 : Math.min(100, chunkPercent)}
              sx={{
                height: 6,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.06)",
                "& .MuiLinearProgress-bar": {
                  background: chunkPercent >= 90 ? "linear-gradient(90deg, #f87171, #ef4444)" : "linear-gradient(90deg, #38bdf8, #8b5cf6)",
                },
                mb: 1.5,
              }}
            />

            <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
              {chunkLimit >= 999999
                ? "Dedicated high-dimensional dense + sparse vector indexing active."
                : `${Math.max(0, chunkLimit - chunkCount).toLocaleString()} indexed passage capacity remaining.`}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* SECTION 2: SUBSCRIPTION TIERS & RAZORPAY UPGRADE GRID */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Box>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>
              2. Available Subscription Plans
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>
              Upgrade anytime with instant Razorpay checkout. Payments are secure and encrypted.
            </Typography>
          </Box>

          {/* Billing Cycle Switcher */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "#111827",
              p: 0.5,
              borderRadius: 2,
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Button
              size="small"
              onClick={() => setBillingCycle("monthly")}
              sx={{
                px: 2,
                py: 0.6,
                borderRadius: 2,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: billingCycle === "monthly" ? "#ffffff" : "#94a3b8",
                bgcolor: billingCycle === "monthly" ? "#06b6d4" : "transparent",
                boxShadow: billingCycle === "monthly" ? "0 2px 8px rgba(6, 182, 212, 0.4)" : "none",
                "&:hover": {
                  bgcolor: billingCycle === "monthly" ? "#0891b2" : "rgba(255, 255, 255, 0.04)",
                },
              }}
            >
              Monthly Billing
            </Button>
            <Button
              size="small"
              onClick={() => setBillingCycle("yearly")}
              sx={{
                px: 2,
                py: 0.6,
                borderRadius: 2,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: billingCycle === "yearly" ? "#ffffff" : "#94a3b8",
                bgcolor: billingCycle === "yearly" ? "#06b6d4" : "transparent",
                boxShadow: billingCycle === "yearly" ? "0 2px 8px rgba(6, 182, 212, 0.4)" : "none",
                "&:hover": {
                  bgcolor: billingCycle === "yearly" ? "#0891b2" : "rgba(255, 255, 255, 0.04)",
                },
              }}
            >
              Annual Billing{" "}
              <Chip
                label="Save 20%"
                size="small"
                sx={{
                  ml: 1,
                  bgcolor: "#34d399",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: "0.62rem",
                  height: 18,
                }}
              />
            </Button>
          </Box>
        </Box>

        {/* Plan Cards Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isHighlighted = plan.highlight;
            const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
            const isFree = plan.id === "free";

            return (
              <Box
                key={plan.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 2,
                  bgcolor: isHighlighted ? "rgba(6, 182, 212, 0.06)" : "#0f172a",
                  border: isCurrent
                    ? "2px solid #34d399"
                    : isHighlighted
                    ? "2px solid #06b6d4"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  p: 3,
                  position: "relative",
                  transition: "all 0.25s ease",
                  boxShadow: isHighlighted ? "0 8px 32px rgba(6, 182, 212, 0.2)" : "none",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.4)",
                  },
                }}
              >
                {/* Badges */}
                {isCurrent && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#0f172a !important" }} />}
                    label="Current Plan"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      bgcolor: "#34d399",
                      color: "#0f172a",
                      fontWeight: 800,
                      fontSize: "0.68rem",
                    }}
                  />
                )}
                {!isCurrent && plan.badge && (
                  <Chip
                    icon={<AutoAwesomeIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
                    label={plan.badge}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      bgcolor: plan.id === "enterprise" ? "#8b5cf6" : "#06b6d4",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                    }}
                  />
                )}

                <Typography variant="h6" sx={{ fontWeight: 800, color: "#f8fafc", mb: 0.5 }}>
                  {plan.name}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", minHeight: 38, mb: 2 }}>
                  {plan.tagline}
                </Typography>

                {/* Price Display */}
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 2.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                    {isFree ? "₹0" : `₹${price.toLocaleString("en-IN")}`}
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {isFree ? "/ forever" : billingCycle === "yearly" ? "/ year" : "/ month"}
                  </Typography>
                </Box>

                {/* CTA Action Button */}
                <Button
                  fullWidth
                  variant={isCurrent ? "outlined" : "contained"}
                  disabled={isCurrent || loadingPlan === plan.id}
                  onClick={() => handleUpgrade(plan)}
                  endIcon={!isCurrent && !loadingPlan && <ArrowForwardIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    py: 1.1,
                    borderRadius: 2,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    textTransform: "none",
                    mb: 3,
                    bgcolor: isCurrent
                      ? "transparent"
                      : isHighlighted
                      ? "#06b6d4"
                      : plan.id === "enterprise"
                      ? "#8b5cf6"
                      : "rgba(255, 255, 255, 0.08)",
                    color: isCurrent ? "#34d399" : "#ffffff",
                    borderColor: isCurrent ? "#34d399" : "transparent",
                    boxShadow: !isCurrent && isHighlighted ? "0 4px 14px rgba(6, 182, 212, 0.4)" : "none",
                    "&:hover": {
                      bgcolor: isCurrent
                        ? "rgba(52, 211, 153, 0.1)"
                        : isHighlighted
                        ? "#0891b2"
                        : plan.id === "enterprise"
                        ? "#7c3aed"
                        : "rgba(255, 255, 255, 0.15)",
                    },
                  }}
                >
                  {loadingPlan === plan.id ? (
                    <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                  ) : isCurrent ? (
                    "Active Plan"
                  ) : isFree ? (
                    "Downgrade to Free"
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)", mb: 2.5 }} />

                {/* Features Checklist */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1 }}>
                  {plan.features.map((feat, idx) => (
                    <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                      <CheckCircleIcon
                        sx={{
                          fontSize: 15,
                          color: isHighlighted ? "#818cf8" : "#34d399",
                          mt: 0.25,
                          flexShrink: 0,
                        }}
                      />
                      <Typography sx={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                        {feat}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* SECTION 3: TRANSACTION & PAYMENT HISTORY TABLE */}
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ReceiptLongIcon sx={{ fontSize: 20, color: "#818cf8" }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              3. Payment & Invoicing History
            </Typography>
          </Box>
          <Chip
            label={`${history.length} Invoices`}
            size="small"
            sx={{ bgcolor: "rgba(255, 255, 255, 0.06)", color: "#94a3b8", fontSize: "0.7rem" }}
          />
        </Box>

        <TableContainer
          component={Paper}
          sx={{
            bgcolor: "#111827",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "none",
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.02)" }}>
              <TableRow>
                <TableCell sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", py: 1.5 }}>
                  Order / Receipt ID
                </TableCell>
                <TableCell sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  Plan Tier
                </TableCell>
                <TableCell sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  Billing Cycle
                </TableCell>
                <TableCell sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  Amount
                </TableCell>
                <TableCell sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  Payment ID
                </TableCell>
                <TableCell sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  Date & Time
                </TableCell>
                <TableCell align="center" sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  Status
                </TableCell>
                <TableCell align="right" sx={{ color: "#64748b", fontWeight: 700, fontSize: "0.72rem", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  Invoice
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingHistory ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#64748b" }}>
                    <CircularProgress size={24} sx={{ color: "#06b6d4", mb: 1 }} />
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>Loading transactions...</Typography>
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                    <ReceiptLongIcon sx={{ fontSize: 32, color: "#334155", mb: 1 }} />
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#94a3b8" }}>
                      No Payment Records Found
                    </Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                      When you upgrade to Pro or Enterprise, verified invoices will appear here.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow
                    key={item.id || item.order_id}
                    sx={{
                      "&:hover": { bgcolor: "rgba(255, 255, 255, 0.02)" },
                      "& td": { borderBottom: "1px solid rgba(255, 255, 255, 0.04)" },
                    }}
                  >
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.75rem" }}>
                      {item.order_id}
                    </TableCell>
                    <TableCell sx={{ color: "#818cf8", fontWeight: 700, fontSize: "0.75rem", textTransform: "capitalize" }}>
                      {item.plan_id}
                    </TableCell>
                    <TableCell sx={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "capitalize" }}>
                      {item.billing_cycle}
                    </TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.78rem" }}>
                      {formatAmount(item.amount, item.currency)}
                    </TableCell>
                    <TableCell sx={{ color: "#64748b", fontSize: "0.72rem", fontFamily: "monospace" }}>
                      {item.payment_id || "—"}
                    </TableCell>
                    <TableCell sx={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: "12px !important", color: "#34d399 !important" }} />}
                        label={item.status.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: "rgba(52, 211, 153, 0.12)",
                          color: "#34d399",
                          border: "1px solid rgba(52, 211, 153, 0.25)",
                          fontSize: "0.62rem",
                          fontWeight: 800,
                          height: 20,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Download / Print Official Tax Invoice">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleDownloadInvoice(item)}
                          startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                          sx={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "#22d3ee",
                            borderColor: "rgba(6, 182, 212, 0.3)",
                            bgcolor: "rgba(6, 182, 212, 0.05)",
                            borderRadius: 2,
                            py: 0.4,
                            px: 1.2,
                            textTransform: "none",
                            "&:hover": {
                              bgcolor: "rgba(6, 182, 212, 0.15)",
                              borderColor: "#06b6d4",
                              color: "#ffffff",
                            },
                          }}
                        >
                          Invoice
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Security & Guarantee Footer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          p: 2.5,
          borderRadius: 2,
          bgcolor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShieldIcon sx={{ fontSize: 16, color: "#34d399" }} />
          <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            256-Bit SSL Encrypted Razorpay Gateway
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BoltIcon sx={{ fontSize: 16, color: "#818cf8" }} />
          <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            Instant Automatic Account Provisioning
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WorkspacePremiumIcon sx={{ fontSize: 16, color: "#38bdf8" }} />
          <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            7-Day Money-Back Guarantee
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
