import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type EmployeeRole = "employee" | "launcher" | "admin";

export interface EmployeeUser {
  id: number;
  name: string;
  username: string;
  role: EmployeeRole;
}

interface EmployeeAuthContextValue {
  employee: EmployeeUser | null;
  loading: boolean;
  refetch: () => void;
}

const EmployeeAuthContext = createContext<EmployeeAuthContextValue>({
  employee: null,
  loading: true,
  refetch: () => {},
});

export function EmployeeAuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = trpc.employee.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <EmployeeAuthContext.Provider
      value={{
        employee: data ?? null,
        loading: isLoading,
        refetch,
      }}
    >
      {children}
    </EmployeeAuthContext.Provider>
  );
}

export function useEmployeeAuth() {
  return useContext(EmployeeAuthContext);
}
