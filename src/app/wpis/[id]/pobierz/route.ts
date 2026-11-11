import type { NextRequest } from "next/server";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/constants";
import { htmlToPlainText } from "@/lib/export-text";
import { getPublishedPost } from "@/lib/queries";

/** A4 i marginesy jak w widoku wpisu, w twipach (1 mm ≈ 56.7 twipa) */
const A4 = { width: 11906, height: 16838 };
const MARGINS = { top: 1247, right: 1134, bottom: 1417, left: 1134, header: 567, footer: 567 };

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Nazwa pliku z tytułu: polskie znaki w filename*, wersja bez ogonków jako zapas */
function contentDisposition(title: string, ext: string) {
  const base = title.replace(/[\\/:*?"<>|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "dokument";
  const ascii = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^\x20-\x7e]/g, "");
  return `attachment; filename="${ascii || "dokument"}.${ext}"; filename*=UTF-8''${encodeURIComponent(base)}.${ext}`;
}

export async function GET(request: NextRequest, ctx: RouteContext<"/wpis/[id]/pobierz">) {
  const { id } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format");
  if (format !== "docx" && format !== "txt") {
    return new Response("Nieznany format pliku.", { status: 400 });
  }

  // Pobieranie tylko dla zalogowanych — tak jak pełna treść wpisu
  const user = await getCurrentUser();
  if (!user) {
    const login = new URL(`/logowanie?next=${encodeURIComponent(`/wpis/${id}`)}`, request.url);
    return Response.redirect(login, 303);
  }

  const post = await getPublishedPost(id);
  if (!post) return new Response("Nie znaleziono wpisu.", { status: 404 });

  const title = post.title ?? "Dokument";
  const html = post.html ?? "";
  const published = formatDate(post.firstPublishedAt);

  if (format === "txt") {
    const lines = [
      title,
      "=".repeat(Math.min(title.length, 80)),
      "",
      htmlToPlainText(html),
      "",
      "—",
      `Autor: ${post.authorName}`,
      `Opublikowano: ${published}`,
      "Forum Naukowe",
    ];
    // BOM + CRLF: polskie znaki i nowe linie poprawnie także w starszym Notatniku
    const body = "﻿" + lines.join("\n").replace(/\n/g, "\r\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": contentDisposition(title, "txt"),
        "Cache-Control": "private, no-store",
      },
    });
  }

  const docHtml = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1>${html}</body></html>`;
  // Biblioteka dopisuje numer strony na końcu stopki → „Autor · strona 3” w prawym dolnym rogu
  const footerHtml = `<p style="text-align: right;"><span style="font-size: 9pt; color: #5d6270;">${escapeHtml(post.authorName)} · strona </span></p>`;

  const file = await HTMLtoDOCX(
    docHtml,
    null,
    {
      orientation: "portrait",
      pageSize: A4,
      margins: MARGINS,
      title,
      creator: post.authorName,
      description: post.description ?? undefined,
      lastModifiedBy: post.authorName,
      createdAt: post.firstPublishedAt ?? undefined,
      modifiedAt: post.publishedAt ?? undefined,
      font: "Georgia",
      fontSize: 22, // 11 pt
      footer: true,
      pageNumber: true,
      lang: "pl-PL",
      table: { row: { cantSplit: true } },
    },
    footerHtml,
  );
  const bytes = file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array(file as ArrayBuffer);

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": contentDisposition(title, "docx"),
      "Cache-Control": "private, no-store",
    },
  });
}
