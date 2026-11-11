import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { countWords, htmlToText } from "@/lib/constants";
import { db, schema } from "./index";

type Demo = {
  author: string;
  title: string;
  description: string;
  category: string;
  type: string;
  daysAgo: number;
  paragraphs: string[];
};

const DEMO: Demo[] = [
  {
    author: "Anna Kowalska",
    title: "Dlaczego sen jest kluczowy dla pamięci długotrwałej",
    description: "Przegląd badań nad rolą snu w konsolidacji wspomnień i praktyczne wnioski dla studentów.",
    category: "Neurobiologia",
    type: "artykul",
    daysAgo: 1,
    paragraphs: [
      "<h2>Wprowadzenie</h2>",
      "Sen przez długi czas uchodził za stan biernego odpoczynku mózgu. Badania prowadzone od lat pięćdziesiątych XX wieku pokazały jednak, że w czasie snu zachodzą intensywne procesy, bez których nasza pamięć działałaby znacznie gorzej. Szczególną rolę przypisuje się fazie snu wolnofalowego oraz fazie REM.",
      "W fazie snu wolnofalowego hipokamp odtwarza wzorce aktywności zarejestrowane w ciągu dnia. Ten proces, nazywany reaktywacją, sprzyja przenoszeniu informacji do kory nowej, gdzie mogą one zostać trwale zapisane. Eksperymenty na szczurach uczących się labiryntu wykazały, że sekwencje wyładowań neuronów miejsca powtarzają się w czasie snu, a ich zakłócenie pogarsza wyniki zwierząt następnego dnia.",
      "<h2>Rola fazy REM</h2>",
      "Faza REM wiąże się przede wszystkim z pamięcią proceduralną i emocjonalną. Osoby pozbawione snu REM gorzej radzą sobie z zadaniami wymagającymi nauki sekwencji ruchów, a także słabiej przetwarzają emocjonalnie nacechowane wspomnienia. Część badaczy sugeruje, że sen REM pomaga łączyć nowe informacje z już posiadaną wiedzą, co sprzyja twórczemu rozwiązywaniu problemów.",
      "<h2>Wnioski praktyczne</h2>",
      "Dla studentów płynie stąd prosty wniosek: nauka przez całą noc przed egzaminem jest strategią nieefektywną. Znacznie lepsze rezultaty daje rozłożenie materiału na kilka dni i zapewnienie sobie co najmniej siedmiu godzin snu. Krótka drzemka po intensywnej nauce również może poprawić zapamiętywanie, o ile nie przekracza trzydziestu minut i nie zaburza snu nocnego.",
      "Warto pamiętać, że sen nie zastąpi samej nauki. Mózg utrwala to, co wcześniej zostało zakodowane, dlatego aktywne powtarzanie materiału, testowanie się i tłumaczenie zagadnień innym pozostają podstawą skutecznego uczenia się. Sen jest jednak tym etapem, który pozwala, by ten wysiłek nie poszedł na marne.",
    ],
  },
  {
    author: "Piotr Nowak",
    title: "Czy sztuczna inteligencja może być twórcza?",
    description: "Rozprawka o granicach kreatywności maszyn i o tym, co właściwie nazywamy twórczością.",
    category: "Filozofia",
    type: "rozprawka",
    daysAgo: 2,
    paragraphs: [
      "Pytanie o twórczość sztucznej inteligencji powraca za każdym razem, gdy algorytm napisze wiersz, skomponuje melodię albo wygeneruje obraz zachwycający krytyków. Moim zdaniem odpowiedź zależy przede wszystkim od tego, jak zdefiniujemy samą twórczość.",
      "<h2>Argument pierwszy: nowość i wartość</h2>",
      "Psychologowie często definiują twórczość jako wytwarzanie czegoś jednocześnie nowego i wartościowego. Według tego kryterium współczesne systemy mogą być twórcze: tworzą rozwiązania, których nikt wcześniej nie zaproponował, a niektóre z nich okazują się użyteczne, na przykład nowe struktury białek czy nieoczywiste strategie w grach planszowych.",
      "<h2>Argument drugi: intencja</h2>",
      "Przeciwnicy tego poglądu zwracają uwagę na brak intencji. Artysta tworzy, bo chce coś wyrazić, a maszyna jedynie optymalizuje funkcję celu. Trudno jednak jednoznacznie rozstrzygnąć, czy ludzka intencja nie jest również wynikiem złożonych procesów, których sami nie do końca rozumiemy.",
      "<h2>Podsumowanie</h2>",
      "Uważam, że sztuczna inteligencja jest twórcza w sensie funkcjonalnym, ale nie w sensie egzystencjalnym. Potrafi wytwarzać nowe i wartościowe rzeczy, lecz nie przeżywa procesu tworzenia. Być może właśnie to rozróżnienie pozwoli nam uniknąć zarówno bezkrytycznego zachwytu, jak i pochopnego odrzucenia nowych narzędzi.",
    ],
  },
  {
    author: "Marta Wiśniewska",
    title: "Fotosynteza w pigułce — notatka do matury",
    description: "Najważniejsze etapy fotosyntezy, wzory i pojęcia, które warto znać przed egzaminem.",
    category: "Biologia",
    type: "notatka",
    daysAgo: 3,
    paragraphs: [
      "<h2>Czym jest fotosynteza?</h2>",
      "Fotosynteza to proces, w którym organizmy samożywne wykorzystują energię światła do wytworzenia związków organicznych z dwutlenku węgla i wody. Produktem ubocznym jest tlen. Sumarycznie zapisujemy ją równaniem: 6CO<sub>2</sub> + 6H<sub>2</sub>O → C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + 6O<sub>2</sub>.",
      "<h2>Faza zależna od światła</h2>",
      "<ul><li>zachodzi w błonach tylakoidów,</li><li>światło wzbudza elektrony chlorofilu w fotoukładach I i II,</li><li>następuje fotoliza wody i uwolnienie tlenu,</li><li>powstają ATP oraz NADPH.</li></ul>",
      "<h2>Faza niezależna od światła (cykl Calvina)</h2>",
      "<ul><li>zachodzi w stromie chloroplastu,</li><li>enzym RuBisCO wiąże CO<sub>2</sub> z rybulozo-1,5-bisfosforanem,</li><li>ATP i NADPH z fazy jasnej służą do redukcji związków,</li><li>powstaje aldehyd 3-fosfoglicerynowy, z którego roślina buduje glukozę.</li></ul>",
      "<h2>Czynniki wpływające na intensywność</h2>",
      "Na tempo fotosyntezy wpływają przede wszystkim natężenie światła, stężenie dwutlenku węgla, temperatura oraz dostępność wody. Warto pamiętać o prawie minimum: o szybkości procesu decyduje ten czynnik, którego jest najmniej w stosunku do potrzeb rośliny.",
    ],
  },
  {
    author: "Tomasz Zieliński",
    title: "Krótka historia liczby zero",
    description: "Jak koncepcja nicości stała się jednym z najważniejszych wynalazków matematyki.",
    category: "Matematyka",
    type: "wpis",
    daysAgo: 4,
    paragraphs: [
      "Zero wydaje się dziś czymś oczywistym, ale przez tysiące lat ludzie liczyli bez niego. Babilończycy stosowali znak oznaczający puste miejsce w zapisie pozycyjnym, jednak nie traktowali go jako samodzielnej liczby, z którą można wykonywać działania.",
      "Przełom nastąpił w Indiach. W VII wieku matematyk Brahmagupta opisał zasady działań na zerze: dodanie zera do liczby jej nie zmienia, a pomnożenie przez zero daje zero. Miał natomiast kłopot z dzieleniem przez zero, które do dziś pozostaje działaniem niewykonalnym.",
      "Z Indii idea zera trafiła do świata arabskiego, a stamtąd do Europy, głównie dzięki pracom Al-Chwarizmiego i Fibonacciego. Początkowo spotykała się z nieufnością kupców i urzędników, ponieważ łatwo było dopisać zero i zmienić wartość rachunku. Z czasem jednak zalety systemu dziesiętnego okazały się zbyt duże, by z niego zrezygnować.",
      "Bez zera nie byłoby współczesnej algebry, analizy matematycznej ani informatyki, której podstawą jest zapis zerojedynkowy. Ta niepozorna liczba jest więc jednym z najważniejszych pojęć, jakie stworzyła ludzkość.",
    ],
  },
  {
    author: "Tomasz Zieliński",
    title: "Recenzja: „Krótka historia czasu” po latach",
    description: "Czy klasyczna książka Stephena Hawkinga wciąż broni się jako wprowadzenie do kosmologii?",
    category: "Fizyka",
    type: "recenzja",
    daysAgo: 6,
    paragraphs: [
      "Książka Stephena Hawkinga ukazała się pod koniec lat osiemdziesiątych i szybko stała się jednym z najlepiej sprzedających się tytułów popularnonaukowych w historii. Sięgnąłem po nią ponownie, aby sprawdzić, czy po kilkudziesięciu latach wciąż może służyć jako pierwsze wprowadzenie do kosmologii.",
      "Największą zaletą książki jest jej konstrukcja. Autor prowadzi czytelnika od starożytnych wyobrażeń o kosmosie, przez mechanikę Newtona i teorię względności, aż po czarne dziury i początki Wszechświata. Każdy rozdział opiera się na poprzednim, dzięki czemu nawet trudne pojęcia stają się zrozumiałe.",
      "Nie wszystko jednak przetrwało próbę czasu. Część rozważań o teorii wszystkiego wydaje się dziś zbyt optymistyczna, a od chwili wydania dokonano wielu odkryć, takich jak przyspieszająca ekspansja Wszechświata czy bezpośrednia rejestracja fal grawitacyjnych. Czytelnik powinien traktować książkę jako świadectwo swojej epoki, a nie aktualny podręcznik.",
      "Mimo tych ograniczeń polecam ją każdemu, kto chce zrozumieć, w jaki sposób fizycy myślą o Wszechświecie. To wciąż jedna z najlepszych lekcji pokory wobec rzeczywistości, którą próbujemy opisać.",
    ],
  },
  {
    author: "Piotr Nowak",
    title: "Efekt Dunninga-Krugera: co naprawdę mówią badania",
    description: "Popularny mem kontra wyniki eksperymentów — gdzie leży prawda o przecenianiu własnych kompetencji.",
    category: "Psychologia",
    type: "esej",
    daysAgo: 8,
    paragraphs: [
      "Efekt Dunninga-Krugera stał się jednym z najczęściej przywoływanych zjawisk psychologicznych w internecie. Zwykle ilustruje się go wykresem z „górą głupoty” i „doliną rozpaczy”, który jednak nie pochodzi z oryginalnej pracy z 1999 roku i znacznie upraszcza jej wnioski.",
      "W pierwotnych badaniach uczestnicy rozwiązywali testy z logiki, gramatyki i poczucia humoru, a następnie oceniali swoje wyniki. Osoby z najniższymi rezultatami wyraźnie przeceniały swoje umiejętności, natomiast najlepsi nieco je zaniżali. Autorzy tłumaczyli to tym, że brak kompetencji utrudnia także rozpoznanie własnych błędów.",
      "Późniejsze analizy wykazały, że część efektu może wynikać ze zjawisk statystycznych, takich jak regresja do średniej i ogólna tendencja do oceniania się powyżej przeciętnej. Nie oznacza to, że efekt nie istnieje, ale jego siła jest prawdopodobnie mniejsza, niż sugerują popularne grafiki.",
      "Najważniejsza lekcja płynąca z tych badań nie dotyczy innych ludzi, lecz nas samych. Każdy z nas jest laikiem w większości dziedzin, dlatego warto pielęgnować ciekawość i gotowość do zmiany zdania, zamiast z góry zakładać, że wiemy wystarczająco dużo.",
    ],
  },
];

