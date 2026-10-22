import { RouterProvider } from 'react-router-dom';
import { ExplorerProvider } from '../store/explorer';
import { router } from './router';

export default function App() {
  return (
    <ExplorerProvider>
      <RouterProvider router={router} />
    </ExplorerProvider>
  );
}
