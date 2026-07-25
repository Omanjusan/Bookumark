export type ChipKind = "condition" | "control" | "action";

export type ChipSettings = Readonly<Record<string, unknown>>;
export type ChipSharedState = Readonly<Record<string, unknown>>;
export type ChipActionContext = Readonly<Record<string, unknown>>;

export interface ChipInstanceConfiguration {
  readonly instanceId: string;
  readonly chipType: string;
  readonly order: number;
  readonly settings: ChipSettings;
}

interface ChipDefinitionBase {
  readonly chipType: string;
  readonly kind: ChipKind;
}

export interface ConditionChipDefinition extends ChipDefinitionBase {
  readonly kind: "condition";
  readonly apply: (
    state: ChipSharedState,
    settings: ChipSettings,
  ) => ChipSharedState;
}

export interface ControlChipDefinition extends ChipDefinitionBase {
  readonly kind: "control";
  readonly read: (
    state: ChipSharedState,
    settings: ChipSettings,
  ) => unknown;
  readonly update: (
    state: ChipSharedState,
    value: unknown,
    settings: ChipSettings,
  ) => ChipSharedState;
}

export interface ActionChipDefinition extends ChipDefinitionBase {
  readonly kind: "action";
  readonly execute: (
    context: ChipActionContext,
    settings: ChipSettings,
  ) => void | Promise<void>;
}

export type ChipDefinition =
  | ConditionChipDefinition
  | ControlChipDefinition
  | ActionChipDefinition;

export type ChipDefinitionRegistry = ReadonlyMap<string, ChipDefinition>;

export function applyConditionChips(
  initialState: ChipSharedState,
  instances: readonly ChipInstanceConfiguration[],
  definitions: ChipDefinitionRegistry,
): ChipSharedState {
  if (instances.length === 0) return initialState;

  const ordered = [...instances].sort((left, right) => left.order - right.order);
  assertUniqueOrders(ordered);

  let state = initialState;
  for (const instance of ordered) {
    const definition = requireDefinition(instance, definitions);
    if (definition.kind !== "condition") {
      throw new TypeError(`Chip is not a condition: ${instance.chipType}`);
    }
    state = definition.apply(state, instance.settings);
  }
  return state;
}

export function readControlChipState(
  definition: ChipDefinition | undefined,
  instance: ChipInstanceConfiguration,
  state: ChipSharedState,
): unknown {
  const control = requireMatchingKind(definition, instance, "control");
  return control.read(state, instance.settings);
}

export function updateControlChipState(
  definition: ChipDefinition | undefined,
  instance: ChipInstanceConfiguration,
  state: ChipSharedState,
  value: unknown,
): ChipSharedState {
  const control = requireMatchingKind(definition, instance, "control");
  return control.update(state, value, instance.settings);
}

export async function executeActionChip(
  definition: ChipDefinition | undefined,
  instance: ChipInstanceConfiguration,
  context: ChipActionContext,
): Promise<void> {
  const action = requireMatchingKind(definition, instance, "action");
  await action.execute(context, instance.settings);
}

function requireDefinition(
  instance: ChipInstanceConfiguration,
  definitions: ChipDefinitionRegistry,
): ChipDefinition {
  const definition = definitions.get(instance.chipType);
  if (definition === undefined) {
    throw new TypeError(`Unknown chip type: ${instance.chipType}`);
  }
  if (definition.chipType !== instance.chipType) {
    throw new TypeError(`Chip definition mismatch: ${instance.chipType}`);
  }
  return definition;
}

function requireMatchingKind<K extends ChipKind>(
  definition: ChipDefinition | undefined,
  instance: ChipInstanceConfiguration,
  kind: K,
): Extract<ChipDefinition, { readonly kind: K }> {
  if (definition === undefined) {
    throw new TypeError(`Unknown chip type: ${instance.chipType}`);
  }
  if (definition.chipType !== instance.chipType) {
    throw new TypeError(`Chip definition mismatch: ${instance.chipType}`);
  }
  if (definition.kind !== kind) {
    throw new TypeError(`Chip is not a ${kind}: ${instance.chipType}`);
  }
  return definition as Extract<ChipDefinition, { readonly kind: K }>;
}

function assertUniqueOrders(
  instances: readonly ChipInstanceConfiguration[],
): void {
  for (let index = 1; index < instances.length; index += 1) {
    if (instances[index - 1]?.order === instances[index]?.order) {
      throw new RangeError(`Duplicate chip order: ${instances[index]?.order}`);
    }
  }
}
