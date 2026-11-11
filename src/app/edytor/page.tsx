import type { Metadata } from "next";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { requireUser } from "@/lib/auth";
import { getCategoryNames, getPublishState } from "@/lib/queries";

export const metadata: Metadata = { title: "Nowy dokument" };

export default async function NewDocumentPage() {
  const user = await requireUser("/edytor");
  const [categories, state] = await Promise.all([getCategoryNames(), getPublishState(user.id)]);

  return (
    <EditorWorkspace
      initial={{
        title: "",
        description: "",
        category: "",
        type: "wpis",
        contentJson: null,
        contentHtml: "",
        moderationStatus: "none",
        rejectionReason: null,
        isPublished: false,
      }}
      categories={categories}
      authorName={user.name}
      activeRejections={state.activeRejections}
      blockedUntil={state.blockedUntil?.toISOString() ?? null}
    />
  );
}
