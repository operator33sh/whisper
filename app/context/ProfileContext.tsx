import { createContext, useContext } from "react";

interface ProfileContextValue {
  openProfile: (pubkey: string) => void;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);
export function useProfileContext() { return useContext(ProfileContext); }
