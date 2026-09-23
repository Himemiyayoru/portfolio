export type PerformanceLevels = {
  singing: boolean;
  vocal: number;
  pulse: number;
};

let state: PerformanceLevels = { singing: false, vocal: 0, pulse: 0 };

export function setPerformance(next: PerformanceLevels) {
  state = next;
}

export function getPerformance() {
  return state;
}
