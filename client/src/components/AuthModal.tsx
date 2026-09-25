import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MailIcon from "@mui/icons-material/Mail";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LayersIcon from "@mui/icons-material/Layers";
import { loginUser, registerUser, verifyRegistrationOTP, resendRegistrationOTP } from "../services/api";
import { TermsModal } from "./TermsModal";
import type { User as UserType } from "../types/rag";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
  dbType?: string;
}

// Visual Showcase Slides
const SHOWCASE_SLIDES = [
  {
    title: "Turn Documents into Intelligence",
    subtitle: "Enterprise RAG workspace for deep document exploration with pinpoint verified citations.",
    badge: "Enterprise AI Platform",
  },
  {
    title: "Zero Hallucination Grounding",
    subtitle: "Hybrid dense & sparse vector search ensures factual, accurate answers every single time.",
    badge: "Verified Knowledge",
  },
  {
    title: "Multi-Doc Reasoning & Insights",
    subtitle: "Attach multiple PDFs, DOCX, and datasets to cross-analyze documents in a single prompt.",
    badge: "Deep Context Engine",
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // Registration name fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-rotate showcase slides every 4 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Focus OTP input when entering verification stage
  useEffect(() => {
    if (isVerifyingOtp) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [isVerifyingOtp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (tab === "register" && !isVerifyingOtp) {
      if (!firstName.trim()) {
        setErrorMsg("Please enter your first name.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match. Please re-enter.");
        return;
      }
      if (!agreeTerms) {
        setErrorMsg("Please accept the Terms & Conditions to proceed.");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isVerifyingOtp) {
        // Step 2: Verify OTP
        const trimmedOtp = otp.trim();
        if (trimmedOtp.length !== 6) {
          setErrorMsg("Please enter the complete 6-digit verification code.");
          setIsLoading(false);
          return;
        }
        const res = await verifyRegistrationOTP(email, trimmedOtp, rememberMe);
        onAuthSuccess(res.user);
        setIsVerifyingOtp(false);
        onClose();
      } else if (tab === "login") {
        // Direct Login
        const res = await loginUser(email, password, rememberMe);
        onAuthSuccess(res.user);
        onClose();
      } else {
        // Step 1: Initiate Registration & send OTP email
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const res = await registerUser(email, password, fullName);
        setIsVerifyingOtp(true);
        setOtp("");
        setResendCooldown(60);
        setSuccessMsg(res.message || `A 6-digit verification code has been sent to ${email}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMsg("");
    setIsResending(true);
    try {
      const res = await resendRegistrationOTP(email);
      setSuccessMsg(res.message || "A new verification code has been sent to your email.");
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToRegister = () => {
    setIsVerifyingOtp(false);
    setOtp("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsVerifyingOtp(false);
      setOtp("");
      setErrorMsg("");
      setSuccessMsg("");
      onClose();
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);
  };

  // Modern input styling matching screenshot aesthetic
  const modernInputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: "rgba(255, 255, 255, 0.04)",
      border: "1px solid rgba(255, 255, 255, 0.09)",
      transition: "all 0.2s ease",
      color: "#f8fafc",
      fontSize: "0.86rem",
      "& fieldset": { border: "none" },
      "&:hover": {
        bgcolor: "rgba(255, 255, 255, 0.07)",
        borderColor: "rgba(6, 182, 212, 0.4)",
      },
      "&.Mui-focused": {
        bgcolor: "rgba(15, 23, 42, 0.95)",
        borderColor: "#06b6d4",
        boxShadow: "0 0 0 3px rgba(6, 182, 212, 0.25), 0 4px 16px rgba(0, 0, 0, 0.4)",
      },
      "& input": {
        py: 1.25,
        px: 1.2,
        color: "#f8fafc",
        "&::placeholder": { color: "#64748b", opacity: 1, fontSize: "0.84rem" },
      },
      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": {
        WebkitBoxShadow: "0 0 0 1000px #0b1120 inset !important",
        WebkitTextFillColor: "#f8fafc !important",
        caretColor: "#06b6d4 !important",
        borderRadius: 2,
      },
    },
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#070b14",
            backgroundImage: "none",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            borderRadius: 3,
            boxShadow: "0 30px 70px -10px rgba(0, 0, 0, 0.9), 0 0 50px rgba(6, 182, 212, 0.15)",
            overflow: "hidden",
            maxWidth: { xs: "92vw", sm: 520, md: 890 },
            m: { xs: 1.5, sm: 2 },
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          minHeight: { xs: "auto", md: 580 },
          position: "relative",
        }}
      >
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Modern Visual Showcase Card */}
        {/* ========================================================================= */}
        <Box
          sx={{
            flex: { xs: "none", md: "0 0 44%" },
            position: "relative",
            minHeight: { xs: 180, md: "auto" },
            p: { xs: 2.5, sm: 3, md: 4 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            backgroundImage: `url(/auth_showcase.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Rich Dark Gradient Overlay */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(11, 15, 25, 0.4) 0%, rgba(11, 15, 25, 0.75) 45%, rgba(11, 15, 25, 0.95) 100%)",
              backdropFilter: "blur(2px)",
              zIndex: 1,
            }}
          />

          {/* Top Brand Bar */}
          <Box
            sx={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Logo */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(6, 182, 212, 0.5)",
                }}
              >
                <LayersIcon sx={{ fontSize: 20, color: "#ffffff" }} />
              </Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "1.05rem",
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                  fontFamily: "inherit",
                }}
              >
                Nexus<Box component="span" sx={{ color: "#22d3ee" }}>RAG</Box>
              </Typography>
            </Box>

            {/* Badge */}
            <Box
              sx={{
                px: 1.25,
                py: 0.4,
                borderRadius: 2,
                bgcolor: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                gap: 0.6,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 12, color: "#fbbf24" }} />
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#e2e8f0" }}>
                {SHOWCASE_SLIDES[activeSlide].badge}
              </Typography>
            </Box>
          </Box>

          {/* Bottom Showcase Content & Carousel Indicators */}
          <Box sx={{ position: "relative", zIndex: 2, mt: { xs: 4, md: "auto" } }}>
            <Box sx={{ minHeight: { xs: 60, md: 90 }, transition: "all 0.3s ease" }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.2rem", md: "1.45rem" },
                  color: "#ffffff",
                  lineHeight: 1.25,
                  letterSpacing: "-0.02em",
                  mb: 0.75,
                }}
              >
                {SHOWCASE_SLIDES[activeSlide].title}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "0.78rem", md: "0.82rem" },
                  color: "#cbd5e1",
                  lineHeight: 1.55,
                  maxWidth: 340,
                }}
              >
                {SHOWCASE_SLIDES[activeSlide].subtitle}
              </Typography>
            </Box>

            {/* Carousel Dots */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 2.5 }}>
              {SHOWCASE_SLIDES.map((_, idx) => (
                <Box
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  sx={{
                    height: 4,
                    width: activeSlide === idx ? 22 : 6,
                    borderRadius: 2,
                    bgcolor: activeSlide === idx ? "#818cf8" : "rgba(255, 255, 255, 0.25)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "#a5b4fc" },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Authentication Form */}
        {/* ========================================================================= */}
        <Box
          sx={{
            flex: { xs: "1 1 auto", md: "0 0 56%" },
            p: { xs: 3, sm: 3.5, md: 4 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            bgcolor: "#0d111d",
            overflowY: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            msOverflowStyle: "none",
          }}
        >
          {/* Close button */}
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 18,
              right: 18,
              color: "#64748b",
              bgcolor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              p: 0.75,
              "&:hover": { color: "#f8fafc", bgcolor: "rgba(255, 255, 255, 0.08)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {/* Top Pill Switcher (Sign Up / Log In) */}
          {!isVerifyingOtp && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2, mr: 4 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.09)",
                  borderRadius: 2,
                  p: 0.4,
                  gap: 0.3,
                }}
              >
                <Button
                  size="small"
                  onClick={() => {
                    setTab("register");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  sx={{
                    py: 0.4,
                    px: 1.75,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: "none",
                    transition: "all 0.2s ease",
                    ...(tab === "register"
                      ? {
                          background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                          color: "#ffffff",
                          boxShadow: "0 2px 10px rgba(6, 182, 212, 0.45)",
                          "&:hover": { background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)" },
                        }
                      : {
                          color: "#94a3b8",
                          "&:hover": { color: "#f8fafc", bgcolor: "transparent" },
                        }),
                  }}
                >
                  Sign Up
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setTab("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  sx={{
                    py: 0.4,
                    px: 1.75,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: "none",
                    transition: "all 0.2s ease",
                    ...(tab === "login"
                      ? {
                          background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                          color: "#ffffff",
                          boxShadow: "0 2px 10px rgba(6, 182, 212, 0.45)",
                          "&:hover": { background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)" },
                        }
                      : {
                          color: "#94a3b8",
                          "&:hover": { color: "#f8fafc", bgcolor: "transparent" },
                        }),
                  }}
                >
                  Log In
                </Button>
              </Box>
            </Box>
          )}

          {/* Header Title */}
          <Box sx={{ mb: 2.2 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.4rem", sm: "1.65rem" },
                color: "#ffffff",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {isVerifyingOtp
                ? "Verify Email Code"
                : tab === "register"
                ? "Create an Account"
                : "Welcome Back"}
            </Typography>

            {!isVerifyingOtp && (
              <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8", mt: 0.5 }}>
                {tab === "register"
                  ? "Start asking questions and exploring your documents"
                  : "Sign in to access your private document workspace"}
              </Typography>
            )}
          </Box>

          {/* Error & Success Feedback Alerts */}
          {errorMsg && (
            <Alert
              severity="error"
              sx={{
                fontSize: "0.78rem",
                py: 0.5,
                mb: 2,
                bgcolor: "rgba(244, 63, 94, 0.12)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fda4af",
                borderRadius: 2,
              }}
            >
              {errorMsg}
            </Alert>
          )}

          {successMsg && (
            <Alert
              severity="success"
              icon={<CheckCircleOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{
                fontSize: "0.78rem",
                py: 0.5,
                mb: 2,
                bgcolor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#6ee7b7",
                borderRadius: 2,
              }}
            >
              {successMsg}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* ------------------------------------------------------------- */}
            {/* VIEW A: OTP Verification Stage */}
            {/* ------------------------------------------------------------- */}
            {isVerifyingOtp ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      bgcolor: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 1.25,
                    }}
                  >
                    <MarkEmailReadOutlinedIcon sx={{ fontSize: 22, color: "#38bdf8" }} />
                  </Box>
                  <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                    We sent a 6-digit verification code to
                  </Typography>
                  <Typography sx={{ fontSize: "0.92rem", fontWeight: 700, color: "#f8fafc", mt: 0.25 }}>
                    {email}
                  </Typography>
                </Box>

                {/* OTP Input Field */}
                <Box>
                  <TextField
                    inputRef={otpInputRef}
                    type="text"
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="000000"
                    required
                    fullWidth
                    autoFocus
                    slotProps={{
                      htmlInput: {
                        maxLength: 6,
                        style: {
                          textAlign: "center",
                          fontSize: "1.75rem",
                          letterSpacing: "0.38em",
                          fontWeight: 800,
                          fontFamily: "monospace",
                          color: "#818cf8",
                          padding: "12px 14px",
                        },
                      },
                      input: {
                        sx: {
                          borderRadius: 2,
                          bgcolor: "rgba(255, 255, 255, 0.04)",
                          border: "2px solid rgba(99, 102, 241, 0.4)",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                          "&:hover": { borderColor: "rgba(99, 102, 241, 0.7)" },
                          "&.Mui-focused": {
                            borderColor: "#818cf8",
                            boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.25)",
                          },
                          "& fieldset": { border: "none" },
                        },
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1, px: 0.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b" }}>
                      <ShieldOutlinedIcon sx={{ fontSize: 13 }} />
                      <Typography sx={{ fontSize: "0.7rem" }}>Valid for 10 minutes</Typography>
                    </Box>
                    <Button
                      size="small"
                      disabled={resendCooldown > 0 || isResending}
                      onClick={handleResendOtp}
                      startIcon={isResending ? <CircularProgress size={12} color="inherit" /> : <RefreshIcon sx={{ fontSize: 13 }} />}
                      sx={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: resendCooldown > 0 ? "#64748b" : "#818cf8",
                        p: 0,
                        textTransform: "none",
                        "&:hover": { color: "#a5b4fc", bgcolor: "transparent" },
                      }}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </Button>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          size="small"
                          sx={{
                            color: "#64748b",
                            "&.Mui-checked": { color: "#06b6d4" },
                            p: 0.5,
                            mr: 0.5,
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>Remember me on this device</Typography>}
                    />
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={handleBackToRegister}
                    disabled={isLoading}
                    startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                    sx={{
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      color: "#94a3b8",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      py: 1.1,
                      px: 2,
                      borderRadius: 2,
                      textTransform: "none",
                      "&:hover": { borderColor: "rgba(255, 255, 255, 0.25)", bgcolor: "rgba(255, 255, 255, 0.04)", color: "#f8fafc" },
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading || otp.trim().length !== 6}
                    startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlinedIcon sx={{ fontSize: 17 }} />}
                    sx={{
                      flex: 1,
                      background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      py: 1.1,
                      borderRadius: 2,
                      boxShadow: "0 4px 18px rgba(6, 182, 212, 0.4)",
                      textTransform: "none",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
                        boxShadow: "0 6px 24px rgba(6, 182, 212, 0.55)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    {isLoading ? "Verifying..." : "Verify & Complete"}
                  </Button>
                </Box>
              </Box>
            ) : (
              /* ------------------------------------------------------------- */
              /* VIEW B: Sign Up & Log In Forms */
              /* ------------------------------------------------------------- */
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                {/* Sign Up: First Name & Last Name Split Row */}
                {tab === "register" && (
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        type="text"
                        size="small"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        fullWidth
                        sx={modernInputSx}
                        slotProps={{
                          input: {
                            startAdornment: <PersonIcon sx={{ fontSize: 18, color: "#64748b", mr: 0.75 }} />,
                          },
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        type="text"
                        size="small"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        fullWidth
                        sx={modernInputSx}
                      />
                    </Box>
                  </Box>
                )}

                {/* Email Address */}
                <Box>
                  <TextField
                    type="email"
                    size="small"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    sx={modernInputSx}
                    slotProps={{
                      input: {
                        startAdornment: <MailIcon sx={{ fontSize: 18, color: "#64748b", mr: 0.75 }} />,
                      },
                    }}
                  />
                </Box>

                {/* Password */}
                <Box>
                  <TextField
                    type={showPassword ? "text" : "password"}
                    size="small"
                    placeholder={tab === "register" ? "Create password (min 6 chars)" : "Enter password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    sx={modernInputSx}
                    slotProps={{
                      htmlInput: { minLength: 6 },
                      input: {
                        startAdornment: <LockOutlinedIcon sx={{ fontSize: 18, color: "#64748b", mr: 0.75 }} />,
                        endAdornment: (
                          <IconButton
                            size="small"
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            sx={{ color: "#64748b", p: 0.5, "&:hover": { color: "#f8fafc" } }}
                          >
                            {showPassword ? <VisibilityOffIcon sx={{ fontSize: 17 }} /> : <VisibilityIcon sx={{ fontSize: 17 }} />}
                          </IconButton>
                        ),
                      },
                    }}
                  />
                </Box>

                {/* Sign Up: Confirm Password */}
                {tab === "register" && (
                  <Box>
                    <TextField
                      type={showConfirmPassword ? "text" : "password"}
                      size="small"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      fullWidth
                      sx={modernInputSx}
                      slotProps={{
                        htmlInput: { minLength: 6 },
                        input: {
                          startAdornment: <LockOutlinedIcon sx={{ fontSize: 18, color: "#64748b", mr: 0.75 }} />,
                          endAdornment: (
                            <IconButton
                              size="small"
                              type="button"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              sx={{ color: "#64748b", p: 0.5, "&:hover": { color: "#f8fafc" } }}
                            >
                              {showConfirmPassword ? <VisibilityOffIcon sx={{ fontSize: 17 }} /> : <VisibilityIcon sx={{ fontSize: 17 }} />}
                            </IconButton>
                          ),
                        },
                      }}
                    />
                  </Box>
                )}

                {/* Checkbox: Terms for Register / Forgot Password for Login */}
                {tab === "register" ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: -0.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            size="small"
                            sx={{
                              color: "#64748b",
                              "&.Mui-checked": { color: "#06b6d4" },
                              p: 0.5,
                              mr: 0.5,
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", userSelect: "none" }}>
                            I agree to the{" "}
                            <Box
                              component="span"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsTermsOpen(true);
                              }}
                              sx={{
                                color: "#f8fafc",
                                fontWeight: 600,
                                textDecoration: "underline",
                                cursor: "pointer",
                                "&:hover": { color: "#22d3ee" },
                              }}
                            >
                              Terms & Conditions
                            </Box>
                          </Typography>
                        }
                      />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            size="small"
                            sx={{
                              color: "#64748b",
                              "&.Mui-checked": { color: "#06b6d4" },
                              p: 0.5,
                              mr: 0.5,
                            }}
                          />
                        }
                        label={<Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>Remember me on this device</Typography>}
                      />
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: -0.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          size="small"
                          sx={{
                            color: "#64748b",
                            "&.Mui-checked": { color: "#06b6d4" },
                            p: 0.5,
                            mr: 0.5,
                          }}
                        />
                      }
                      label={<Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>Remember me</Typography>}
                    />
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "#22d3ee",
                        fontWeight: 600,
                        cursor: "pointer",
                        "&:hover": { color: "#a5b4fc" },
                      }}
                    >
                      Forgot password?
                    </Typography>
                  </Box>
                )}

                {/* Primary Action Button */}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                  sx={{
                    mt: 0.5,
                    background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    py: 1.25,
                    borderRadius: 2,
                    boxShadow: "0 4px 18px rgba(6, 182, 212, 0.4)",
                    textTransform: "none",
                    letterSpacing: "-0.01em",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
                      boxShadow: "0 6px 24px rgba(6, 182, 212, 0.55)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  {isLoading
                    ? "Processing..."
                    : tab === "register"
                    ? "Create an Account"
                    : "Sign In"}
                </Button>

                {/* "Or register with" Social Divider */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    my: 1,
                  }}
                >
                  <Box sx={{ flex: 1, height: "1px", bgcolor: "rgba(255, 255, 255, 0.08)" }} />
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
                    {tab === "register" ? "Or register with" : "Or continue with"}
                  </Typography>
                  <Box sx={{ flex: 1, height: "1px", bgcolor: "rgba(255, 255, 255, 0.08)" }} />
                </Box>

                {/* Social Login Buttons (Google, Facebook/GitHub, Apple) */}
                <Box sx={{ display: "flex", gap: 1.25 }}>
                  {/* Google */}
                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{
                      py: 0.8,
                      borderRadius: 2,
                      borderColor: "rgba(255, 255, 255, 0.09)",
                      bgcolor: "rgba(255, 255, 255, 0.02)",
                      "&:hover": {
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        bgcolor: "rgba(255, 255, 255, 0.06)",
                      },
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </Button>

                  {/* Facebook / Enterprise SSO */}
                  {/* <Button
                    fullWidth
                    variant="outlined"
                    sx={{
                      py: 0.8,
                      borderRadius: 2,
                      borderColor: "rgba(255, 255, 255, 0.09)",
                      bgcolor: "rgba(255, 255, 255, 0.02)",
                      "&:hover": {
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        bgcolor: "rgba(255, 255, 255, 0.06)",
                      },
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </Button> */}

                  {/* Apple */}
                  {/* <Button
                    fullWidth
                    variant="outlined"
                    sx={{
                      py: 0.8,
                      borderRadius: 2,
                      borderColor: "rgba(255, 255, 255, 0.09)",
                      bgcolor: "rgba(255, 255, 255, 0.02)",
                      "&:hover": {
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        bgcolor: "rgba(255, 255, 255, 0.06)",
                      },
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-1 .04-2.14.67-2.8 1.45-.58.67-1.1 1.76-.96 2.85 1.11.09 2.15-.55 2.77-1.26z" />
                    </svg>
                  </Button> */}
                </Box>
              </Box>
            )}
          </form>
        </Box>
      </Box>

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />
    </Dialog>
  );
};
