"use client";

import { Download, FileText, FileType2, Printer } from "lucide-react";

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink hover:bg-paper";

/** Pobieranie dokumentu: PDF (druk stron A4 1:1), Word i TXT (generowane na serwerze) */
export function DownloadButtons({ postId, title }: { postId: string; title: string }) {
  const savePdf = () => {
    // Domyślna nazwa pliku PDF w oknie drukowania = tytuł strony
    const previous = document.title;
    document.title = title;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-muted">
        <Download className="h-4 w-4" /> Pobierz:
      </span>
      <button type="button" onClick={savePdf} className={btn} title="Otworzy okno drukowania — wybierz „Zapisz jako PDF”">
        <Printer className="h-4 w-4 text-red-600" /> PDF
      </button>
      <a href={`/wpis/${postId}/pobierz?format=docx`} className={btn} download>
        <FileType2 className="h-4 w-4 text-blue-600" /> Word
      </a>
      <a href={`/wpis/${postId}/pobierz?format=txt`} className={btn} download>
        <FileText className="h-4 w-4 text-muted" /> TXT
      </a>
    </div>
  );
}
