/** Baseline constant-dark-energy future. Dates are scenario boundaries, not
 * predicted instants when the universe ceases to exist. */
import { CATALOGUE_EPOCH_NS, UNIVERSE_END_NS, YEAR_NS, tenToThe, type Ns } from './world-time.ts';

export const FUTURE_SCENARIO_VERSION='atlas-future-constant-lambda-1';
export type FutureStage='stellar-decline'|'degenerate'|'black-hole'|'ceiling'|null;

export function futureStageAt(t:Ns):FutureStage {
  if(t>=UNIVERSE_END_NS)return 'ceiling';
  if(t>=tenToThe(40)*YEAR_NS)return 'black-hole';
  if(t>=tenToThe(15)*YEAR_NS)return 'degenerate';
  if(t>=tenToThe(14)*YEAR_NS)return 'stellar-decline';
  return null;
}

/** A visual aggregate of unresolved stellar populations. Individual stars
 * continue to use their own dated lifecycles; this only dims galaxy glyphs. */
export function galaxyLightProxyAt(t:Ns):number {
  if(t<=CATALOGUE_EPOCH_NS)return 1;
  const years=Number(t/YEAR_NS);
  const decades=Math.log10(years)-Math.log10(Number(CATALOGUE_EPOCH_NS/YEAR_NS));
  if(decades<=0)return 1;
  return Math.max(0,Math.exp(-1.35*decades));
}

/** Alternate fates are selectable illustrations. Their parameter values are
 * declared scenario inputs, not observations or predictions. Dates are exact
 * BigInt nanoseconds on the shared Big Bang time axis. */
export type AlternateFateState = 'ordinary-expansion'|'contraction'|'tidal-disruption'|'scenario-end';
export interface AlternateFateParameters {
  /** Scenario's finite horizon as an age since the Big Bang, in whole years. */
  readonly scenarioEndYears: bigint;
  /** Age at which the illustrated transition begins, in whole years. */
  readonly transitionYears: bigint;
}
export interface AlternateFutureScenario {
  readonly id: 'big-crunch'|'big-rip';
  readonly name: string;
  readonly parameters: AlternateFateParameters;
  readonly validity: string;
  readonly uncertainty: string;
  readonly endDateNs: Ns;
  /** Pure, exact-time lookup. Times at/after endDateNs return scenario-end. */
  stateAt(time: Ns): AlternateFateState;
}

function defineAlternateScenario(
  id: AlternateFutureScenario['id'], name: string,
  parameters: AlternateFateParameters, transitionState: AlternateFateState,
  validity: string, uncertainty: string,
): AlternateFutureScenario {
  if (parameters.transitionYears < 0n || parameters.scenarioEndYears <= parameters.transitionYears) {
    throw new Error(`Invalid ${id} scenario dates`);
  }
  const transitionDateNs = parameters.transitionYears * YEAR_NS;
  const endDateNs = parameters.scenarioEndYears * YEAR_NS;
  return Object.freeze({
    id, name, parameters: Object.freeze({...parameters}), validity, uncertainty, endDateNs,
    stateAt(time: Ns): AlternateFateState {
      if (time >= endDateNs) return 'scenario-end';
      if (time >= transitionDateNs) return transitionState;
      return 'ordinary-expansion';
    },
  });
}

/** Illustrative recollapse branch. The 100-billion-year horizon and 80-billion-
 * year transition are explicit knobs; this is not a measured fate forecast. */
export const BIG_CRUNCH_SCENARIO = defineAlternateScenario(
  'big-crunch', 'Illustrative Big Crunch',
  {transitionYears: 80_000_000_000n, scenarioEndYears: 100_000_000_000n},
  'contraction',
  'Conditional illustration requiring a future reversal of expansion; outside the constant-dark-energy baseline.',
  'The expansion history, matter content, and mechanism and timing of recollapse are unknown; dates are chosen display parameters.',
);

/** Illustrative phantom-energy branch. The 22-billion-year horizon and 20-
 * billion-year transition are scenario inputs, not inferred measurements. */
export const BIG_RIP_SCENARIO = defineAlternateScenario(
  'big-rip', 'Illustrative Big Rip',
  {transitionYears: 20_000_000_000n, scenarioEndYears: 22_000_000_000n},
  'tidal-disruption',
  'Conditional illustration requiring persistent phantom-like dark energy; outside the constant-dark-energy baseline.',
  'No phantom component or rip time is established; disruption sequence and dates are highly model-dependent illustrative parameters.',
);

/** Convenient registry for consumers that want to offer alternate fates. */
export const ALTERNATE_FUTURE_SCENARIOS = Object.freeze({
  'big-crunch': BIG_CRUNCH_SCENARIO,
  'big-rip': BIG_RIP_SCENARIO,
});
export const ALTERNATE_FATE_VERSION='atlas-alternate-fates-1';