export async function seedDemo() {
  // Konta demo dostają losowe hasła — służą tylko jako autorzy przykładowych wpisów
  const authorIds = new Map<string, string>();
  for (const name of [...new Set(DEMO.map((d) => d.author))]) {
    const email = `${name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").replace(/ /g, ".")}@demo.local`;
    const [user] = await db
      .insert(schema.users)
      .values({ email, name, passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 10) })
      .returning({ id: schema.users.id });
    authorIds.set(name, user.id);
  }

  const categoryIds = new Map<string, string>();
  for (const name of [...new Set(DEMO.map((d) => d.category))]) {
    const [cat] = await db.insert(schema.categories).values({ name }).returning({ id: schema.categories.id });
    categoryIds.set(name, cat.id);
  }

  for (const d of DEMO) {
    const html = d.paragraphs.map((p) => (p.startsWith("<") ? p : `<p>${p}</p>`)).join("");
    const text = htmlToText(html);
    const words = countWords(text);
    const date = new Date(Date.now() - d.daysAgo * 24 * 60 * 60 * 1000);
    const categoryId = categoryIds.get(d.category)!;
    await db.insert(schema.posts).values({
      authorId: authorIds.get(d.author)!,
      title: d.title,
      description: d.description,
      categoryId,
      type: d.type,
      contentHtml: html,
      contentText: text,
      wordCount: words,
      publishedTitle: d.title,
      publishedDescription: d.description,
      publishedCategoryId: categoryId,
      publishedType: d.type,
      publishedHtml: html,
      publishedText: text,
      publishedWordCount: words,
      firstPublishedAt: date,
      publishedAt: date,
      createdAt: date,
      updatedAt: date,
    });
  }
}
