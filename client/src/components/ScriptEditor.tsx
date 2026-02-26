import { useState, useCallback, useRef, useEffect } from "react";
import RichEditor from "./RichEditor";
import CollaborativeEditor from "./CollaborativeEditor";
import { useRefineScript } from "../api/hooks";

/** ~150 wpm for conversational on-camera delivery */
const SPEAKING_WPM = 150;

function speakingTime(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  const minutes = words / SPEAKING_WPM;
  if (minutes < 1) return `${Math.round(minutes * 60)}s to speak`;
  const whole = Math.floor(minutes);
  const secs = Math.round((minutes - whole) * 60);
  if (secs === 0) return `${whole}m to speak`;
  return `${whole}m ${secs}s to speak`;
}

type ChatEntry = { role: "user" | "status"; content: string };

const Spinner = () => (
  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

interface ScriptEditorProps {
  articleId: number;
  script: string | null;
  onSave: (html: string) => void;
  onSavedStateChange: (saved: boolean) => void;
  isCollaborative?: boolean;
}

export default function ScriptEditor({ articleId, script, onSave, onSavedStateChange, isCollaborative }: ScriptEditorProps) {
  const [refineInput, setRefineInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentScriptRef = useRef<string>(script || "");

  const refineScriptMutation = useRefineScript();

  // Keep ref in sync with external changes
  useEffect(() => {
    if (script) {
      currentScriptRef.current = script;
    }
  }, [script]);

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSave = useCallback(
    (html: string) => {
      currentScriptRef.current = html;
      onSave(html);
    },
    [onSave],
  );

  const handleRefine = useCallback(() => {
    const instruction = refineInput.trim();
    if (!instruction) return;

    setChatHistory((prev) => [...prev, { role: "user", content: instruction }]);
    setRefineInput("");

    refineScriptMutation.mutate(
      { id: articleId, instruction, currentScript: currentScriptRef.current },
      {
        onSuccess: () => {
          setChatHistory((prev) => [...prev, { role: "status", content: "Script updated" }]);
        },
        onError: (err) => {
          setChatHistory((prev) => [
            ...prev,
            { role: "status", content: `Error: ${(err as Error).message}` },
          ]);
        },
      },
    );
  }, [articleId, refineInput, refineScriptMutation]);

  const handleRefineKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleRefine();
      }
    },
    [handleRefine],
  );

  const isPending = refineScriptMutation.isPending;

  return (
    <div>
      {isCollaborative ? (
        <CollaborativeEditor
          field="script"
          initialContent={script || ""}
          onSave={handleSave}
          onSavedStateChange={onSavedStateChange}
          placeholder="Write your script here..."
          className="bg-white dark:bg-gray-950 flex-1"
        />
      ) : (
        <RichEditor
          content={script || ""}
          onSave={handleSave}
          onSavedStateChange={onSavedStateChange}
          placeholder="Write your script here..."
          className="bg-white dark:bg-gray-950 flex-1"
        />
      )}

      <div className="mt-3 space-y-2">
        {/* Chat history */}
        {chatHistory.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800/50">
            {chatHistory.map((entry, i) => (
              <div key={i} className={entry.role === "user" ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500 italic"}>
                {entry.role === "user" ? (
                  <span><span className="font-medium text-indigo-600 dark:text-indigo-400">You:</span> {entry.content}</span>
                ) : (
                  <span>{entry.content}</span>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Refinement input */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            onKeyDown={handleRefineKeyDown}
            disabled={isPending}
            className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            placeholder="Refine: e.g. 'shorten the intro' or 'add a transition to the next segment'"
          />
          <button
            onClick={handleRefine}
            disabled={isPending || !refineInput.trim()}
            className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <Spinner />
                Sending...
              </>
            ) : (
              "Send"
            )}
          </button>
        </div>

        {/* Speaking time + error */}
        {(script || refineScriptMutation.isError) && (
          <div className="flex items-center gap-2">
            {(() => {
              const duration = speakingTime(script);
              return duration ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">{duration}</span>
              ) : null;
            })()}
            {refineScriptMutation.isError && (
              <span className="text-xs text-red-500">
                {(refineScriptMutation.error as Error)?.message}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
