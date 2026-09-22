import React from "react";
import { Box, Typography } from "@mui/material";

interface PlasmaLoaderProps {
  size?: number;
  message?: string;
}

export const PlasmaLoader: React.FC<PlasmaLoaderProps> = ({ size = 1, message }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
      }}
    >
      <div
        className="plasma-loader-container"
        style={{ transform: `scale(${size})` }}
      >
        <svg width="100" height="100" viewBox="0 0 100 100">
          <defs>
            <mask id="plasma-clipping">
              <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
              <polygon points="25,25 75,25 50,75" fill="white"></polygon>
              <polygon points="50,25 75,75 25,75" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
            </mask>
          </defs>
        </svg>
        <div className="box"></div>
      </div>

      {message && (
        <Typography
          sx={{
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "#94a3b8",
            letterSpacing: "0.02em",
            textAlign: "center",
            mt: 1,
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};
