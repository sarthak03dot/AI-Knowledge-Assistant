import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Typography,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LayersClearIcon from "@mui/icons-material/LayersClear";

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  minWidth?: number | string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterControls?: React.ReactNode;
  actionsRight?: React.ReactNode;
  isLoading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search records...",
  filterControls,
  actionsRight,
  isLoading = false,
  emptyTitle = "No records found",
  emptySubtitle = "Try adjusting your search query or filters.",
}: DataTableProps<T>) {
  return (
    <Box sx={{ width: "100%" }}>
      {/* Header Controls Bar */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, flex: 1, minWidth: 260 }}>
          {onSearchChange && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#06b6d4", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: { xs: "100%", sm: 280 },
                "& .MuiOutlinedInput-root": {
                  color: "#f8fafc",
                  fontSize: "0.84rem",
                  bgcolor: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 2.5,
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
                  "&:hover fieldset": { borderColor: "#06b6d4" },
                  "&.Mui-focused fieldset": { borderColor: "#06b6d4", boxShadow: "0 0 10px rgba(6,182,212,0.25)" },
                },
              }}
            />
          )}

          {/* Filter Dropdowns / Controls */}
          {filterControls}
        </Box>

        {/* Right Actions */}
        {actionsRight && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {actionsRight}
          </Box>
        )}
      </Box>

      {/* Table Container Card */}
      <TableContainer
        component={Paper}
        sx={{
          bgcolor: "rgba(15, 23, 42, 0.5)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 3.5,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
          overflowX: "auto",
        }}
      >
        <Table sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || "left"}
                  sx={{
                    color: "#94a3b8",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    py: 1.6,
                    px: 2,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    minWidth: col.minWidth,
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ py: 8, textAlign: "center", borderBottom: "none" }}>
                  <CircularProgress size={36} sx={{ color: "#06b6d4", mb: 1.5 }} />
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 600 }}>
                    Loading data...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} sx={{ py: 8, textAlign: "center", borderBottom: "none" }}>
                  <LayersClearIcon sx={{ fontSize: 42, color: "#475569", mb: 1.5 }} />
                  <Typography sx={{ color: "#f8fafc", fontSize: "0.95rem", fontWeight: 700 }}>
                    {emptyTitle}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.8rem", mt: 0.5 }}>
                    {emptySubtitle}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow
                  key={row.id || row._id || idx}
                  sx={{
                    transition: "all 0.15s ease-in-out",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.03)" },
                    "&:last-child td": { borderBottom: "none" },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align || "left"}
                      sx={{
                        color: "#f8fafc",
                        fontSize: "0.84rem",
                        py: 1.5,
                        px: 2,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      {col.render ? col.render(row, idx) : (row[col.key] !== undefined ? String(row[col.key]) : "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paginated Footer */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          sx={{
            color: "#94a3b8",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            "& .MuiTablePagination-select": {
              color: "#f8fafc",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              borderRadius: 1.5,
              py: 0.5,
            },
            "& .MuiTablePagination-selectIcon": {
              color: "#94a3b8",
            },
            "& .MuiTablePagination-actions button": {
              color: "#f8fafc",
              "&.Mui-disabled": { color: "#475569" },
            },
          }}
        />
      </TableContainer>
    </Box>
  );
}
