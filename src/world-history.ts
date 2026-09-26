import {type Body} from './catalog.ts';
import {dateRecord} from './world-time.ts';
import type {BodyAddress} from './address.ts';
import {
  starLifecycle, starStateAt, planetLifecycle, planetStateAt, waterKeysFor,
  spinStateFor, rotationAngleAt, dayNightAt,
  type StarLifecycle, type PlanetLifecycle, type SpinState,
} from './stellar-evolution.ts';
/** Rewritten per docs/time-and-coordinates-contract.md §2.3, §6.1, §6.2:
 * promoted from an export-only heuristic sidecar to the authoritative
 * existence-gating source (`visualEvolution: true`). The formulas themselves
 * live in `stellar-evolution.ts` (Package A's §2.3 module); this file is the
 * back-compat aggregation layer plus the identity-record bookkeeping that
 * predates the 4D contract. */
export const HISTORY_VERSION='atlas-history-3-remnant-cooling';
export function identityRecord(body: Body) {
  return {id:body.id, parentId:body.parentId, predecessors:[] as string[],
    existence:{from:null,until:null}, reference:dateRecord(0n), version:HISTORY_VERSION};
}
/** `BodyAddress` placeholder for the legacy single-argument API: real callers
 * (main.ts today) only have a `Body`, not a resolved `BodyAddress` — Package
 * B's address parser can replace this once it lands. Unused by the lifecycle
 * math itself (`starLifecycle`/`planetLifecycle` draw only from `body.seed`,
 * see stellar-evolution.ts), so the placeholder's contents never affect the
 * result; only its presence satisfies the contract's `WorldQuery` shape. */
function placeholderAddress(): BodyAddress {
  return {clusterCell:[0n,0n,0n], groupCell:[0n,0n,0n], galaxyOrdinal:0,
    sectorCell:[0n,0n,0n], genCell:[0n,0n,0n], systemOrdinal:0, slot:'star/0'};
}
/** Back-compat single-argument wrapper over `starLifecycle` (main.ts calls
 * `stars.map(stellarHistory)`). Now authoritative: `visualEvolution: true`. */
export function stellarHistory(body: Body) {
  if(body.kind!=='star') throw new Error('Stellar history requires a star');
  const lifecycle=starLifecycle('', placeholderAddress(), body);
  return {...identityRecord(body), provenance:'authoritative',
    formationNs:lifecycle.formationNs.toString(), giantNs:lifecycle.giantNs.toString(),
    remnantNs:lifecycle.remnantNs.toString(), outcome:lifecycle.outcome,
    remnantId:body.id+'/remnant/0',
    orbitValidity:{fromNs:lifecycle.formationNs.toString(),untilNs:lifecycle.giantNs.toString()},
    visualEvolution:true};
}
export {
  starLifecycle, starStateAt, planetLifecycle, planetStateAt, waterKeysFor,
  spinStateFor, rotationAngleAt, dayNightAt,
};
export type {StarLifecycle, PlanetLifecycle, SpinState};
