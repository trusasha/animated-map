import { createContext, useContext } from 'react';
import type { Account } from './types';

export const AccountContext = createContext<Account | null>(null);

export const useAccount = () => useContext(AccountContext);
