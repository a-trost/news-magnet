import { useState, useEffect } from "react";
import { useSetting, useUpdateSetting } from "../api/hooks";

export default function SettingsPage() {
  const { data: setting, isLoading } = useSetting("voice_prompt");
  const updateSetting = useUpdateSetting();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (setting?.value !== undefined) {
      setValue(setting.value);
    }
  }, [setting?.value]);

  const handleSave = () => {
    updateSetting.mutate(
      { key: "voice_prompt", value },
      { onSuccess: () => setSaved(true) },
    );
  };

  const handleChange = (v: string) => {
    setValue(v);
    setSaved(false);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          Voice / Style Prompt
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Describe how the AI should write draft segments — your tone, humor style, pacing, and personality.
          This prompt is used when generating draft scripts from show notes.
        </p>
        {isLoading ? (
          <div className="h-40 bg-gray-50 dark:bg-gray-800 rounded-md animate-pulse" />
        ) : (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            rows={8}
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            placeholder="e.g. You're a witty, conversational tech host — think someone who genuinely loves web dev but doesn't take themselves too seriously. You explain things clearly for a broad developer audience, use casual language, and drop in humor naturally without forcing it."
          />
        )}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleSave}
            disabled={saved || updateSetting.isPending}
            className="text-sm px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateSetting.isPending ? "Saving..." : "Save"}
          </button>
          {saved && !isLoading && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {setting?.updated_at ? "Saved" : "Using default voice"}
            </span>
          )}
          {!saved && (
            <span className="text-xs text-amber-500">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
