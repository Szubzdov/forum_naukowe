import type { Metadata } from "next";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { requireUser } from "@/lib/auth";
import { getCategoryNames } from "@/lib/queries";

export const metadata: Metadata = { title: "Nowy dokument" };

export default async function NewDocumentPage() {
  const user = await requireUser("/edytor");
  const categories = await getCategoryNames();

  return (
    <EditorWorkspace
      initial={{
        title: "",
        description: "",
        category: "",
        type: "wpis",
        contentJson: null,
        contentHtml: "",
        isPublished: false,
      }}
      categories={categories}
      authorName={user.name}
    />
  );
}
