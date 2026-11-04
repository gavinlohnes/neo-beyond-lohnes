export type SavedInboxItem = {
  id: string;
  createdAt: string;
  source: "SHARE" | "MANUAL";
  title: string;
  text: string;
  url: string | null;
  note: string;
  tags: string[];
};
