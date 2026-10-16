import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../src/_components/auth/ProtectedRoute.tsx';

function renderRole(role, allowedRoles) {
  const store = configureStore({ reducer: () => ({ auth: {
    isAuthenticated: true, isLoading: false, user: { role },
  } }) });
  const h = React.createElement;
  return renderToString(h(Provider, { store }, h(MemoryRouter, null,
    h(Routes, null, h(Route, { element: h(ProtectedRoute, { allowedRoles }) },
      h(Route, { path: '/', element: h('p', null, 'Protected content') }))))));
}

test('role gate preserves exact allowed roles and legacy-role rejection', () => {
  for (const role of ['USER', 'ADMIN', 'SUPER_ADMIN']) {
    assert.match(renderRole(role, [role]), /Protected content/);
  }
  assert.match(renderRole('USER', ['ADMIN', 'SUPER_ADMIN']), /Access Denied/);
  assert.match(renderRole('SUPERADMIN', ['SUPER_ADMIN']), /Access Denied/);
  assert.match(renderRole('SUPERADMIN', undefined), /Protected content/);
});
