import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import { findBookByIsbn } from '../domain/usecases/findBookByIsbn';

type ScanState = {
  status: 'idle' | 'looking_up' | 'found' | 'not_found' | 'error';
  result?: Book;
};

const initialState: ScanState = { status: 'idle' };

export const lookupIsbn = createAsyncThunk('scan/lookupIsbn', (isbn: string) => findBookByIsbn(bookRepository, isbn));

const scanSlice = createSlice({
  name: 'scan',
  initialState,
  reducers: {
    resetScan(state) {
      state.status = 'idle';
      state.result = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(lookupIsbn.pending, (state) => {
        state.status = 'looking_up';
        state.result = undefined;
      })
      .addCase(lookupIsbn.fulfilled, (state, action) => {
        if (action.payload) {
          state.result = action.payload;
          state.status = 'found';
        } else {
          state.status = 'not_found';
        }
      })
      .addCase(lookupIsbn.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export const { resetScan } = scanSlice.actions;
export default scanSlice.reducer;
