export type Algo = 'A* Search' | 'Greedy Best-First' | 'Beam Search' | 'Hill Climbing' | 'Breadth-First Search' | 'Depth-First Search' | "Dijkstra's Algorithm";
export type NodeData = { id: string; label: string; x: number; y: number; h: number };
export type EdgeData = { id: string; source: string; target: string; weight: number };
export type GraphData = { nodes: NodeData[]; edges: EdgeData[]; directed: boolean };
export type SimEvent = { type: string; node?: string; edge?: string; frontier: string[]; visited: string[]; path: string[]; costs: Record<string, number>; message: string; pruned?: string[] };
const key = (a: string, b: string) => `${a}->${b}`;
export function runAlgorithm(graph: GraphData, start: string, goal: string, algo: Algo, beamWidth = 2): SimEvent[] {
    const { nodes, edges, directed } = graph, byId = Object.fromEntries(nodes.map(n => [n.id, n])), adj: Record<string, { id: string; edge: EdgeData }[]> = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => { adj[e.source]?.push({ id: e.target, edge: e }); if (!directed) adj[e.target]?.push({ id: e.source, edge: e }) });
    Object.values(adj).forEach(a => a.sort((x, y) => x.id.localeCompare(y.id)));
    const events: SimEvent[] = [], visited: string[] = [], frontier: string[] = [], costs: Record<string, number> = { [start]: 0 }, prev: Record<string, string> = {};
    const emit = (type: string, node: string | undefined, message: string, edge?: string, pruned: string[] = [], path: string[] = []) =>
        events.push({ type, node, edge, frontier: [...frontier], visited: [...visited], path: [...path], costs: { ...costs }, message, pruned });
    const pathTo = (id: string) => { const p = [id]; let c = id; while (prev[c]) { c = prev[c]; p.unshift(c); if (p.length > nodes.length + 1) break; } return p[0] === start ? p : [] };
    const h = (id: string) => byId[id]?.h ?? 0;
    if (!byId[start] || !byId[goal]) return [{ type: 'error', frontier: [], visited: [], path: [], costs, message: 'Choose valid start and goal nodes.' }];
    if (start === goal) { emit('goal', start, 'Start and goal are the same node.', undefined, [], [start]); return events; }
    if (algo === "Hill Climbing") {
        let cur = start; visited.push(cur); emit('expand', cur, `Start at ${cur}. Its heuristic is ${h(cur)}.`);
        for (let i = 0; i < nodes.length; i++) {
            const opts = (adj[cur] || []).filter(a => !visited.includes(a.id)).sort((a, b) => h(a.id) - h(b.id)); if (cur === goal) { emit('goal', cur, 'Goal reached.', undefined, [], pathTo(cur)); return events; }
            const next = opts[0]; if (!next || h(next.id) >= h(cur)) { emit('local-optimum', cur, `Stopped at ${cur}: no unvisited neighbor has a lower heuristic.`, undefined, [], pathTo(cur)); return events; }
            prev[next.id] = cur; cur = next.id; visited.push(cur); costs[cur] = costs[prev[cur]] + (next.edge.weight || 1); emit(cur === goal ? 'goal' : 'expand', cur, cur === goal ? `Reached goal ${goal}.` : `Move to ${cur} because h(${cur}) = ${h(cur)} is lower.`, next.edge.id, [], pathTo(cur)); if (cur === goal) return events;
        } return events;
    }
    if (algo === 'Breadth-First Search' || algo === 'Depth-First Search') {
        const q = [start]; frontier.push(start); const seen = new Set([start]);
        while (q.length) {
            const cur = algo === 'Breadth-First Search' ? q.shift()! : q.pop()!; const fi = frontier.indexOf(cur); if (fi >= 0) frontier.splice(fi, 1); if (!visited.includes(cur)) visited.push(cur);
            emit('expand', cur, `${algo === 'Breadth-First Search' ? 'Dequeue' : 'Pop'} ${cur} for expansion.`);
            if (cur === goal) { emit('goal', cur, `Goal found. Path uses ${pathTo(cur).length - 1} edges.`, undefined, [], pathTo(cur)); return events; }
            const ns = adj[cur] || []; const ordered = algo === 'Depth-First Search' ? [...ns].reverse() : ns;
            for (const a of ordered) { if (seen.has(a.id)) continue; seen.add(a.id); prev[a.id] = cur; costs[a.id] = costs[cur] + 1; q.push(a.id); frontier.push(a.id); emit('discover', a.id, `${a.id} discovered from ${cur}; BFS/DFS treats each edge as one step.`, a.edge.id); }
        } emit('failed', undefined, 'The goal is unreachable from the selected start.'); return events;
    }
    const priority = (id: string) => algo === 'Greedy Best-First' ? h(id) : algo === 'Dijkstra\'s Algorithm' ? costs[id] ?? Infinity : algo === 'Beam Search' ? h(id) : (costs[id] ?? Infinity) + h(id);
    if (algo === 'Beam Search') {
        let level = [start]; frontier.push(start); const seen = new Set([start]); costs[start] = 0;
        while (level.length) {
            level.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b)); const kept = level.slice(0, Math.max(1, beamWidth)), pruned = level.slice(Math.max(1, beamWidth)); pruned.forEach(x => emit('pruned', x, `${x} was pruned because it fell outside beam width ${beamWidth}.`, undefined, [x]));
            frontier.splice(0, frontier.length, ...kept);
            const nextLevel: string[] = [];
            for (const cur of kept) {
                const fi = frontier.indexOf(cur); if (fi >= 0) frontier.splice(fi, 1); if (visited.includes(cur)) continue; visited.push(cur); emit('expand', cur, `Expand ${cur}; its heuristic h = ${h(cur)} ranks it in the current beam.`);
                if (cur === goal) { emit('goal', cur, 'Goal found by Beam Search.', undefined, [], pathTo(cur)); return events; }
                for (const a of adj[cur] || []) { if (seen.has(a.id)) continue; seen.add(a.id); prev[a.id] = cur; costs[a.id] = (costs[cur] ?? 0) + a.edge.weight; nextLevel.push(a.id); emit('discover', a.id, `Candidate ${a.id} enters the next beam level.`, a.edge.id); }
            } level = nextLevel;
        } emit('failed', undefined, 'Beam Search exhausted its retained candidates; pruning may have removed a valid route.'); return events;
    }
    const open = [start]; frontier.push(start); const closed = new Set<string>();
    while (open.length) {
        open.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b)); const cur = open.shift()!; const fi = frontier.indexOf(cur); if (fi >= 0) frontier.splice(fi, 1); if (closed.has(cur)) continue; closed.add(cur); visited.push(cur);
        emit('expand', cur, algo === 'Greedy Best-First' ? `Expand ${cur}: lowest heuristic h(${cur}) = ${h(cur)} among frontier nodes.` : algo === "Dijkstra's Algorithm" ? `Finalize ${cur} with current distance ${costs[cur]}.` : `Expand ${cur}: f(${cur}) = g(${cur}) + h(${cur}) = ${costs[cur]} + ${h(cur)}.`);
        if (cur === goal) { emit('goal', cur, `Goal reached with path cost ${costs[cur]}.`, undefined, [], pathTo(cur)); return events; }
        for (const a of adj[cur] || []) {
            const alt = (costs[cur] ?? 0) + a.edge.weight; if (algo === 'Greedy Best-First') { if (!closed.has(a.id) && !open.includes(a.id)) { prev[a.id] = cur; costs[a.id] = alt; open.push(a.id); frontier.push(a.id); emit('discover', a.id, `Add ${a.id} to the frontier; priority is h(${a.id}) = ${h(a.id)}.`, a.edge.id); } continue; }
            if (alt < (costs[a.id] ?? Infinity)) { costs[a.id] = alt; prev[a.id] = cur; if (closed.has(a.id)) closed.delete(a.id); if (!open.includes(a.id)) { open.push(a.id); frontier.push(a.id); } emit('relax', a.id, `A cheaper route to ${a.id} was found: distance ${alt}.`, a.edge.id); }
        }
    }
    emit('failed', undefined, 'The goal is unreachable from the selected start.'); return events;
}
export const sampleGraph: GraphData = { directed: false, nodes: [{ id: 'A', label: 'A', x: 130, y: 180, h: 7 }, { id: 'B', label: 'B', x: 310, y: 95, h: 6 }, { id: 'C', label: 'C', x: 310, y: 270, h: 4 }, { id: 'D', label: 'D', x: 520, y: 95, h: 3 }, { id: 'E', label: 'E', x: 520, y: 270, h: 2 }, { id: 'F', label: 'F', x: 720, y: 180, h: 0 }], edges: [{ id: 'e1', source: 'A', target: 'B', weight: 2 }, { id: 'e2', source: 'A', target: 'C', weight: 4 }, { id: 'e3', source: 'B', target: 'C', weight: 1 }, { id: 'e4', source: 'B', target: 'D', weight: 5 }, { id: 'e5', source: 'C', target: 'E', weight: 2 }, { id: 'e6', source: 'D', target: 'F', weight: 2 }, { id: 'e7', source: 'E', target: 'F', weight: 3 }] };
