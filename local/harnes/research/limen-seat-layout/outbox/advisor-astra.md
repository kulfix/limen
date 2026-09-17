---
id: seat-audit-astra-perspective
slug: limen-seat-layout
from: limen
to: grok
type: result
created: 2026-09-15T19:01:30Z
model_provider: openai-codex
model_id: gpt-6-astra
model_thinking: high
job: 2026-09-15-seat-audit-astra-19663de9
---

Rekomenduję jawnie wybierane, konfigurowalne sloty projektowe, niezależne od katalogu uruchomienia i nazwy repozytorium. Koszt: trzeba utrzymywać mapowanie slotów oraz oddzielne konteksty projektów zamiast wygodnych, współdzielonych symlinków. Następny sprawdzian: czy wybór slotu `rezavo` z katalogu Limen jednoznacznie wyznacza repozytorium, instrukcje, inbound, stan jobów i odbiorcę wake — bez odziedziczenia kontekstu Limen.

## 1. Jak jest (mapa)

- **Silnik i zaplecze harnessu:** `/srv/limen/tools/limen`; instrukcje, bridge i badania w `local/harnes/`, stan w `.limen/{inbound,jobs}`.
- **Produkt pytek:** `/srv/limen/projects/rezavo`; własny stan `.limen/`, badania w `local/harnes/research/`, `research/` oraz `docs/research/`.
- **Worktree jobów:** `/srv/limen/tools/.limen-limen-worktrees/` i `/srv/limen/projects/.rezavo-limen-worktrees/`.
- **Legacy:** `/srv/limen/projects/harnes`, jego `.limen/jobs` i `/srv/limen/projects/.harnes-limen-worktrees/`. Według dostarczonych faktów nadal działa tam sesja Pi.
- **Stan hosta i kopie:** `/srv/limen/state/`, `/srv/limen/backups/`. `/opt/rezavo` to osobny runtime produktu, nie jego szafka jobów.
- **Herdr według dostarczonych faktów:** `w8` — harnes, `wA` — limen inbounds, `wD` — rezavo, `wF` — rezavo inbounds.
- **Wybór projektu:** `src/git.ts` wyznacza `limenRoot(cwd)` z workspace albo repozytorium Git. `/home/limen/.limen/projects` zawiera trzy ścieżki, ale nie jest konfiguracją slotów wybierających inbound.

## 2. Co jest źle

- **Katalog roboczy zastępuje jawną tożsamość projektu.** `src/git.ts` i `src/handoff.ts` wiążą root badań oraz stan inbound z `cwd`. To ryzyko obsługi niewłaściwej szafki, nie dowód, że taki incydent wystąpił.
- **Ścieżka inbound jest zaszyta w silniku.** `src/handoff.ts` narzuca `local/harnes/research`. Obecne sprawdzanie ścieżki logicznej i rzeczywistej chroni tę granicę; problemem jest brak konfiguracji, nie brak jakiejkolwiek ochrony.
- **Produkt dziedziczy żywe instrukcje narzędzia.** `/srv/limen/projects/rezavo/local/harnes/MODELS.md`, `bridge` i `procedures` są symlinkami do `/srv/limen/tools/limen/local/harnes/`. Zmiana celu zmienia to, co odczyta produkt, bez zmiany jego własnych plików.
- **Miejsca badań nie wyjaśniają właściciela kontekstu.** Badania dotyczące rezavo występują pod `/srv/limen/tools/limen/local/harnes/research/`, a produkt ma kilka własnych korzeni badań. To nie dowodzi błędnego umieszczenia treści, ale utrudnia odróżnienie badań produktu od badań harnessu na jego przykładzie.
- **Nazwa workspace nie jest bezpieczną tożsamością.** `src/herdr.ts`, funkcja `ensureWorkspace`, wyszukuje workspace po `${basename(cwd)} ${role}s`, bez porównania pełnej ścieżki. Dwa katalogi o tej samej nazwie mogą wskazać ten sam workspace; nie sprawdzałem takiej kolizji na żywo.
- **Legacy pozostaje operacyjnie niejednoznaczne.** `/srv/limen/projects/harnes` nadal figuruje w rejestrze obok aktualnych checkoutów; dostarczone fakty wskazują także aktywną sesję. Archiwum dokumentów w `tools/limen/local/harnes/archive/docs/` samo nie rozstrzyga, który kontekst obowiązuje.

## 3. Rekomendacja slotów

- Slot oznacza **projekt i jego granicę**, nie model, rolę ani tab. Przykładowe identyfikatory: `limen-engine`, `rezavo`; legacy wymaga osobnego, jawnego wyboru.
- Konfiguracja slotu wskazuje repozytorium, korzeń instrukcji, dopuszczone źródła badań, katalog inbound, szafkę stanu, korzeń worktree, przestrzeń sesji i trasę wake. To propozycja designu, nie istniejące opcje CLI.
- Dzisiejsze ścieżki mogą pozostać wartościami konfiguracji. Nie potrzeba obowiązkowego `/srv/limen/slots` ani przenosin, by nazwać granice.
- Jawny wybór slotu ma pierwszeństwo; sprzeczny `cwd` nie może po cichu przełączyć projektu. Niejednoznaczność wymaga rozstrzygnięcia przed skutkiem ubocznym.
- **Zero cross-bleed:** instrukcje, historia sesji, stan jobów, inbound i wake należą do jednego slotu. Granice ścieżek uwzględniają symlinki; sama różnica nazw katalogów nie wystarcza.
- Wspólny silnik i neutralne procedury są dopuszczalne jako jawne, wersjonowane zależności. Żaden slot nie dziedziczy automatycznie polityki modeli ani kontekstu innego projektu.
- Przekazanie materiału między projektami jest jawnym handoffem z nazwanym źródłem i odbiorcą, nie automatycznym przeszukiwaniem sąsiednich katalogów.
- Herdr pokazuje slot i rolę, lecz identyfikuje przestrzeń pełną tożsamością slotu. Tab pozostaje widokiem; pliki joba i Git pozostają źródłem prawdy.

**Zakres weryfikacji:** przeczytałem `advisor-facts-as-is.md`, wizję i board; sprawdziłem wskazane fragmenty kodu, rejestr oraz wymienione symlinki. Pozostała mapa pochodzi z dostarczonych faktów. Nie uruchamiałem produktu ani testów izolacji; ryzyka nie są potwierdzonymi incydentami.

**Zapis:** niczego nie zmieniłem ani nie zapisałem. Nadrzędna instrukcja doradcy zabrania tworzenia raportu; zapis do `outbox/advisor-astra.md` pozostaje zadaniem koordynatora.

model_provider: `openai-codex`  
model_id: `gpt-6-astra`  
model_thinking: `high`  
Źródło metadanych: zmienne środowiskowe bieżącej sesji.
