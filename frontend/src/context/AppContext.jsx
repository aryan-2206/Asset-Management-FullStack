import React, { createContext, useContext, useMemo, useReducer, useCallback } from 'react';
import { api } from '../api/client';

const COLLECTIONS = [
  'assets',
  'loans',
  'maintenances',
  'procurements',
  'properties',
  'vendors',
  'activities',
  'notifications',
  'users',
];

const initialState = {
  loading: false,
  error: null,
  data: COLLECTIONS.reduce((acc, name) => {
    acc[name] = [];
    return acc;
  }, {}),
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SET_COLLECTIONS':
      return {
        ...state,
        loading: false,
        error: null,
        data: { ...state.data, ...action.payload },
      };
    case 'UPDATE_COLLECTION':
      return {
        ...state,
        data: { ...state.data, [action.collection]: action.payload },
      };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshCollections = useCallback(
    async (email) => {
      dispatch({ type: 'LOADING' });
      try {
        const results = await Promise.all(
          COLLECTIONS.map(async (name) => {
            try {
              const response = await api.list(name);
              return [name, response];
            } catch (error) {
              console.error(`Failed to load ${name}`, error);
              return [name, []];
            }
          }),
        );
        const payload = Object.fromEntries(results);
        dispatch({ type: 'SET_COLLECTIONS', payload });
        return payload;
      } catch (error) {
        dispatch({ type: 'ERROR', error });
        throw error;
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      refreshCollections,
      collections: COLLECTIONS,
      setCollection: (collection, items) =>
        dispatch({ type: 'UPDATE_COLLECTION', collection, payload: items }),
      async create(collection, payload) {
        const created = await api.create(collection, payload);
        const items = state.data[collection] || [];
        dispatch({ type: 'UPDATE_COLLECTION', collection, payload: [created, ...items] });
        return created;
      },
      async update(collection, id, payload) {
        const updated = await api.update(collection, id, payload);
        const items = (state.data[collection] || []).map((item) =>
          item.id === id ? updated : item,
        );
        dispatch({ type: 'UPDATE_COLLECTION', collection, payload: items });
        return updated;
      },
      async remove(collection, id) {
        await api.remove(collection, id);
        const items = (state.data[collection] || []).filter((item) => item.id !== id);
        dispatch({ type: 'UPDATE_COLLECTION', collection, payload: items });
      },
    }),
    [state, refreshCollections],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}

