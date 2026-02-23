import { useState } from "react";
import {
  useCriteria,
  useCreateCriteria,
  useUpdateCriteria,
  useDeleteCriteria,
} from "../api/hooks";

export default function CriteriaPage() {
  const { data: criteria, isLoading } = useCriteria();
  const createCriteria = useCreateCriteria();
  const updateCriteria = useUpdateCriteria();
  const deleteCriteria = useDeleteCriteria();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Track which criteria are being edited
  const [editing, setEditing] = useState<Record<number, { name: string; description: string }>>({});

  function startEdit(id: number, name: string, description: string) {
    setEditing((e) => ({ ...e, [id]: { name, description } }));
  }

  function cancelEdit(id: number) {
    setEditing((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
  }

  function saveEdit(id: number) {
    const edit = editing[id];
    if (!edit) return;
    updateCriteria.mutate({ id, name: edit.name, description: edit.description });
    cancelEdit(id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Criteria</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
        >
          Add Criteria
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 broadcast-card rounded-lg p-4 mb-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">New Criteria</h3>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
            placeholder="Criteria name"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
            rows={6}
            placeholder="Describe what makes an article relevant..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (newName && newDesc) {
                  createCriteria.mutate({ name: newName, description: newDesc });
                  setNewName("");
                  setNewDesc("");
                  setShowAdd(false);
                }
              }}
              className="px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">Loading criteria...</p>
      ) : !criteria || criteria.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-base">No criteria yet</p>
          <p className="text-sm mt-1">Add criteria to define what articles are relevant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.map((c) => {
            const isEditing = editing[c.id] !== undefined;
            const edit = editing[c.id];

            return (
              <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 broadcast-card rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  {isEditing ? (
                    <input
                      value={edit.name}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [c.id]: { ...prev[c.id], name: e.target.value },
                        }))
                      }
                      className="border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm font-medium flex-1 mr-2 bg-white dark:bg-gray-800 dark:text-gray-200"
                    />
                  ) : (
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{c.name}</h3>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    <input
                      type="checkbox"
                      checked={c.is_active}
                      onChange={(e) =>
                        updateCriteria.mutate({ id: c.id, is_active: e.target.checked })
                      }
                      className="rounded"
                    />
                    Active
                  </label>
                </div>

                {isEditing ? (
                  <textarea
                    value={edit.description}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [c.id]: { ...prev[c.id], description: e.target.value },
                      }))
                    }
                    className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
                    rows={8}
                  />
                ) : (
                  <pre className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap mb-3">
                    {c.description}
                  </pre>
                )}

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => cancelEdit(c.id)}
                        className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(c.id, c.name, c.description)}
                        className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete criteria "${c.name}"?`))
                            deleteCriteria.mutate(c.id);
                        }}
                        className="px-3 py-1 text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
