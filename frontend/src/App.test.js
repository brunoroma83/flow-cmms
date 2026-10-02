import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login screen when unauthenticated', () => {
  render(<App />);
  const loginTitle = screen.getByText(/Gestão de Equipamentos Médicos/i);
  expect(loginTitle).toBeInTheDocument();
  
  const submitButton = screen.getByRole('button', { name: /Entrar no Sistema/i });
  expect(submitButton).toBeInTheDocument();
});
