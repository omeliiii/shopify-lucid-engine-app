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
| Inizializzazione progetto (Remix/Vite + React) | 🚧 In corso | Da inizializzare. |
| Integrazione Shopify Polaris (UI Kit) | ⏳ In attesa |  |
| Configurazione Shopify App Bridge React | ⏳ In attesa | Modali, toast, navigazione nativa. |
| Setup Autenticazione (Session Token JWT) | ⏳ In attesa | Predisporre header `Authorization: Bearer <Token>` (o `X-Merchant-Id: 100` per dev locale). |
| Creazione layout base con navigazione a Tabs/Sidebar | ⏳ In attesa | 5 schede principali: Dashboard, Inventario, Mappatura, Regole, Report. |

### Fase 2: Dashboard e Log Spedizioni
| Task | Stato | Note |
| :--- | :--- | :--- |
| Creazione KPI Card (Peso, Ordini, Materiali) | ⏳ In attesa | Grafico a torta/barre per distribuzione materiali. |
| Tabella Log Spedizioni (Polaris DataTable) | ⏳ In attesa | Implementare fetch con paginazione (`/orders/logs`). |
| Gestione Skeleton Loading & Error States | ⏳ In attesa | |

### Fase 3: CRUD Inventario e Mappatura
| Task | Stato | Note |
| :--- | :--- | :--- |
| Vista Catalogo Imballaggi & Form Inserimento | ⏳ In attesa | Fetch tipi base (`/packaging/types`) e inv (`/packaging/inventory`). Form con Polaris. |
| Gestione CRUD Inventario (Modifica/Elimina) | ⏳ In attesa | Chiamate PATCH e DELETE. |
| Tabella Mappatura Prodotti | ⏳ In attesa | Lista prodotti da `/products/mappings`. Icone stato mappatura. |
| Logica Raccomandazioni AI (Embedding) | ⏳ In attesa | UI per mostrare suggerimento e bottone conferma 1-click (`PATCH /.../confirm`). |
| Sincronizzazione Prodotti da Shopify | ⏳ In attesa | Bottone per forzare `POST /products/sync`. |
| Configurazione Regole di Spedizione | ⏳ In attesa | Form per limiti imballaggio multi-articolo (`/orders/shipping-rules`). |

### Fase 4: Generazione & Download Report
| Task | Stato | Note |
| :--- | :--- | :--- |
| Interfaccia Storico Report | ⏳ In attesa | Lista report da `GET /reports`. |
| Form Generazione Nuovo Report | ⏳ In attesa | Selezione Paese, Periodo, Date (`POST /reports`). |
| Funzionalità Esportazione LUCID (XML) | ⏳ In attesa | Download da `/reports/:id/export/registry`. |
| Funzionalità Esportazione CONAI/CITEO (CSV) | ⏳ In attesa | Download da `/reports/:id/export/registry` o `dual-system`. |

## Note Generali
* Usare **zod** per validare gli schema.
* Gestire configurazione variabili d'ambiente (non cablate).
* Usare un **logger** invece di `console.log`.
* Rispettare linee guida UX Shopify (Componenti nativi, Feedback immediati, Skeleton loading, Empty states).
