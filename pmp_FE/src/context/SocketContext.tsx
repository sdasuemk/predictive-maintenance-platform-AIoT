import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { TelemetryPayload, Alert } from "../types/telemetry";

export const getBackendUrl = (): string => {
  const saved = typeof window !== "undefined" ? localStorage.getItem("pmp_backend_url") : null;
  if (saved) return saved.trim();

  const raw = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").trim();
  if (raw === "pmp-sensor-simulator" || raw === "https://pmp-sensor-simulator") {
    return "https://pmp-sensor-simulator.onrender.com";
  }
  return raw.startsWith("http") ? raw : `https://${raw}`;
};

interface SocketContextType {
  isConnected: boolean;
  backendUrl: string;
  setCustomBackendUrl: (url: string) => void;
  telemetry: TelemetryPayload | null;
  history: TelemetryPayload[];
  alarms: Alert[];
  changeSetpoint: (setpoint: number) => void;
  injectFailure: (mode: string) => void;
  resetFeeder: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backendUrl, setBackendUrlState] = useState<string>(getBackendUrl());
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [history, setHistory] = useState<TelemetryPayload[]>([]);
  const [alarms, setAlarms] = useState<Alert[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const setCustomBackendUrl = (newUrl: string) => {
    const formatted = newUrl.trim().startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`;
    localStorage.setItem("pmp_backend_url", formatted);
    setBackendUrlState(formatted);
  };

  useEffect(() => {
    console.log("[SocketContext] Connecting to backend at:", backendUrl);
    // Connect to Socket.IO backend
    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[SocketContext] Connected to websocket gateway at:", backendUrl);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("[SocketContext] Disconnected from websocket gateway.");
    });

    socket.on("telemetry:stream", (payload: TelemetryPayload) => {
      setTelemetry(payload);
      
      // Update history buffer (keep last 30 ticks)
      setHistory((prev) => {
        const next = [...prev, payload];
        if (next.length > 30) {
          return next.slice(next.length - 30);
        }
        return next;
      });

      // Keep track of active alarms in the current tick
      if (payload.alerts && payload.alerts.length > 0) {
        setAlarms((prev) => {
          // Merge lists and filter out duplicates using a code + timestamp signature
          const currentAlertCodes = new Set(payload.alerts.map(a => a.code + a.timestamp));
          const oldAlarmsFiltered = prev.filter(a => !currentAlertCodes.has(a.code + a.timestamp));
          
          const combined = [...payload.alerts, ...oldAlarmsFiltered];
          // Limit total alarm logs in dashboard to last 50 entries
          return combined.slice(0, 50);
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [backendUrl]);

  const changeSetpoint = (setpoint: number) => {
    if (socketRef.current) {
      socketRef.current.emit("control:setpoint", { setpoint });
    }
  };

  const injectFailure = (mode: string) => {
    if (socketRef.current) {
      socketRef.current.emit("control:failure", { mode });
    }
  };

  const resetFeeder = () => {
    if (socketRef.current) {
      socketRef.current.emit("control:reset");
      // Instantly clear client-side alarms on reset trigger
      setAlarms([]);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        backendUrl,
        setCustomBackendUrl,
        telemetry,
        history,
        alarms,
        changeSetpoint,
        injectFailure,
        resetFeeder
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
