# Forum Naukowe — prototyp

Forum, na którym zalogowani użytkownicy publikują artykuły, wpisy, notatki, rozprawki, eseje i recenzje.
Zalogowani czytelnicy mogą pobrać każdy wpis jako PDF, Word (.docx) lub TXT.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Strona działa pod http://localhost:3000. Bez ustawionego `DATABASE_URL` aplikacja używa lokalnej bazy
PGlite (PostgreSQL w folderze `.data/`) i przy pierwszym starcie dodaje 6 przykładowych wpisów.
Aby zacząć od czystej bazy: zatrzymaj serwer i usuń folder `.data`.

Konfiguracja — skopiuj `.env.example` do `.env.local` i uzupełnij:

| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | PostgreSQL, np. `postgres://user:haslo@host:5432/forum`. Puste = PGlite |
| `SEED_DEMO` | `1` = dodaj przykładowe wpisy do pustej bazy |

## Wdrożenie (GitHub → Coolify)

1. Wypchnij repozytorium na GitHuba.
2. W Coolify: **New Resource → PostgreSQL** (lub użyj istniejącej bazy).
3. **New Resource → Application** z repozytorium, Build Pack: **Dockerfile**, port **3000**.
4. Zmienna środowiskowa: `DATABASE_URL` (wewnętrzny adres bazy z Coolify).
5. Deploy. Migracje bazy nakładają się automatycznie przy starcie (`src/instrumentation.ts`).

## Przeniesienie lokalnej bazy na serwer

1. Zatrzymaj `npm run dev` (lokalnej bazy nie można czytać, gdy działa serwer).
2. `npm run db:export` — tworzy `database/forum.sql` (schemat + dane, bez kont testowych `@forum.test` i bez sesji).
   Plik zawiera e-maile i hashe haseł, dlatego jest w `.gitignore`.
3. Wgraj go do **pustej** bazy PostgreSQL:
   ```bash
   psql "postgres://UZYTKOWNIK:HASLO@HOST:5432/BAZA" -f database/forum.sql
   ```
   Wszystko wykonuje się w jednej transakcji — przy błędzie baza zostaje bez zmian.
4. Ustaw `DATABASE_URL` w Coolify na tę bazę. Aplikacja wykryje, że migracje są już wykonane.

## Jak to działa

| Funkcja | Gdzie w kodzie |
|---|---|
| Lista wpisów (kafelki, filtry, wyszukiwarka) | `src/app/page.tsx` |
| Widok wpisu: strony A4, znak wodny, podpis autora w prawym dolnym rogu | `src/app/wpis/[id]/page.tsx`, `src/components/document/` |
| Blur „UPS!” dla niezalogowanych — treść ucinana na serwerze | `src/app/wpis/[id]/page.tsx` (`buildPreview`) |
| Logowanie i rejestracja (sesje w bazie, hasła bcrypt) | `src/lib/auth.ts`, `src/app/actions/auth.ts` |
| Edytor (panel, podpowiedzi, pasek narzędzi jak w Wordzie) | `src/components/editor/` |
| Zapis szkicu i publikacja | `src/app/actions/posts.ts` |
| Mój folder (szkice i opublikowane) | `src/app/moj-folder/page.tsx` |
| Pobieranie: Word i TXT generowane na serwerze | `src/app/wpis/[id]/pobierz/route.ts`, `src/lib/export-text.ts` |
| Pobieranie PDF: druk stron A4 1:1 („Zapisz jako PDF”) | `src/components/document/download-buttons.tsx`, `@media print` w `globals.css` |
| Schemat bazy | `src/lib/db/schema.ts` → migracje w `drizzle/` (`npx drizzle-kit generate`) |

### Zasady publikacji

- Wymagane: tytuł, kategoria i minimalna długość — wpis i notatka 150 słów, artykuł 500,
  rozprawka i esej 400, recenzja 300. „Publikuj” od razu publikuje dokument (bez weryfikacji).
- Edycja opublikowanego dokumentu: zapisane zmiany są widoczne dla czytelników dopiero
  po kliknięciu „Opublikuj zmiany”.
