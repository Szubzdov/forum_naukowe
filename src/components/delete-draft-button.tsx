"use client";

import { Trash2 } from "lucide-react";
import { deleteDraft } from "@/app/actions/posts";

export function DeleteDraftButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteDraft.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm(`Usunąć szkic „${title || "Bez tytułu"}”? Tej operacji nie można cofnąć.`)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        title="Usuń szkic"
        aria-label="Usuń szkic"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
