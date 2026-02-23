import { useOthers, useSelf } from "@liveblocks/react";

export default function ActiveUsers() {
  const others = useOthers();
  const self = useSelf();

  const users = [
    ...(self
      ? [{ id: self.id, info: self.info, isSelf: true }]
      : []),
    ...others.map((o) => ({ id: o.id, info: o.info, isSelf: false })),
  ];

  if (users.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5">
      {users.map((user) => (
        <div
          key={user.id}
          className="relative group"
          title={user.isSelf ? `${user.info.name} (you)` : user.info.name}
        >
          {user.info.avatar ? (
            <img
              src={user.info.avatar}
              alt={user.info.name}
              className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900"
              style={{ boxShadow: `0 0 0 1px ${user.info.color}` }}
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-medium text-white"
              style={{ backgroundColor: user.info.color }}
            >
              {user.info.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {user.isSelf ? "You" : user.info.name}
          </div>
        </div>
      ))}
    </div>
  );
}
