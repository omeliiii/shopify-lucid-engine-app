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

## Note Generali
* Usare **zod** per validare gli schema.
* Gestire configurazione variabili d'ambiente (non cablate).
* Usare un **logger** invece di `console.log`.
* Rispettare linee guida UX Shopify (Componenti nativi, Feedback immediati, Skeleton loading, Empty states).
