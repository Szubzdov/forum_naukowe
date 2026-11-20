import { getCurrentUser } from "@/lib/auth";
import { ImportError, importDocx, importPdf } from "@/lib/import-document";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/** Przesłany plik Word/PDF → HTML do wstawienia w edytorze. Pliku nie zapisujemy na serwerze. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Zaloguj się, aby przesłać plik." }, { status: 401 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Nie udało się odebrać pliku." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Wybierz plik do przesłania." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Plik jest za duży (maksymalnie 15 MB)." }, { status: 413 });
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  // Rozpoznanie po zawartości, nie tylko po rozszerzeniu
  const isPdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b; // .docx to archiwum ZIP

  try {
    if (isPdf) return Response.json(await importPdf(buffer));
    if (isZip && name.endsWith(".docx")) return Response.json(await importDocx(buffer));
    if (name.endsWith(".doc") || name.endsWith(".rtf") || name.endsWith(".odt")) {
      return Response.json(
        {
          error:
            "Ten format nie jest obsługiwany. Otwórz plik w Wordzie i zapisz go jako .docx (Plik → Zapisz jako → Dokument programu Word).",
        },
        { status: 415 },
      );
    }
    return Response.json({ error: "Obsługiwane pliki: Word (.docx) i PDF." }, { status: 415 });
  } catch (e) {
    if (e instanceof ImportError) return Response.json({ error: e.message }, { status: 422 });
    console.error("[import] błąd", e);
    return Response.json({ error: "Nie udało się wczytać pliku." }, { status: 500 });
  }
}
