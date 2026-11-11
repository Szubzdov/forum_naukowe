import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { requireUser } from "@/lib/auth";
import { getCategoryNames, getPostForEdit } from "@/lib/queries";

export const metadata: Metadata = { title: "Edycja dokumentu" };

export default async function EditDocumentPage({ params }: PageProps<"/edytor/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/edytor/${id}`);
  const [post, categories] = await Promise.all([
    getPostForEdit(id, user.id),
    getCategoryNames(),
  ]);
  if (!post) notFound();

  return (
    <EditorWorkspace
      key={post.id}
      initial={{
        id: post.id,
        title: post.title,
        description: post.description,
        category: post.category ?? "",
        type: post.type,
        contentJson: post.contentJson,
        contentHtml: post.contentHtml,
        isPublished: !!post.publishedAt,
      }}
      categories={categories}
      authorName={user.name}
    />
  );
}
