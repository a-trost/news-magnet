import { useOthers } from "@liveblocks/react";

export default function ArticlePresenceIndicator({ articleId }: { articleId: number }) {
  const others = useOthers();
  const editing = others.filter((o) => o.presence.activeArticleId === articleId);

  if (editing.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1 shrink-0">
      {editing.map((user) => (
        <div
          key={user.id}
          className="relative group"
          title={`${user.info.name} is editing`}
        >
          <div
            className="w-4 h-4 rounded-full border border-white dark:border-gray-900"
            style={{ backgroundColor: user.info.color }}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {user.info.name} is editing
          </div>
        </div>
      ))}
    </div>
  );
}
