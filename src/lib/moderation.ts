import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export type ModerationResult = {
  approved: boolean;
  reason: string;
};

const Verdict = z.object({
  approved: z.boolean(),
  reason: z
    .string()
    .describe("Krótkie uzasadnienie po polsku (1–2 zdania), skierowane do autora."),
});

const SYSTEM = `Jesteś moderatorem polskiego forum naukowego, na którym użytkownicy publikują wpisy, artykuły, rozprawki, eseje, notatki i recenzje.
Oceniasz, czy tekst może zostać opublikowany.

ODRZUĆ tekst, jeśli:
- zawiera wulgaryzmy (także zamaskowane gwiazdkami, literówkami lub cyframi), obelgi, hejt, groźby, treści erotyczne;
- jest „o niczym”: bełkot, losowe znaki, powtarzane w kółko słowa lub zdania, sztucznie wydłużany tekst, treść bez związku z tytułem;
- jest spamem lub reklamą.

ZATWIERDŹ tekst, jeśli jest merytoryczny i kulturalny — nawet jeśli jest krótki, prosty, ma błędy językowe albo przedstawia kontrowersyjną, ale rzeczowo uargumentowaną tezę. Cytowanie wulgaryzmów w kontekście naukowym (np. analiza językoznawcza) jest dopuszczalne.

Uzasadnienie pisz po polsku, życzliwie, tak żeby autor wiedział, co poprawić.`;

// Tani i szybki model do klasyfikacji; można nadpisać zmienną MODERATION_MODEL
const MODEL = process.env.MODERATION_MODEL ?? "claude-haiku-5-5";

// Zapasowy filtr, gdy brak klucza API (tylko development)
const BAD_ROOTS = ["kurw", "chuj", "huj", "pierdol", "jeba", "jebi", "jebn", "pizd", "skurwy", "cipa", "cipy", "fiut", "dziwk", "spierdal", "zajeb", "wyjeb"];

function localFallback(text: string): ModerationResult {
  const normalized = text.toLowerCase().replace(/[^a-ząćęłńóśźż]/g, "");
  const hit = BAD_ROOTS.find((root) => normalized.includes(root));
  if (hit) return { approved: false, reason: "Tekst zawiera wulgaryzmy. Usuń je i spróbuj ponownie." };
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  const unique = new Set(words).size;
  if (words.length > 0 && unique / words.length < 0.25) {
    return { approved: false, reason: "Tekst składa się głównie z powtarzających się słów." };
  }
  return { approved: true, reason: "Zatwierdzono (lokalny filtr — brak klucza ANTHROPIC_API_KEY)." };
}

export async function moderate(input: {
  title: string;
  description: string;
  type: string;
  category: string;
  text: string;
}): Promise<ModerationResult> {
  const fullText = `${input.title}\n${input.description}\n${input.text}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[moderacja] Brak ANTHROPIC_API_KEY — używam lokalnego filtra.");
    return localFallback(fullText);
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    output_config: { effort: "low", format: zodOutputFormat(Verdict) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Rodzaj tekstu: ${input.type}\nKategoria: ${input.category}\nTytuł: ${input.title}\nOpis: ${input.description}\n\n<tekst>\n${input.text}\n</tekst>`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return { approved: false, reason: "Tekst nie przeszedł automatycznej weryfikacji bezpieczeństwa." };
  }
  const verdict = response.parsed_output;
  if (!verdict) {
    throw new Error("Moderacja zwróciła nieprawidłową odpowiedź");
  }
  return verdict;
}
