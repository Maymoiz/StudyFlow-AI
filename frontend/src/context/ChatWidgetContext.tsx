import { createContext, useContext, useState, ReactNode } from "react";

interface ChatWidgetContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Set when another page wants to open the widget with a pre-filled,
   * auto-sent question (e.g. "Explain <topic>" from the Subjects page). */
  pendingPrefill: string | null;
  askAI: (question: string) => void;
  clearPendingPrefill: () => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingPrefill, setPendingPrefill] = useState<string | null>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(o => !o);

  // Used by other pages (e.g. Subjects "Ask AI") to open the widget and
  // immediately send a question, replacing the old navigate("/ai", {state}).
  const askAI = (question: string) => {
    setPendingPrefill(question);
    setIsOpen(true);
  };

  const clearPendingPrefill = () => setPendingPrefill(null);

  return (
    <ChatWidgetContext.Provider value={{ isOpen, open, close, toggle, pendingPrefill, askAI, clearPendingPrefill }}>
      {children}
    </ChatWidgetContext.Provider>
  );
}

export function useChatWidget() {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) throw new Error("useChatWidget must be used within a ChatWidgetProvider");
  return ctx;
}