// deno-lint-ignore-file

function dijkstra(graph, start) {
  const visited = {};
  const distances = {};
  const prev = {};
  const nodes = [];

  // Collect all nodes and initialize distances
  let nodeCount = 0;
  const graphKeys = Object.keys(graph);
  let keyIndex = 0;
  while (keyIndex < graphKeys.length) {
    const node = graphKeys[keyIndex];
    nodes[nodeCount] = node;
    nodeCount = nodeCount + 1;
    distances[node] = Infinity;
    prev[node] = null;
    visited[node] = false;
    keyIndex = keyIndex + 1;
  }

  distances[start] = 0;
  let visitedCount = 0;

  while (visitedCount < nodeCount) {
    let currNode = null;
    let currDist = Infinity;

    // Find unvisited node with minimum distance
    let i = 0;
    while (i < nodeCount) {
      const node = nodes[i];
      if (!visited[node] && distances[node] < currDist) {
        currNode = node;
        currDist = distances[node];
      }
      i = i + 1;
    }

    // Update distances to neighbors
    const neighbors = graph[currNode];
    const neighborKeys = Object.keys(neighbors);
    let neighborIndex = 0;
    while (neighborIndex < neighborKeys.length) {
      const neighbor = neighborKeys[neighborIndex];
      const weight = neighbors[neighbor];
      const dist = currDist + weight;
      if (dist < distances[neighbor]) {
        distances[neighbor] = dist;
        prev[neighbor] = currNode;
      }
      neighborIndex = neighborIndex + 1;
    }

    visited[currNode] = true;
    visitedCount = visitedCount + 1;
  }

  return { distances, prev };
}

const graph = {
  A: { B: 2, C: 3 },
  B: { D: 4, E: 5 },
  C: { F: 6 },
  D: { G: 7 },
  E: { G: 8, H: 9 },
  F: { H: 10 },
  G: {},
  H: {},
};

console.log(dijkstra(graph, "A"));

// should be
// {
//  distances: { A: 0, B: 2, C: 3, D: 6, E: 7, F: 9, G: 13, H: 16 },
//  prev: { A: null, B: "A", C: "A", D: "B", E: "B", F: "C", G: "D", H: "E" }
// }
//
