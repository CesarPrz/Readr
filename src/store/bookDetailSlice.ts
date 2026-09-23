import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { bookRepository } from '../composition/repositories';
import type { BookDetail } from '../domain/entities/BookDetail';
import { getBookDetail } from '../domain/usecases/getBookDetail';

type BookDetailState = {
  currentId?: string; // the book's primary work key — used only to detect a stale/superseded fetch
  detail?: BookDetail;
  status: 'idle' | 'loading';
};

const initialState: BookDetailState = { status: 'idle' };

export const fetchBookDetail = createAsyncThunk('bookDetail/fetch', (workIds: string[]) =>
  getBookDetail(bookRepository, workIds).then((detail) => ({ workId: workIds[0], detail })),
);

const bookDetailSlice = createSlice({
  name: 'bookDetail',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookDetail.pending, (state, action) => {
        state.currentId = action.meta.arg[0];
        state.status = 'loading';
        state.detail = undefined;
      })
      .addCase(fetchBookDetail.fulfilled, (state, action) => {
        if (state.currentId !== action.payload.workId) return; // a newer detail screen opened first
        state.detail = action.payload.detail;
        state.status = 'idle';
      })
      .addCase(fetchBookDetail.rejected, (state, action) => {
        if (state.currentId === action.meta.arg[0]) state.status = 'idle';
      });
  },
});

export default bookDetailSlice.reducer;
