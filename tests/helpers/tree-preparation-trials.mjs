// Keep warmup and measured pairs in the same order, with no concurrent calls.
export async function pairedPreparationTrials({ trials, warmupTrials, measure }) {
  const collect = async count => {
    const rows = { baseline: [], candidate: [] };
    for (let trial = 0; trial < count; trial++) {
      const order = trial % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
      for (const variant of order) rows[variant].push({ trial, pairOrder: order.join(','), ...await measure(variant) });
    }
    return rows;
  };
  const warmup = await collect(warmupTrials);
  return { warmup, trials: await collect(trials) };
}
