# Forum Naukowe — prototyp

Forum, na którym zalogowani użytkownicy publikują artykuły, wpisy, notatki, rozprawki, eseje i recenzje.
Każdy tekst przed publikacją sprawdza AI (Claude).

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
| `ANTHROPIC_API_KEY` | klucz do moderacji AI. Bez niego działa prosty lokalny filtr |
| `MODERATION_MODEL` | model moderacji, domyślnie `claude-haiku-5-5` |
| `SEED_DEMO` | `1` = dodaj przykładowe wpisy do pustej bazy |

## Wdrożenie (GitHub → Coolify)

1. Wypchnij repozytorium na GitHuba.
2. W Coolify: **New Resource → PostgreSQL** (lub użyj istniejącej bazy).
3. **New Resource → Application** z repozytorium, Build Pack: **Dockerfile**, port **3000**.
4. Zmienne środowiskowe: `DATABASE_URL` (wewnętrzny adres bazy z Coolify) i `ANTHROPIC_API_KEY`.
5. Deploy. Migracje bazy nakładają się automatycznie przy starcie (`src/instrumentation.ts`).

## Jak to działa

| Funkcja | Gdzie w kodzie |
|---|---|
| Lista wpisów (kafelki, filtry, wyszukiwarka) | `src/app/page.tsx` |
| Widok wpisu: strony A4, znak wodny, podpis autora w prawym dolnym rogu | `src/app/wpis/[id]/page.tsx`, `src/components/document/` |
| Blur „UPS!” dla niezalogowanych — treść ucinana na serwerze | `src/app/wpis/[id]/page.tsx` (`buildPreview`) |
| Logowanie i rejestracja (sesje w bazie, hasła bcrypt) | `src/lib/auth.ts`, `src/app/actions/auth.ts` |
| Edytor (panel, podpowiedzi, pasek narzędzi jak w Wordzie) | `src/components/editor/` |
| Zapis szkicu, publikacja, moderacja, blokady | `src/app/actions/posts.ts`, `src/lib/moderation.ts` |
| Mój folder (szkice, opublikowane, 🔴 odrzucone) | `src/app/moj-folder/page.tsx` |
| Schemat bazy | `src/lib/db/schema.ts` → migracje w `drizzle/` (`npx drizzle-kit generate`) |

### Zasady publikacji

- Minimalna długość: wpis i notatka 150 słów, artykuł 500, rozprawka i esej 400, recenzja 300.
  Za krótki tekst nie liczy się jako odrzucenie.
- AI odrzuca wulgaryzmy, hejt, spam i teksty „o niczym”. Odrzucony dokument dostaje czerwone kółko
  w „Moim folderze”; autor może go poprawić i wysłać ponownie.
- Każde odrzucenie wygasa po 7 dniach. 5 aktywnych odrzuceń blokuje publikowanie na 7 dni
  (pisanie i zapisywanie szkiców działa dalej).
- Edycja opublikowanego dokumentu: czytelnicy widzą poprzednią wersję, dopóki nowa nie przejdzie weryfikacji.
