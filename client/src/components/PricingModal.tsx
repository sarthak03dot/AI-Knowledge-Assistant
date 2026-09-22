import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { createPaymentOrder, verifyPayment } from "../services/api";
import type { User, PricingPlan } from "../types/rag";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onPaymentSuccess: (updatedUser: User) => void;
  onOpenAuth?: () => void;
}

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free Starter",
    tagline: "For individual testing & basic document exploration",
    price_monthly: 0,
    price_yearly: 0,
    currency: "INR",
    features: [
      "Up to 10 Uploaded Documents",
      "Up to 500 Indexed Passages",
      "Executive Analyst AI Persona",
      "Standard Hybrid Search (Dense + Sparse)",
      "Direct Document @ Attachment",
      "Community Support",
    ],
    document_limit: 10,
    chunk_limit: 500,
    badge: "Basic",
  },
  {
    id: "pro",
    name: "Pro Intelligence",
    tagline: "For professionals, analysts & fast research",
    price_monthly: 999,
    price_yearly: 9590,
    currency: "INR",
    features: [
      "Up to 100 Uploaded Documents",
      "Up to 10,000 Indexed Passages",
      "All 5 AI Personas + Custom Builder",
      "Multi-Document Synthesis & Cross-Analysis",
      "Priority Low-Latency LLM Queue",
      "PDF & Markdown Report Exporting",
      "Email & Priority Support",
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
      "Unlimited Documents & Passages",
      "Dedicated Qdrant Vector Storage",
      "Global Cross-Workspace Deep Reasoning",
      "Custom Enterprise Personas & Roles",
      "Full API Access & Webhooks Integration",
      "Dedicated Cloudinary Storage Partition",
      "24/7 Enterprise SLA Support",
    ],
    document_limit: 999999,
    chunk_limit: 999999,
    badge: "Maximum Power",
  },
];

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPaymentSuccess,
  onOpenAuth,
}) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const currentPlan = currentUser?.plan || "free";

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  const handleUpgrade = async (plan: PricingPlan) => {
    if (!currentUser) {
      onClose();
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (plan.id === currentPlan) return;

    setErrorMsg("");
    setSuccessMsg("");
    setLoadingPlan(plan.id);

    try {
      // 1. Create order on backend
      const res = await createPaymentOrder(plan.id, billingCycle);
      const order = res.order;

      // 2. Launch Razorpay Checkout Modal
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const options = {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: "NexusRAG Enterprise",
          description: `Upgrade to ${plan.name} (${billingCycle})`,
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
                currency: order.currency,
              });

              setSuccessMsg(`🎉 Success! Your account is now active on ${plan.name}.`);
              onPaymentSuccess(verifyRes.user);
              setTimeout(() => {
                onClose();
              }, 1800);
            } catch (vErr: any) {
              setErrorMsg(vErr.message || "Payment verification failed. Please contact support.");
            } finally {
              setLoadingPlan(null);
            }
          },
          prefill: {
            name: currentUser.name,
            email: currentUser.email,
          },
          theme: {
            color: "#06b6d4",
            backdrop_color: "#070b14",
          },
          modal: {
            ondismiss: function () {
              setLoadingPlan(null);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          setErrorMsg(resp.error?.description || "Payment failed. Please try again.");
          setLoadingPlan(null);
        });
        rzp.open();
      } else {
        // Direct sandbox fallback simulation
        const verifyRes = await verifyPayment({
          order_id: order.order_id,
          payment_id: `pay_sim_${Date.now()}`,
          signature: "simulated_sandbox_signature",
          plan_id: plan.id,
          billing_cycle: billingCycle,
          amount: order.amount,
          currency: order.currency,
        });

        setSuccessMsg(`🎉 Sandbox Success! Upgraded to ${plan.name}.`);
        onPaymentSuccess(verifyRes.user);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize payment.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#070b14",
            backgroundImage: "none",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            borderRadius: 3,
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(6, 182, 212, 0.15)",
            overflowY: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            msOverflowStyle: "none",
            p: { xs: 2, sm: 3, md: 4 },
          },
        },
      }}
    >
      {/* Top Ambient Glow */}
      <Box
        sx={{
          position: "absolute",
          top: -80,
          left: "50%",
          transform: "translateX(-50%)",
          width: 380,
          height: 160,
          borderRadius: "50%",
          bgcolor: "rgba(6, 182, 212, 0.22)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Header Bar */}
      <DialogTitle sx={{ p: 0, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(6, 182, 212, 0.4)",
                }}
              >
                <WorkspacePremiumRoundedIcon sx={{ fontSize: 18, color: "#ffffff" }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", color: "#f8fafc", letterSpacing: "-0.02em" }}>
                Upgrade Your NexusRAG Plan
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8" }}>
              Scale your knowledge base with priority LLMs, multi-doc reasoning, and unlimited storage.
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: "#64748b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              p: 0.75,
              "&:hover": { color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.08)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Monthly vs Yearly Switcher */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              bgcolor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
              p: 0.5,
              gap: 0.5,
            }}
          >
            <Button
              size="small"
              onClick={() => setBillingCycle("monthly")}
              sx={{
                py: 0.6,
                px: 2,
                fontSize: "0.78rem",
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                transition: "all 0.2s ease",
                ...(billingCycle === "monthly"
                  ? {
                      background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                      color: "#ffffff",
                      boxShadow: "0 2px 8px rgba(6, 182, 212, 0.4)",
                    }
                  : {
                      color: "#94a3b8",
                      "&:hover": { color: "#f8fafc", bgcolor: "transparent" },
                    }),
              }}
            >
              Monthly Billing
            </Button>
            <Button
              size="small"
              onClick={() => setBillingCycle("yearly")}
              sx={{
                py: 0.6,
                px: 2,
                fontSize: "0.78rem",
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 1,
                ...(billingCycle === "yearly"
                  ? {
                      background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                      color: "#ffffff",
                      boxShadow: "0 2px 8px rgba(6, 182, 212, 0.4)",
                    }
                  : {
                      color: "#94a3b8",
                      "&:hover": { color: "#f8fafc", bgcolor: "transparent" },
                    }),
              }}
            >
              Annual Billing
              <Chip
                label="Save 20%"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  bgcolor: "rgba(52, 211, 153, 0.2)",
                  color: "#34d399",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                }}
              />
            </Button>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, pt: 1.5, overflowY: "visible" }}>
        {errorMsg && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              bgcolor: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fda4af",
              borderRadius: 2,
              fontSize: "0.82rem",
            }}
          >
            {errorMsg}
          </Alert>
        )}

        {successMsg && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              bgcolor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#6ee7b7",
              borderRadius: 2,
              fontSize: "0.82rem",
            }}
          >
            {successMsg}
          </Alert>
        )}

        {/* 3 Tier Pricing Cards Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2.5,
            mt: 1.5,
            alignItems: "stretch",
          }}
        >
          {DEFAULT_PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
            const isPopular = plan.highlight;

            return (
              <Box
                key={plan.id}
                sx={{
                  position: "relative",
                  borderRadius: 2,
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  bgcolor: isPopular ? "rgba(6, 182, 212, 0.06)" : "rgba(255, 255, 255, 0.02)",
                  border: isPopular
                    ? "2px solid #06b6d4"
                    : isCurrent
                    ? "1px solid rgba(52, 211, 153, 0.4)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: isPopular
                    ? "0 10px 30px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(6, 182, 212, 0.05)"
                    : "none",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    borderColor: isPopular ? "#22d3ee" : "rgba(255, 255, 255, 0.2)",
                  },
                }}
              >
                {/* Floating Highlight Badge for Most Popular */}
                {isPopular && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      px: 1.75,
                      py: 0.4,
                      borderRadius: 2,
                      background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      boxShadow: "0 4px 14px rgba(6, 182, 212, 0.5)",
                      whiteSpace: "nowrap",
                      zIndex: 2,
                    }}
                  >
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 12, color: "#ffffff" }} />
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#ffffff", letterSpacing: "0.02em" }}>
                      MOST POPULAR
                    </Typography>
                  </Box>
                )}

                {/* Top-Right Badge for Other Plans */}
                {!isPopular && !isCurrent && plan.badge && (
                  <Chip
                    label={plan.badge.toUpperCase()}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      bgcolor: plan.id === "enterprise" ? "rgba(168, 85, 247, 0.15)" : "rgba(255, 255, 255, 0.06)",
                      color: plan.id === "enterprise" ? "#c084fc" : "#94a3b8",
                      border: plan.id === "enterprise" ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      height: 22,
                      borderRadius: 2,
                    }}
                  />
                )}

                {/* Current Active Plan Badge */}
                {isCurrent && !isPopular && (
                  <Chip
                    icon={<CheckCircleRoundedIcon sx={{ fontSize: "13px !important", color: "#34d399 !important" }} />}
                    label="CURRENT"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      bgcolor: "rgba(52, 211, 153, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(52, 211, 153, 0.3)",
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      height: 22,
                      borderRadius: 2,
                    }}
                  />
                )}

                {/* Plan Header */}
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#f8fafc", mb: 0.4 }}>
                    {plan.name}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mb: 2, minHeight: 34 }}>
                    {plan.tagline}
                  </Typography>

                  {/* Price */}
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 2.5 }}>
                    <Typography sx={{ fontSize: "2rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em" }}>
                      ₹{price.toLocaleString()}
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                      /{billingCycle === "yearly" ? "year" : "month"}
                    </Typography>
                  </Box>

                  {/* Feature Checklist */}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 3 }}>
                    {plan.features.map((feat, fIdx) => (
                      <Box key={fIdx} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                        <CheckCircleRoundedIcon
                          sx={{
                            fontSize: 16,
                            color: isPopular ? "#818cf8" : "#34d399",
                            mt: "2px",
                            flexShrink: 0,
                          }}
                        />
                        <Typography sx={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                          {feat}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* CTA Action */}
                <Box sx={{ mt: "auto", pt: 1 }}>
                  {isCurrent ? (
                    <Button
                      fullWidth
                      disabled
                      sx={{
                        py: 1,
                        borderRadius: 2,
                        bgcolor: "rgba(52, 211, 153, 0.12)",
                        border: "1px solid rgba(52, 211, 153, 0.3)",
                        color: "#34d399",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        textTransform: "none",
                      }}
                    >
                      Active Current Plan
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled
                      sx={{
                        py: 1,
                        borderRadius: 2,
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        textTransform: "none",
                      }}
                    >
                      Starter Tier
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleUpgrade(plan)}
                      disabled={loadingPlan !== null}
                      startIcon={
                        loadingPlan === plan.id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : isPopular ? (
                          <BoltRoundedIcon sx={{ fontSize: 17 }} />
                        ) : (
                          <ShieldRoundedIcon sx={{ fontSize: 17 }} />
                        )
                      }
                      sx={{
                        py: 1.1,
                        borderRadius: 2,
                        background: isPopular
                          ? "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)"
                          : "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.84rem",
                        textTransform: "none",
                        boxShadow: isPopular
                          ? "0 4px 16px rgba(6, 182, 212, 0.4)"
                          : "0 4px 16px rgba(139, 92, 246, 0.3)",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          background: isPopular
                            ? "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)"
                            : "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      {loadingPlan === plan.id
                        ? "Opening Checkout..."
                        : `Upgrade to ${plan.id.toUpperCase()}`}
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
