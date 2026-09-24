import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JourneyPlanResponse } from '../../shared/types';

interface RouteCache {
  [key: string]: JourneyPlanResponse;
}

interface RouteStore {
  cache: RouteCache;
  cacheRoute: (source: string, dest: string, routeData: JourneyPlanResponse) => void;
  getCachedRoute: (source: string, dest: string) => JourneyPlanResponse | null;
}

export const useRouteStore = create<RouteStore>()(
  persist(
    (set, get) => ({
      cache: {},
      cacheRoute: (source, dest, routeData) => {
        const key = `${source}-${dest}`;
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: routeData,
          },
        }));
      },
      getCachedRoute: (source, dest) => {
        const key = `${source}-${dest}`;
        return get().cache[key] || null;
      },
    }),
    {
      name: 'route-cache-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
