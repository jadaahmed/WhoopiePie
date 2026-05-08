export const communityPostTypes = ["announcement", "event"] as const;

export type CommunityPostType = (typeof communityPostTypes)[number];

export const communityPostTypeLabels: Record<CommunityPostType, string> = {
  announcement: "Announcement",
  event: "Event",
};

export function isCommunityPostType(value: unknown): value is CommunityPostType {
  return (
    typeof value === "string" &&
    communityPostTypes.includes(value as CommunityPostType)
  );
}
