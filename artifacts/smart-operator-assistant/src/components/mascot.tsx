import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type MascotState = "idle" | "greeting" | "warning" | "alert";

type MascotContextValue = {
  mascotState: MascotState;
  message: string;
  setMascotState: (state: MascotState, message: string) => void;
};

const MascotContext = createContext<MascotContextValue | null>(null);

const stateLabels: Record<MascotState, string> = {
  idle: "STANDBY",
  greeting: "READY",
  warning: "WATCHFUL",
  alert: "ATTENTION",
};

export function MascotProvider({ children }: { children: ReactNode }) {
  const [mascotState, setState] = useState<MascotState>("idle");
  const [message, setMessage] = useState("Let's get you geared up before we start");

  const value = useMemo(
    () => ({
      mascotState,
      message,
      setMascotState: (nextState: MascotState, nextMessage: string) => {
        setState(nextState);
        setMessage(nextMessage);
      },
    }),
    [mascotState, message],
  );

  return <MascotContext.Provider value={value}>{children}</MascotContext.Provider>;
}

export function useMascot() {
  const context = useContext(MascotContext);
  if (!context) {
    throw new Error("useMascot must be used inside MascotProvider");
  }
  return context;
}

export function Mascot({
  mascotState,
  message,
}: {
  mascotState: MascotState;
  message: string;
}) {
  const label = stateLabels[mascotState];
  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-6">
      <div
        className={`mascot-shell ${mascotState === "alert" ? "mascot-alert" : "mascot-breathe"}`}
        data-testid="mascot-status"
      >
        <svg
          viewBox="0 0 220 220"
          className="h-44 w-44 sm:h-52 sm:w-52"
          role="img"
          aria-label={`Assistant ${label.toLowerCase()}`}
        >
          {/* Replace the shapes inside these groups when the final mascot SVG arrives. */}
          <g id="mascot-ring">
            <circle cx="110" cy="110" r="101" className="mascot-ring-base" />
            <circle
              cx="110"
              cy="110"
              r="91"
              className={`mascot-ring mascot-ring-${mascotState}`}
            />
          </g>
          <g id="mascot-body">
            <circle cx="110" cy="110" r="76" className="mascot-body" />
            <circle cx="110" cy="110" r="70" className="mascot-body-highlight" />
            <path d="M34 119c-15-8-19-21-10-31 7-8 18-5 27 8" className="mascot-hand" />
            <path d="M186 119c15-8 19-21 10-31-7-8-18-5-27 8" className="mascot-hand" />
          </g>
          <g id="mascot-face">
            <circle cx="84" cy="105" r="7" className="mascot-eye" />
            <circle cx="136" cy="105" r="7" className="mascot-eye" />
            {mascotState === "alert" ? (
              <ellipse cx="110" cy="143" rx="13" ry="17" className="mascot-mouth" />
            ) : (
              <path
                d={
                  mascotState === "warning"
                    ? "M93 146h34"
                    : "M91 140c11 12 27 12 38 0"
                }
                className="mascot-mouth"
              />
            )}
          </g>
        </svg>
        <div className={`mascot-label mascot-label-${mascotState}`}>{label}</div>
      </div>
      <div className="mascot-speech max-w-xs rounded-2xl border border-[#795f31] bg-[#2b2519] px-4 py-3 text-center text-sm leading-relaxed text-[#f4e3bd] md:text-left">
        {message}
      </div>
    </div>
  );
}