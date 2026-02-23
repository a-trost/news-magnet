declare global {
  interface Liveblocks {
    Presence: { activeArticleId: number | null };
    UserMeta: {
      id: string;
      info: { name: string; color: string; avatar?: string };
    };
  }
}

export {};
