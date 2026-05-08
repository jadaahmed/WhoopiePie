import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createCommunityPost } from "./actions";
import {
  communityPostTypeLabels,
  communityPostTypes,
} from "@/lib/community/options";
import { dashboardPathForRole, getSessionProfile } from "@/lib/auth/session";

type SearchParams = Record<string, string | string[] | undefined>;

const statusMessages: Record<string, string> = {
  missing: "Enter the title, description, category, date, and post type.",
  "save-error": "The announcement or event could not be published. Try again.",
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreateAnnouncementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { displayName, profile, role } = await getSessionProfile();

  if (role === "student") {
    redirect(dashboardPathForRole(role));
  }

  const params = await searchParams;
  const status = getParam(params, "status");

  return (
    <AppShell
      active="post-announcement"
      department={profile?.department}
      displayName={displayName}
      role={role}
    >
      <div className="page-header">
        <div>
          <p className="eyebrow">Community module</p>
          <h1>Post update</h1>
          <p>Create a university-wide announcement or event for all users.</p>
        </div>
        <Link className="button secondary" href="/announcements">
          View hub
        </Link>
      </div>

      {status ? (
        <div className="message-banner error">
          {statusMessages[status] ?? statusMessages["save-error"]}
        </div>
      ) : null}

      <form className="dashboard-card form-card" action={createCommunityPost}>
        <div className="two-column-form">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" required />
          </div>

          <div className="field">
            <label htmlFor="category">Category</label>
            <input id="category" name="category" placeholder="Academic, Campus, HR" required />
          </div>

          <div className="field">
            <label htmlFor="postType">Type</label>
            <select id="postType" name="postType" defaultValue="" required>
              <option value="" disabled>
                Select type
              </option>
              {communityPostTypes.map((postType) => (
                <option key={postType} value={postType}>
                  {communityPostTypeLabels[postType]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="postDate">Date</label>
            <input id="postDate" name="postDate" type="date" required />
          </div>

          <div className="field field-wide">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={6} required />
          </div>
        </div>

        <div className="form-actions">
          <Link className="button secondary" href="/announcements">
            Cancel
          </Link>
          <button className="button" type="submit">
            Publish
          </button>
        </div>
      </form>
    </AppShell>
  );
}
