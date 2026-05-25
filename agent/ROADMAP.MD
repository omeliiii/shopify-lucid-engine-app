# Roadmap - Shopify Lucid Engine Frontend

Questo file traccia lo stato di avanzamento dello sviluppo della Single Page Application (SPA) per l'app Shopify Lucid Engine.

## Legenda Stati
* `⏳ In attesa`
* `🚧 In corso`
* `✅ Completato`

## Fasi di Sviluppo

### Fase 1: Configurazione & Autenticazione App Bridge
| Task | Stato | Note |
| :--- | :--- | :--- |
| Inizializzazione progetto (Remix/Vite + React) | ✅ Completato | Da inizializzare. |
| Integrazione Shopify Polaris (UI Kit) | ✅ Completato |  |
| Configurazione Shopify App Bridge React | ✅ Completato | Modali, toast, navigazione nativa. |
| Setup Autenticazione (Session Token JWT) | ✅ Completato | Predisporre header `Authorization: Bearer <Token>` (o `X-Merchant-Id: 100` per dev locale). |
| Creazione layout base con navigazione a Tabs/Sidebar | ✅ Completato | 5 schede principali: Dashboard, Inventario, Mappatura, Regole, Report. |

### Fase 2: Dashboard e Log Spedizioni
| Task | Stato | Note |
| :--- | :--- | :--- |
| Creazione KPI Card (Peso, Ordini, Materiali) | ✅ Completato | Grafico a torta/barre per distribuzione materiali. |
| Tabella Log Spedizioni (Polaris DataTable) | ✅ Completato | Implementare fetch con paginazione (`/orders/logs`). |
| Gestione Skeleton Loading & Error States | ✅ Completato | |

### Fase 3: CRUD Inventario e Mappatura
| Task | Stato | Note |
| :--- | :--- | :--- |
| Vista Catalogo Imballaggi & Form Inserimento | ✅ Completato | Fetch tipi base (`/packaging/types`) e inv (`/packaging/inventory`). Form con Polaris. |
| Gestione CRUD Inventario (Modifica/Elimina) | ✅ Completato | Chiamate PATCH e DELETE. |
| Tabella Mappatura Prodotti | ✅ Completato | Lista prodotti da `/products/mappings`. Icone stato mappatura. |
| Logica Raccomandazioni AI (Embedding) | ✅ Completato | UI per mostrare suggerimento e bottone conferma 1-click (`PATCH /.../confirm`). |
| Sincronizzazione Prodotti da Shopify | ✅ Completato | Bottone per forzare `POST /products/sync`. |
| Configurazione Regole di Spedizione | ✅ Completato | Form per limiti imballaggio multi-articolo (`/orders/shipping-rules`). |

### Fase 4: Generazione & Download Report
| Task | Stato | Note |
| :--- | :--- | :--- |
| Interfaccia Storico Report | ✅ Completato | Lista report da `GET /reports`. |
| Form Generazione Nuovo Report | ✅ Completato | Selezione Paese, Periodo, Date (`POST /reports`). |
| Funzionalità Esportazione LUCID (XML) | ✅ Completato | Download da `/reports/:id/export/registry`. |
| Funzionalità Esportazione CONAI/CITEO (CSV) | ✅ Completato | Download da `/reports/:id/export/registry` o `dual-system`. |

### Fase 5: Miglioramenti e fix
| Task | Stato | Note |
| :--- | :--- | :--- |
| Centralizzazione mock delle varie API e configurazione in .env | ✅ Completato | Utilizza `VITE_USE_MOCKS` in `.env`. |
| Nella dashboard la distribuzione materiali deve essere un grafico a torta con dati veri restituiti dal backend | ✅ Completato | Utilizzato `recharts` con fetching su `/orders/kpis`. |
| Suddividere il peso totale per Paese tramite un grafico a barre, ed allineare in altezza tutte le card KPI della dashboard | ✅ Completato | Utilizzato `BarChart` di Recharts, aggiunto mock per storico ordini con `AreaChart` per riempire e flexbox per altezze uniformi. |
| Nella dashboard la lista degli ordini deve essere paginata e il Paese deve avere anche il colore della bandiera |
| Nell'inventario imballaggi ci deve essere una sezione superiore con i suggerimenti dell'AI, con le box che mostrano l'immagine del packaging e il nome con i tasti elimina (che elimina il suggerimento), accetta (che accetta il suggerimento e lo aggiunge alla lista dei packaging) e modifica (che accetta il suggerimento ma apre il form di modifica con i dati) |
| Nell'inventario imballaggi la lista dei packaging deve avere card con foto e nome e il tasto per eliminare o modificare l'imballaggio |
| Nell'inventario imballaggi nel popup per l'aggiunta di un imballaggio ci devono essere tutti gli imballaggi standard censiti a db (API /packaging/types che torna i vari name, agnosticMaterial, defaultGsm, formulaType, defaultOverlapFactor, embedding), divisi per agnosticMaterial con i tasti accetta e modifica |
| Regole di spedizione oltre a nome regola e numero massimo articoli devono avere numero minimo articoli, imballaggio secondario da selezionare come per l'inventario imballaggi, riempimento e priorità. Inoltre ci deve essere il tasto per modificare o eliminare una regola |
| In report e dichiarazioni la tabella deve essere paginata e filtrabile per Paese e date |
| In report e dichiarazioni i tasti download devono chiamare realmente le API per fare il download dei file |
| Implementare i18n per tradurre l'app in italiano, inglese, francese e tedesco |
| Migliorare UI/UX e layout generale |


## Note Generali
* Usare **zod** per validare gli schema.
* Gestire configurazione variabili d'ambiente (non cablate).
* Usare un **logger** invece di `console.log`.
* Rispettare linee guida UX Shopify (Componenti nativi, Feedback immediati, Skeleton loading, Empty states).
