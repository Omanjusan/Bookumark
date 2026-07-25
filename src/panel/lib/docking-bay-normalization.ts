import {
  DOCKING_SCHEMA_VERSION,
} from "./docking-persistence-model.js";
import type {
  BayConfigurationsDocument,
} from "./docking-persistence-model.js";

export type DockingRecovery = "unchanged" | "normalized" | "fallback";

export interface BayConfigurationsNormalizationResult {
  document: BayConfigurationsDocument;
  changed: boolean;
  recovery: DockingRecovery;
}

/** 保存されたベイ文書の外形を検証し、復旧可能な文書を防御的コピーで返す。 */
export function normalizeBayConfigurationsDocument(
  value: unknown,
  fallback: BayConfigurationsDocument,
): BayConfigurationsNormalizationResult {
  if (!isRecord(value)) return fallbackResult(fallback);
  if (value.schemaVersion !== DOCKING_SCHEMA_VERSION) return fallbackResult(fallback);
  if (!Array.isArray(value.bays)) return fallbackResult(fallback);
  if (isSequenceOverflow(value.nextBaySequence) || isSequenceOverflow(value.nextChipSequence)) {
    return fallbackResult(fallback);
  }

  const nextBaySequence = normalizeSequence(value.nextBaySequence);
  const nextChipSequence = normalizeSequence(value.nextChipSequence);
  const changed = nextBaySequence !== value.nextBaySequence
    || nextChipSequence !== value.nextChipSequence;
  const document: BayConfigurationsDocument = {
    schemaVersion: DOCKING_SCHEMA_VERSION,
    nextBaySequence,
    nextChipSequence,
    bays: structuredClone(value.bays) as BayConfigurationsDocument["bays"],
  };
  return {
    document,
    changed,
    recovery: changed ? "normalized" : "unchanged",
  };
}

function fallbackResult(
  fallback: BayConfigurationsDocument,
): BayConfigurationsNormalizationResult {
  return {
    document: structuredClone(fallback),
    changed: true,
    recovery: "fallback",
  };
}

function normalizeSequence(value: unknown): number {
  return Number.isSafeInteger(value) && (value as number) >= 1 ? value as number : 1;
}

function isSequenceOverflow(value: unknown): boolean {
  return typeof value === "number" && value >= Number.MAX_SAFE_INTEGER;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
