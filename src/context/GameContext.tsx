import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameState, Player, loadGameState, saveGameState, createPlayer } from '@/lib/gameState';

interface GameCtx {
  state: GameState;
  currentPlayer: Player | null;
  setPlayer: (id: string) => void;
  registerPlayer: (name: string, email: string, characterId: string) => Player;
  updatePlayer: (player: Player) => void;
  updateState: (updater: (s: GameState) => GameState) => void;
  logout: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(loadGameState);

  const persist = useCallback((s: GameState) => {
    setState(s);
    saveGameState(s);
  }, []);

  const currentPlayer = state.currentPlayerId
    ? state.players.find(p => p.id === state.currentPlayerId) || null
    : null;

  const setPlayer = (id: string) => persist({ ...state, currentPlayerId: id });

  const registerPlayer = (name: string, email: string, characterId: string) => {
    const p = createPlayer(name, email, characterId);
    const ns = { ...state, players: [...state.players, p], currentPlayerId: p.id };
    persist(ns);
    return p;
  };

  const updatePlayer = (player: Player) => {
    const ns = { ...state, players: state.players.map(p => p.id === player.id ? player : p) };
    persist(ns);
  };

  const updateState = (updater: (s: GameState) => GameState) => {
    const ns = updater(state);
    persist(ns);
  };

  const logout = () => persist({ ...state, currentPlayerId: null });

  return (
    <Ctx.Provider value={{ state, currentPlayer, setPlayer, registerPlayer, updatePlayer, updateState, logout }}>
      {children}
    </Ctx.Provider>
  );
};

export const useGame = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame must be inside GameProvider');
  return c;
};
