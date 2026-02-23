import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface CollaborationState {
  isCollaborative: boolean;
}

const CollaborationContext = createContext<CollaborationState>({
  isCollaborative: false,
});

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const [isCollaborative, setIsCollaborative] = useState(false);

  useEffect(() => {
    // Probe the Liveblocks auth endpoint to see if it's configured
    fetch("/api/liveblocks/auth", { method: "POST", credentials: "include" })
      .then((res) => {
        // 200 = configured and authenticated — enable collaboration
        // 503 = not configured, 401 = not logged in yet
        setIsCollaborative(res.status === 200);
      })
      .catch(() => {
        setIsCollaborative(false);
      });
  }, []);

  return (
    <CollaborationContext.Provider value={{ isCollaborative }}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  return useContext(CollaborationContext);
}
