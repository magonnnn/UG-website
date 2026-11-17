type RatingInputs = {
  kills: number;
  deaths: number;
  assists: number;
  rounds: number;
  adr: number | null;
};

export function calculateHltvStyleEstimate({
  kills,
  deaths,
  assists,
  rounds,
  adr,
}: RatingInputs): number | null {
  if (
    rounds <= 0 ||
    ![kills, deaths, assists, rounds].every(Number.isFinite)
  ) {
    return null;
  }

  const components = [
    { weight: 0.35, delta: (kills / rounds) / 0.68 - 1 },
    { weight: 0.25, delta: (0.64 - deaths / rounds) / 0.64 },
    ...(adr == null || !Number.isFinite(adr)
      ? []
      : [{ weight: 0.25, delta: adr / 75 - 1 }]),
    { weight: 0.15, delta: (assists / rounds) / 0.15 - 1 },
  ];
  const totalWeight = components.reduce((total, component) => total + component.weight, 0);
  const weightedDelta = components.reduce(
    (total, component) => total + component.weight * component.delta,
    0,
  );

  return Math.max(0, Math.min(3, 1 + weightedDelta / totalWeight));
}
