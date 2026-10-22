import { createContext, useContext, useMemo, useReducer, type PropsWithChildren } from 'react';
import { demoDataset } from '../data/adapters/demo';
import { tangPoemDataset } from '../data/adapters/tangPoem';
import { filterPoems } from '../lib/explore/selectors';
import type { Dataset, ExplorationFilters, Period } from '../types/domain';

export type TrailNode = {
  type: 'period' | 'imagery' | 'link' | 'poem' | 'poet';
  label: string;
  value?: string;
};

export type SelectedLink = {
  source: string;
  target: string;
};

export type ExplorerState = {
  filters: ExplorationFilters;
  selectedPeriod: Period | null;
  selectedImagery: string | null;
  selectedLink: SelectedLink | null;
  drawerPoemId: string | null;
  comparisonPoemId: string | null;
  trail: TrailNode[];
};

export type ExplorerAction =
  | { type: 'setFilter'; key: keyof ExplorationFilters; value?: string }
  | { type: 'clearFilters' }
  | { type: 'selectPeriod'; period: Period }
  | { type: 'selectImagery'; imagery: string }
  | { type: 'selectLink'; source: string; target: string }
  | { type: 'openDrawer'; poemId: string }
  | { type: 'closeDrawer' }
  | { type: 'setComparison'; poemId: string | null }
  | { type: 'restoreTrail'; node: TrailNode };

export const initialExplorerState: ExplorerState = {
  filters: {},
  selectedPeriod: null,
  selectedImagery: null,
  selectedLink: null,
  drawerPoemId: null,
  comparisonPoemId: null,
  trail: [],
};

function appendTrail(trail: TrailNode[], node: TrailNode): TrailNode[] {
  const last = trail.at(-1);
  return last?.type === node.type && last.label === node.label ? trail : [...trail, node];
}

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'setFilter': {
      const filters = { ...state.filters };
      if (action.value) filters[action.key] = action.value as never;
      else delete filters[action.key];
      return { ...state, filters };
    }
    case 'clearFilters':
      return { ...state, filters: {}, selectedPeriod: null, selectedImagery: null, selectedLink: null };
    case 'selectPeriod':
      return {
        ...state,
        selectedPeriod: action.period,
        filters: { ...state.filters, period: action.period },
        trail: appendTrail(state.trail, { type: 'period', label: action.period }),
      };
    case 'selectImagery':
      return {
        ...state,
        selectedImagery: action.imagery,
        filters: { ...state.filters, imagery: action.imagery },
        trail: appendTrail(state.trail, { type: 'imagery', label: action.imagery }),
      };
    case 'selectLink': {
      const selectedLink = { source: action.source, target: action.target };
      return {
        ...state,
        selectedLink,
        trail: appendTrail(state.trail, { type: 'link', label: `${action.source} × ${action.target}` }),
      };
    }
    case 'openDrawer':
      return { ...state, drawerPoemId: action.poemId };
    case 'closeDrawer':
      return { ...state, drawerPoemId: null };
    case 'setComparison':
      return { ...state, comparisonPoemId: action.poemId };
    case 'restoreTrail': {
      if (action.node.type === 'period') {
        return { ...state, selectedPeriod: action.node.label as Period, filters: { ...state.filters, period: action.node.label as Period } };
      }
      if (action.node.type === 'imagery') {
        return { ...state, selectedImagery: action.node.label, filters: { ...state.filters, imagery: action.node.label } };
      }
      if (action.node.type === 'link') {
        const [source, target] = action.node.label.split(' × ');
        return { ...state, selectedLink: { source, target } };
      }
      return state;
    }
  }
}

type ExplorerContextValue = {
  state: ExplorerState;
  dispatch: React.Dispatch<ExplorerAction>;
  dataset: Dataset;
  poems: Dataset['poems'];
  selectedPoems: Dataset['poems'];
};

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

export function ExplorerProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(explorerReducer, initialExplorerState);
  const dataset = import.meta.env.VITE_DATA_MODE === 'demo' ? demoDataset : tangPoemDataset;
  const selectedPoems = useMemo(() => filterPoems(dataset.poems, state.filters), [dataset.poems, state.filters]);
  const value = useMemo(() => ({ state, dispatch, dataset, poems: dataset.poems, selectedPoems }), [state, dataset, selectedPoems]);

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>;
}

export function useExplorer(): ExplorerContextValue {
  const context = useContext(ExplorerContext);
  if (!context) throw new Error('useExplorer must be used within ExplorerProvider');
  return context;
}
