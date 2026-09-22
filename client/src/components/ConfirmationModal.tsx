import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <DeleteForeverOutlinedIcon sx={{ fontSize: 24, color: "#f43f5e" }} />,
          iconBg: "rgba(244, 63, 94, 0.15)",
          iconBorder: "rgba(244, 63, 94, 0.3)",
          btnBg: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
          btnHover: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
          btnShadow: "0 4px 14px rgba(244, 63, 94, 0.4)",
        };
      case "warning":
        return {
          icon: <WarningAmberRoundedIcon sx={{ fontSize: 24, color: "#f59e0b" }} />,
          iconBg: "rgba(245, 158, 11, 0.15)",
          iconBorder: "rgba(245, 158, 11, 0.3)",
          btnBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          btnHover: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
          btnShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
        };
      default:
        return {
          icon: <HelpOutlineRoundedIcon sx={{ fontSize: 24, color: "#06b6d4" }} />,
          iconBg: "rgba(6, 182, 212, 0.15)",
          iconBorder: "rgba(6, 182, 212, 0.3)",
          btnBg: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
          btnHover: "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #7c3aed 100%)",
          btnShadow: "0 4px 14px rgba(6, 182, 212, 0.4)",
        };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#0b1120",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            borderRadius: 2.5,
            boxShadow: "0 24px 48px rgba(0,0,0,0.7)",
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: currentStyles.iconBg,
              border: `1px solid ${currentStyles.iconBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {currentStyles.icon}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#f8fafc" }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Action Confirmation
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1.5 }}>
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "#cbd5e1",
            lineHeight: 1.6,
          }}
        >
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isLoading}
          sx={{
            borderColor: "rgba(255, 255, 255, 0.15)",
            color: "#94a3b8",
            fontSize: "0.82rem",
            px: 2,
            "&:hover": {
              borderColor: "rgba(255, 255, 255, 0.3)",
              color: "#f8fafc",
              bgcolor: "rgba(255, 255, 255, 0.04)",
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            background: currentStyles.btnBg,
            boxShadow: currentStyles.btnShadow,
            fontWeight: 700,
            fontSize: "0.82rem",
            px: 2.5,
            py: 0.8,
            "&:hover": {
              background: currentStyles.btnHover,
            },
          }}
        >
          {isLoading ? "Processing..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
