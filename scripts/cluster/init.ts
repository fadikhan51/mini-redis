
async function init() {
  const nodes = [
    { host: 'node-1', port: 6379, httpPort: 8080, id: 'node1' },
    { host: 'node-2', port: 6379, httpPort: 8080, id: 'node2' },
    { host: 'node-3', port: 6379, httpPort: 8080, id: 'node3' }
  ];

  console.log('Waiting for nodes to be ready...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Meeting nodes...');
  for (const target of nodes) {
    for (const other of nodes) {
      if (target.id !== other.id) {
        await fetch(`http://${target.host}:${target.httpPort}/v1/cluster/meet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: other.host, port: other.port, httpPort: other.httpPort })
        });
      }
    }
  }

  console.log('Assigning slots...');
  const totalSlots = 16384;
  const chunk = Math.ceil(totalSlots / nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    const start = i * chunk;
    const end = Math.min((i + 1) * chunk - 1, totalSlots - 1);
    const slots = [];
    for (let s = start; s <= end; s++) slots.push(s);

    console.log(`Assigning slots ${start}-${end} to ${nodes[i].id}`);
    
    for (const node of nodes) {
      await fetch(`http://${node.host}:${node.httpPort}/v1/cluster/slots/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: nodes[i].id, slots })
      });
    }
  }

  console.log('Cluster initialized.');
}

init().catch(err => {
  console.error(err);
  process.exit(1);
});
