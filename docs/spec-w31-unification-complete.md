# W31 — Complete "One Page" Unification

## Features

### F1: Score Filter Slider in Left Sidebar
- Range input (0-100, step 5) in left Sidebar under "Filtro de Relevancia"
- Shows count: "X artigos (score >= N)"
- data-testid="score-filter-slider"
- Wired to existing minScoreRodrigo state in Dashboard.tsx
- Default: 0 (show all)

### F2: Queue Stats in Left Sidebar
- Compact badges showing Pendentes / Processando / Concluidos
- data-testid="queue-stats-sidebar"
- Uses existing queueStats prop from Dashboard

### F3: Auto-generate Resumo Executivo on Load
- After news loads (allNews.length > 0) and summary is placeholder or empty
- Auto-call onUpdateSummary() once using useRef guard
- Placeholder: "Sistema pronto. Carregando memoria..." or length < 20

## Files Modified
- components/Sidebar.tsx — new props: minScoreRodrigo, setMinScoreRodrigo, filteredNewsCount, queueStats
- components/Dashboard.tsx — pass new props to Sidebar + auto-summary useEffect

## Constraints
- No new dependencies
- All files under 500 lines
- No Piloto Automatico changes
