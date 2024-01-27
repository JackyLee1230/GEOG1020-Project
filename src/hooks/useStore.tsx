import create from 'zustand';
import { devtools } from 'zustand/middleware';

interface Store {
  startTime: string;
  numOfDays: string;
  numOfData: number;
  data: any | null;
  setStartTime: (startTime: string) => void;
  setNumOfDays: (numOfDays: string) => void;
  setNumsOfData: (numsOfData: number) => void;
  setData: (data: any) => void;
}

const useStore = create<Store>()(
  devtools((set) => ({
    startTime: 'NOW - 7days',
    numOfDays: '7 days',
    numOfData: 0,
    data: null,
    setStartTime: (startTime) => set((state) => ({ ...state, startTime })),
    setNumOfDays: (numOfDays) => set((state) => ({ ...state, numOfDays })),
    setNumsOfData: (numOfData) => set((state) => ({ ...state, numOfData })),
    setData: (data) => set((state) => ({ ...state, data }))
  }))
);

export default useStore;
