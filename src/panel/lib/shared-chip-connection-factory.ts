export interface SharedChipBinding<State> {
  render(state: State): void;
  disconnect(): void;
}

export interface SharedChipConnection {
  disconnect(): void;
}

export interface SharedChipConnectionAdapter<Element, State, Event> {
  bind(element: Element, deliver: (event: Event) => void): SharedChipBinding<State>;
  reduce(state: State, event: Event): State;
  reportConnectionError?(error: unknown): void;
}

export interface SharedChipConnectionFactory<Element, State> {
  connect(element: Element): SharedChipConnection;
  getState(): State;
  setState(state: State): void;
  connectionCount(): number;
  disconnect(): void;
}

interface ActiveBinding<State> {
  readonly binding: SharedChipBinding<State>;
  active: boolean;
}

/** 同種の複数チップDOMを1つの共有状態へ双方向接続するファクトリーを作る。 */
export function createSharedChipConnectionFactory<Element, State, Event>(
  initialState: State,
  adapter: SharedChipConnectionAdapter<Element, State, Event>,
): SharedChipConnectionFactory<Element, State> {
  let state = structuredClone(initialState);
  const connections = new Set<ActiveBinding<State>>();

  const disable = (connection: ActiveBinding<State>, reportError: boolean): void => {
    if (!connection.active) return;
    connection.active = false;
    connections.delete(connection);
    try {
      connection.binding.disconnect();
    } catch (error) {
      if (reportError) adapter.reportConnectionError?.(error);
    }
  };

  const renderOne = (connection: ActiveBinding<State>): void => {
    if (!connection.active) return;
    try {
      connection.binding.render(structuredClone(state));
    } catch (error) {
      disable(connection, false);
      adapter.reportConnectionError?.(error);
    }
  };

  const renderAll = (): void => {
    // 描画失敗時にSetから対象を除いても、残りの接続はスナップショット順で同期する。
    for (const connection of [...connections]) renderOne(connection);
  };

  return {
    connect(element): SharedChipConnection {
      const binding = adapter.bind(element, (event) => {
        state = structuredClone(adapter.reduce(structuredClone(state), event));
        renderAll();
      });
      const connection: ActiveBinding<State> = { binding, active: true };
      connections.add(connection);
      renderOne(connection);
      return {
        disconnect(): void {
          disable(connection, false);
        },
      };
    },
    getState(): State {
      return structuredClone(state);
    },
    setState(nextState): void {
      state = structuredClone(nextState);
      renderAll();
    },
    connectionCount(): number {
      return connections.size;
    },
    disconnect(): void {
      for (const connection of [...connections]) disable(connection, false);
    },
  };
}
