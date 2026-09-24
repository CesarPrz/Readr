import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authRepository } from '../composition/repositories';
import type { UserProfile } from '../domain/entities/UserProfile';
import { ensureSignedIn as ensureSignedInUseCase } from '../domain/usecases/ensureSignedIn';

type AuthState = {
  user: UserProfile | null;
  status: 'idle' | 'loading' | 'error';
};

const initialState: AuthState = { user: null, status: 'idle' };

// Dispatché silencieusement au démarrage de l'app (voir App.tsx) — jamais en
// réaction à une action de l'utilisateur, conformément au principe UX de
// connexion non intrusive.
export const ensureSignedIn = createAsyncThunk('auth/ensureSignedIn', () => ensureSignedInUseCase(authRepository));

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(ensureSignedIn.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(ensureSignedIn.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'idle';
      })
      .addCase(ensureSignedIn.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export default authSlice.reducer;
